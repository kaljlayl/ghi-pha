import datetime
import hashlib
import json
import logging
import os
import re
from typing import Any, Dict, Iterable, List, Optional

import httpx
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.schema import Signal
from app.services import notification_service
from app.services.geocoding_service import geocode_signal_location

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?\d[\d\s().-]{6,}\d)\b")
DROP_KEYWORDS = {"name", "email", "phone", "mobile", "contact", "address", "patient", "reporter"}


class BeaconCollector:
    _last_sync_at: Optional[datetime.datetime] = None
    _sync_in_progress: bool = False
    _last_sync_error: Optional[str] = None
    _last_sync_count: int = 0

    def __init__(self, db: Session):
        self.db = db
        self.scraper_base_url = os.getenv("SCRAPER_BASE_URL", "http://localhost:8787").rstrip("/")
        self.beacon_path = os.getenv("BEACON_EVENTS_PATH", "/en/events")
        self.render = os.getenv("BEACON_RENDER", "1").lower() in {"1", "true", "yes"}
        self.wait = os.getenv("BEACON_WAIT", "networkidle")
        self.timeout_ms = int(os.getenv("BEACON_TIMEOUT_MS", "15000"))
        self.min_interval_minutes = int(os.getenv("BEACON_MIN_INTERVAL_MINUTES", "15"))

    def fetch_and_process(self) -> int:
        """Fetch, parse, sanitize, and persist Beacon events."""
        if self._should_skip_poll():
            return 0

        BeaconCollector._sync_in_progress = True
        try:
            logger.info("Polling WHO Beacon via scraper service...")
            BeaconCollector._last_sync_at = datetime.datetime.utcnow()
            events = self._scrape_events()
            normalized = self._normalize_events(events)

            new_count = 0
            for event in normalized:
                if not self._is_duplicate(event):
                    self._create_signal(event)
                    new_count += 1

            self.db.commit()
            logger.info("Poll complete. Found %s new signals.", new_count)

            BeaconCollector._last_sync_count = new_count
            BeaconCollector._last_sync_error = None
            return new_count
        except Exception as e:
            BeaconCollector._last_sync_error = str(e)
            logger.error(f"Beacon sync failed: {e}")
            raise
        finally:
            BeaconCollector._sync_in_progress = False

    def _scrape_events(self) -> List[Dict[str, Any]]:
        html = self._fetch_beacon_html()
        return self._parse_events(html)

    def _fetch_beacon_html(self) -> str:
        # Direct connection to the target site using Playwright
        base_url = os.getenv("BEACON_BASE_URL", "https://beaconbio.org")
        url = f"{base_url}{self.beacon_path}"
        logger.info(f"Navigating to {url} with Playwright...")

        browser = None
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context()
                page = context.new_page()

                # Navigate and wait for network idle to ensure initial load
                page.goto(url, wait_until=self.wait if self.wait in ["load", "domcontentloaded", "networkidle"] else "networkidle")

                # Scroll to bottom to trigger lazy loading
                # We'll do a few scrolls to ensure we get a good amount of data
                # The user's example did one scroll, but real infinite scrolls might need more.
                # Sticking to the user's example pattern but adding a small loop for robustness if needed.
                # For now, following the user's explicit example:
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

                # Wait for potential new content.
                # The user's example waited for a specific selector.
                # Since we don't know the exact selector for new items definitively without seeing the live site,
                # we'll wait for a generic short timeout or network idle again.
                # However, to match the user's specific request "Wait for the data to actually appear",
                # and knowing the structure from _parse_events (looking for article, .event-card, etc),
                # we can try to wait for one of those if they are loaded dynamically.
                # But if the page starts empty, we need to wait for at least one.
                # If the page has initial data, this wait might return immediately.
                # A safe bet is waiting for a short period for network requests to settle after scroll.
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except Exception:
                    logger.warning("Network idle timeout after scroll, proceeding with captured content.")

                content = page.content()
                return content
        except Exception as e:
            logger.error(f"Playwright scraping failed: {e}")
            return ""
        finally:
            # Always close browser to prevent resource leak
            if browser:
                try:
                    browser.close()
                except Exception as close_err:
                    logger.warning(f"Failed to close browser: {close_err}")

    def _parse_events(self, html: str) -> List[Dict[str, Any]]:
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        candidates: List[Dict[str, Any]] = []

        # Strategy 1: JSON blobs in script tags
        for script in soup.find_all("script"):
            if not script.string:
                continue
            text = script.string.strip()
            if not (text.startswith("{") or text.startswith("[")):
                continue
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                continue
            candidates.extend(self._extract_event_candidates(data))

        # Strategy 2: Beacon Material-UI structure (event links in h2)
        if not candidates:
            event_links = soup.find_all("a", href=lambda h: h and "/event/" in h)
            for link in event_links:
                # Title is in the link text, format: "Disease, Country"
                title_text = link.get_text().strip()
                if not title_text or "," not in title_text:
                    continue

                # Parse title: "Disease, Country"
                parts = title_text.split(",", 1)
                disease = parts[0].strip()
                country = parts[1].strip() if len(parts) > 1 else ""

                # Find the container (parent of h2 that contains the link)
                h2 = link.find_parent("h2")
                if not h2:
                    continue
                container = h2.find_parent()

                # Description is in the p tag after h2
                description = None
                if container:
                    p_tag = container.find("p")
                    if p_tag:
                        description = p_tag.get_text().strip()

                # Extract source URL
                source_url = link.get("href", "")

                if disease and country:
                    candidates.append({
                        "disease": disease,
                        "country": country,
                        "description": description,
                        "source_url": source_url,
                    })

        # Strategy 3: Generic DOM-based cards (fallback)
        if not candidates:
            card_selectors = [
                "[data-event-id]",
                "[data-event]",
                ".event-card",
                ".event",
                ".event-item",
                "article",
            ]
            for card in soup.select(",".join(card_selectors)):
                disease = self._first_text(card, ["[data-disease]", ".disease", "h3", "h2", "h4"])
                country = self._first_text(card, ["[data-country]", ".country", ".location", ".geo"])
                description = self._first_text(card, [".description", ".desc", "p"])
                cases = self._first_number(card, ["[data-cases]", ".cases", ".case-count"])
                deaths = self._first_number(card, ["[data-deaths]", ".deaths", ".death-count"])
                link = card.find("a", href=True)
                source_url = link["href"] if link else None

                if disease and country:
                    candidates.append(
                        {
                            "disease": disease,
                            "country": country,
                            "description": description,
                            "cases": cases,
                            "deaths": deaths,
                            "source_url": source_url,
                        }
                    )

        return candidates

    def _extract_event_candidates(self, data: Any) -> List[Dict[str, Any]]:
        matches: List[Dict[str, Any]] = []

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                if self._looks_like_event(node):
                    matches.append(node)
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(data)
        return matches

    def _looks_like_event(self, node: Dict[str, Any]) -> bool:
        keys = {k.lower() for k in node.keys()}
        return "disease" in keys and ("country" in keys or "location" in keys)

    def _normalize_events(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized: List[Dict[str, Any]] = []
        for event in events:
            disease = self._clean_text(event.get("disease"))
            country = self._clean_text(event.get("country"))
            if not disease or not country:
                continue

            location = self._clean_text(event.get("location"))
            description = self._redact_text(event.get("description"))
            cases = self._to_int(event.get("cases"))
            deaths = self._to_int(event.get("deaths"))
            date_reported = self._parse_date(event.get("date_reported")) or datetime.date.today()
            date_onset = self._parse_date(event.get("date_onset"))
            source_url = self._normalize_url(event.get("source_url") or event.get("url"))
            beacon_event_id = self._derive_event_id(event, source_url, disease, date_reported)

            case_fatality_rate = None
            if cases > 0 and deaths >= 0:
                case_fatality_rate = round((deaths / cases) * 100, 2)

            # Geocode location (with cache-first DB lookup)
            geocode_result = {}
            try:
                geocode_result = geocode_signal_location(country, location, db=self.db)
            except Exception as e:
                logger.error(f"Geocoding failed for {country}, {location}: {str(e)}")
                # Fallback: try country-only geocoding
                try:
                    geocode_result = geocode_signal_location(country, None, db=self.db)
                    logger.info(f"Using country-level fallback for {country}")
                except Exception as fallback_err:
                    logger.error(f"Country-level geocoding also failed: {fallback_err}")
                    # Mark for manual review
                    geocode_result = {
                        "latitude": None,
                        "longitude": None,
                        "geocode_source": "FAILED - manual review needed"
                    }

            normalized_event = {
                "beacon_event_id": beacon_event_id,
                "source_url": source_url or self._fallback_source_url(),
                "raw_data": self._build_raw_data(event),
                "disease": disease,
                "country": country,
                "location": location,
                "date_reported": date_reported,
                "date_onset": date_onset,
                "cases": cases,
                "deaths": deaths,
                "case_fatality_rate": case_fatality_rate,
                "description": description,
                "outbreak_status": self._clean_text(event.get("outbreak_status")),
                "priority_score": self._calculate_priority(cases, case_fatality_rate),
                "triage_status": "Pending Triage",
                "current_status": "New",
                "last_beacon_sync": datetime.datetime.utcnow(),
                # Geocoding fields
                "latitude": geocode_result.get("latitude"),
                "longitude": geocode_result.get("longitude"),
                "geocoded_at": geocode_result.get("geocoded_at"),
                "geocode_source": geocode_result.get("geocode_source"),
                "location_hash": geocode_result.get("location_hash"),
            }
            normalized.append(normalized_event)

        return normalized

    def _build_raw_data(self, event: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = self._strip_sensitive_keys(event)
        return {
            "source": "WHO Beacon",
            "scraped_at": datetime.datetime.utcnow().isoformat(),
            "event": sanitized,
        }

    def _strip_sensitive_keys(self, value: Any) -> Any:
        if isinstance(value, dict):
            cleaned: Dict[str, Any] = {}
            for key, item in value.items():
                if self._should_drop_key(key):
                    continue
                cleaned[key] = self._strip_sensitive_keys(item)
            return cleaned
        if isinstance(value, list):
            return [self._strip_sensitive_keys(item) for item in value]
        if isinstance(value, str):
            return self._redact_text(value)
        return value

    def _should_drop_key(self, key: str) -> bool:
        key_lower = key.lower()
        return any(word in key_lower for word in DROP_KEYWORDS)

    def _redact_text(self, text: Optional[str]) -> Optional[str]:
        if not text:
            return text
        text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)
        text = PHONE_RE.sub("[REDACTED_PHONE]", text)
        return text

    def _clean_text(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    def _to_int(self, value: Any) -> int:
        if value is None:
            return 0
        try:
            return int(str(value).replace(",", "").strip())
        except (ValueError, TypeError):
            return 0

    def _parse_date(self, value: Any) -> Optional[datetime.date]:
        if isinstance(value, datetime.date) and not isinstance(value, datetime.datetime):
            return value
        if isinstance(value, datetime.datetime):
            return value.date()
        if isinstance(value, str):
            try:
                return datetime.date.fromisoformat(value.split("T")[0])
            except ValueError:
                return None
        return None

    def _normalize_url(self, value: Any) -> Optional[str]:
        if not value:
            return None
        text = str(value).strip()
        if text.startswith("/"):
            return f"https://beaconbio.org{text}"
        return text

    def _derive_event_id(
        self, event: Dict[str, Any], source_url: Optional[str], disease: str, date_reported: datetime.date
    ) -> str:
        raw_id = event.get("beacon_event_id") or event.get("id")
        if raw_id:
            return str(raw_id)
        base = source_url or f"{disease}-{date_reported.isoformat()}"
        digest = hashlib.sha256(base.encode("utf-8")).hexdigest()[:16]
        return f"beacon-{digest}"

    def _fallback_source_url(self) -> str:
        return f"https://beaconbio.org{self.beacon_path}"

    def _calculate_priority(self, cases: int, cfr: Optional[float]) -> Optional[float]:
        if cases == 0 and cfr is None:
            return None
        severity = cfr or 0.0
        volume = min(cases, 100)
        score = (severity * 0.7) + (volume * 0.3)
        return round(min(100.0, score), 2)

    def _should_skip_poll(self) -> bool:
        last_sync = self._get_last_sync_at()
        if not last_sync:
            return False

        min_interval = datetime.timedelta(minutes=self.min_interval_minutes)
        elapsed = datetime.datetime.utcnow() - last_sync
        if elapsed < min_interval:
            remaining = min_interval - elapsed
            logger.info(
                "Skipping Beacon poll to respect rate limits. Next allowed in %s seconds.",
                int(remaining.total_seconds()),
            )
            return True
        return False

    def _get_last_sync_at(self) -> Optional[datetime.datetime]:
        last_db = self.db.query(func.max(Signal.last_beacon_sync)).scalar()
        last_mem = BeaconCollector._last_sync_at
        if last_db and last_mem:
            return max(last_db, last_mem)
        return last_db or last_mem

    def get_status(self) -> Dict[str, Any]:
        """Get current scraper status and last sync information."""
        last_sync = self._get_last_sync_at()
        next_allowed = None
        if last_sync:
            min_interval = datetime.timedelta(minutes=self.min_interval_minutes)
            next_allowed = last_sync + min_interval

        return {
            "is_active": BeaconCollector._sync_in_progress,
            "last_sync_at": last_sync,
            "last_sync_error": BeaconCollector._last_sync_error,
            "last_sync_count": BeaconCollector._last_sync_count,
            "next_allowed_sync_at": next_allowed,
        }

    def _is_duplicate(self, event: Dict[str, Any]) -> bool:
        beacon_event_id = event.get("beacon_event_id")
        if beacon_event_id:
            existing = (
                self.db.query(Signal)
                .filter(Signal.beacon_event_id == beacon_event_id)
                .first()
            )
            if existing:
                return True
        source_url = event.get("source_url")
        if source_url:
            existing = self.db.query(Signal).filter(Signal.source_url == source_url).first()
            if existing:
                return True
        return False

    def _create_signal(self, event_data: Dict[str, Any]) -> None:
        signal = Signal(**event_data)
        self.db.add(signal)
        self.db.flush()  # Ensure signal has an ID

        # Notify analysts of critical signals
        if signal.priority_score and signal.priority_score >= 85:
            notification_service.notify_new_critical_signal(signal, self.db)

    def _first_text(self, node: Any, selectors: Iterable[str]) -> Optional[str]:
        for selector in selectors:
            found = node.select_one(selector)
            if found and found.get_text(strip=True):
                return found.get_text(strip=True)
        return None

    def _first_number(self, node: Any, selectors: Iterable[str]) -> int:
        text = self._first_text(node, selectors)
        if not text:
            return 0
        matches = re.findall(r"\d+", text.replace(",", ""))
        return int(matches[0]) if matches else 0

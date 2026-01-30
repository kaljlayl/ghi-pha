import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapMarkerData } from '../types';

interface SurveillanceMapProps {
  signals: MapMarkerData[];
  height?: string;
}

// Helper: Get marker color based on priority score
function getPriorityColor(priority: number): string {
  if (priority >= 85) return '#FF3131'; // Critical - Red
  if (priority >= 70) return '#FFD700'; // High - Gold
  if (priority >= 50) return '#00F2FF'; // Medium - Teal
  return '#39FF14'; // Low - Neon Green
}

// Helper: Get marker radius based on priority score
function getPriorityRadius(priority: number): number {
  if (priority >= 85) return 12;
  if (priority >= 70) return 10;
  if (priority >= 50) return 8;
  return 6;
}

// Heatmap layer component
interface HeatmapLayerProps {
  points: [number, number, number][];
}

function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    // @ts-ignore - leaflet.heat types not perfect
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 12,
      gradient: {
        0.0: '#0000FF', // Blue
        0.3: '#00F2FF', // Cyan (GHI teal)
        0.6: '#FFD700', // Gold
        1.0: '#FF3131', // Red (critical)
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

// Map legend component
function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] glass-panel rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-ghi-teal">Priority Scale</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#FF3131' }}></div>
          <span className="text-xs">Critical (≥85)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#FFD700' }}></div>
          <span className="text-xs">High (70-84)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ghi-teal"></div>
          <span className="text-xs">Medium (50-69)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#39FF14' }}></div>
          <span className="text-xs">Low (&lt;50)</span>
        </div>
      </div>
    </div>
  );
}

// Auto-fit bounds hook
function AutoFitBounds({ signals }: { signals: MapMarkerData[] }) {
  const map = useMap();

  useEffect(() => {
    const validSignals = signals.filter((s) => s.latitude && s.longitude);

    if (validSignals.length > 0) {
      const bounds = validSignals.map((s) => [s.latitude!, s.longitude!] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [signals, map]);

  return null;
}

export default function SurveillanceMap({ signals, height = '600px' }: SurveillanceMapProps) {
  const [viewMode, setViewMode] = useState<'cluster' | 'heatmap'>('cluster');
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;
      const container = map.getContainer();
      map.remove();
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
      mapRef.current = null;
    };
  }, []);

  // Filter signals with valid coordinates
  const validSignals = useMemo(
    () => signals.filter((s) => s.latitude && s.longitude),
    [signals]
  );

  // Transform signals to heatmap points
  const heatmapPoints = useMemo(
    () =>
      validSignals.map(
        (s) => [s.latitude!, s.longitude!, (s.priority_score || 0) / 100] as [number, number, number]
      ),
    [validSignals]
  );

  if (validSignals.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800/50 rounded-3xl">
        <p className="text-slate-400 text-sm">No signals with location data</p>
      </div>
    );
  }

  return (
    <div className="relative w-full glass-panel rounded-3xl border border-ghi-blue/20 overflow-hidden" style={{ height }}>
      {/* View toggle controls */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <button
          onClick={() => setViewMode('cluster')}
          className={`glass-panel rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
            viewMode === 'cluster'
              ? 'bg-ghi-teal text-black'
              : 'text-ghi-teal hover:bg-ghi-teal/10'
          }`}
        >
          Cluster View
        </button>
        <button
          onClick={() => setViewMode('heatmap')}
          className={`glass-panel rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
            viewMode === 'heatmap'
              ? 'bg-ghi-teal text-black'
              : 'text-ghi-teal hover:bg-ghi-teal/10'
          }`}
        >
          Heatmap View
        </button>
      </div>

      {/* Signal count badge */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel rounded-lg px-3 py-1">
        <p className="text-xs">
          <span className="text-ghi-teal font-bold">{validSignals.length}</span>
          <span className="text-slate-400"> signals</span>
        </p>
      </div>

      {/* Map legend */}
      <MapLegend />

      {/* Leaflet Map */}
      <MapContainer
        center={[24.7136, 46.6753]} // Riyadh, Saudi Arabia
        zoom={4}
        zoomControl={true}
        className="w-full h-full rounded-3xl"
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        {/* CartoDB Dark Matter tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Auto-fit bounds */}
        <AutoFitBounds signals={validSignals} />

        {/* Cluster view */}
        {viewMode === 'cluster' && (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={(cluster: any) => {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `<div class="glassmorphic-cluster">${count}</div>`,
                className: 'custom-cluster',
                iconSize: L.point(40, 40),
              });
            }}
          >
            {validSignals.map((signal) => (
              <CircleMarker
                key={signal.id}
                center={[signal.latitude!, signal.longitude!]}
                radius={getPriorityRadius(signal.priority_score || 0)}
                fillColor={getPriorityColor(signal.priority_score || 0)}
                fillOpacity={0.7}
                color={getPriorityColor(signal.priority_score || 0)}
                weight={2}
              >
                <Popup minWidth={300} maxWidth={400}>
                  <div className="space-y-3 p-2">
                    <h3 className="font-bold text-ghi-teal text-lg">{signal.disease}</h3>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-slate-400 font-semibold">Location:</span>{' '}
                        {signal.country}
                        {signal.location && ` // ${signal.location}`}
                      </p>
                      <p className="text-sm">
                        <span className="text-slate-400 font-semibold">Date:</span>{' '}
                        {new Date(signal.date_reported).toLocaleDateString()}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-400">Cases:</span>
                          <span className="font-bold text-white ml-1">{signal.cases}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Deaths:</span>
                          <span className="font-bold ml-1" style={{ color: '#FF3131' }}>
                            {signal.deaths}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">
                        <span className="text-slate-400 font-semibold">CFR:</span>
                        <span className="ml-1">
                          {signal.cases > 0
                            ? ((signal.deaths / signal.cases) * 100).toFixed(1)
                            : 0}
                          %
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-slate-400 font-semibold">Priority:</span>
                        <span
                          className="ml-1 font-bold"
                          style={{ color: getPriorityColor(signal.priority_score || 0) }}
                        >
                          {(signal.priority_score || 0).toFixed(1)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        {signal.triage_status}
                      </p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
        )}

        {/* Heatmap view */}
        {viewMode === 'heatmap' && <HeatmapLayer points={heatmapPoints} />}
      </MapContainer>
    </div>
  );
}

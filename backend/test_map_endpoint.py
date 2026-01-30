#!/usr/bin/env python3
"""Test script to verify map endpoint functionality"""

import requests
import json

def test_map_endpoint():
    """Test the /api/v1/signals/map-data endpoint"""
    url = "http://localhost:8000/api/v1/signals/map-data"

    try:
        print("Testing map endpoint...")
        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Success! Status: {response.status_code}")
            print(f"  Markers: {len(data.get('markers', []))}")
            print(f"  Heatmap points: {len(data.get('heatmap_points', []))}")
            print(f"  Total signals: {data.get('total_signals', 0)}")

            if data.get('markers'):
                print("\nFirst marker:")
                marker = data['markers'][0]
                print(f"  Disease: {marker.get('disease')}")
                print(f"  Location: {marker.get('country')}")
                print(f"  Coords: ({marker.get('latitude')}, {marker.get('longitude')})")
                print(f"  Priority: {marker.get('priority_score')}")

            return True
        else:
            print(f"✗ Failed! Status: {response.status_code}")
            print(f"  Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("✗ Connection refused - is the server running?")
        print("  Start with: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_map_endpoint()
    exit(0 if success else 1)

import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export const MARTINIQUE_CENTER: [number, number] = [14.64, -61.02];
export const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 12));
  }, [lat, lng, map]);
  return null;
}

export function MapPicker({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  const pos: [number, number] | null = lat != null && lng != null ? [lat, lng] : null;
  return (
    <MapContainer center={pos ?? MARTINIQUE_CENTER} zoom={pos ? 12 : 10} className="map">
      <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
      <ClickHandler onPick={onPick} />
      <Recenter lat={lat} lng={lng} />
      {pos && <CircleMarker center={pos} radius={9} pathOptions={{ color: '#ff6f59', fillOpacity: 0.8 }} />}
    </MapContainer>
  );
}

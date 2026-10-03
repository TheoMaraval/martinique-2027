import { useEffect } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { RoutePoint } from '../../domain/itinerary';
import { OSM_ATTRIBUTION, OSM_URL } from '../../ui/MapPicker';

function FitBounds({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 13 });
  }, [map, points]);
  return null;
}

export function RouteMap({ points }: { points: RoutePoint[] }) {
  if (!points.length) {
    return (
      <section className="card">
        <h2>Carte de l'itinéraire</h2>
        <p className="muted">Ajoute des points GPS aux activités et logements du planning pour voir l'itinéraire.</p>
      </section>
    );
  }
  const byTeam = new Map<string, RoutePoint[]>();
  for (const p of points) byTeam.set(p.teamId, [...(byTeam.get(p.teamId) ?? []), p]);
  return (
    <section className="card">
      <h2>Carte de l'itinéraire</h2>
      <MapContainer center={[points[0].lat, points[0].lng]} zoom={10} className="map map-route">
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
        <FitBounds points={points} />
        {[...byTeam].map(([teamId, pts]) => (
          <Polyline key={teamId} positions={pts.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: pts[0].color, weight: 3, dashArray: '6 6' }} />
        ))}
        {points.map((p, i) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={8} pathOptions={{ color: p.color, fillOpacity: 0.9 }}>
            <Tooltip>{i + 1}. {p.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </section>
  );
}

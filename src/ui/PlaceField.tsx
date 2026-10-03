import { useState } from 'react';
import { parseLatLng } from '../domain/validation';
import { searchPlaces, type SearchResult } from '../lib/geocode';
import { MapPicker } from './MapPicker';

export interface PlaceValue { place_name: string; lat: number | null; lng: number | null }

export function PlaceField({ value, onChange }: { value: PlaceValue; onChange: (v: PlaceValue) => void }) {
  const [coords, setCoords] = useState(value.lat != null && value.lng != null ? `${value.lat}, ${value.lng}` : '');
  const [coordErr, setCoordErr] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  const setPoint = (lat: number, lng: number, name = value.place_name) => {
    onChange({ place_name: name, lat, lng });
    setCoords(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setCoordErr('');
  };
  const applyCoords = () => {
    if (!coords.trim()) return onChange({ ...value, lat: null, lng: null });
    const p = parseLatLng(coords);
    if (!p) setCoordErr('Coordonnées invalides (ex. 14.6161, -61.0588)');
    else setPoint(p.lat, p.lng);
  };
  const search = async () => {
    setSearching(true);
    setSearchErr('');
    try {
      const r = await searchPlaces(query);
      setResults(r);
      if (!r.length) setSearchErr('Aucun résultat');
    } catch {
      setSearchErr('Recherche indisponible');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="place-field">
      <input aria-label="Nom du lieu" placeholder="Nom du lieu" value={value.place_name} onChange={e => onChange({ ...value, place_name: e.target.value })} />
      <div className="row">
        <input
          aria-label="Rechercher une adresse" placeholder="Rechercher une adresse…" value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
        />
        <button type="button" onClick={() => void search()} disabled={searching || !query.trim()}>{searching ? '…' : 'Chercher'}</button>
      </div>
      {searchErr && <p className="muted">{searchErr}</p>}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map(r => (
            <li key={r.id}>
              <button type="button" onClick={() => { setPoint(r.lat, r.lng, value.place_name || r.label.split(',')[0]); setResults([]); }}>{r.label}</button>
            </li>
          ))}
        </ul>
      )}
      <MapPicker lat={value.lat} lng={value.lng} onPick={(lat, lng) => setPoint(lat, lng)} />
      <input aria-label="Coordonnées GPS" placeholder="lat, lng (ex. 14.6161, -61.0588)" value={coords} onChange={e => setCoords(e.target.value)} onBlur={applyCoords} />
      {coordErr && <p className="error" role="alert">{coordErr}</p>}
    </div>
  );
}

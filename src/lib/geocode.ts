export interface SearchResult { id: string; label: string; lat: number; lng: number }

export async function searchPlaces(q: string): Promise<SearchResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=mq&accept-language=fr&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('geocode');
  const data = (await res.json()) as Array<{ place_id: number; display_name: string; lat: string; lon: string }>;
  return data.map(d => ({ id: String(d.place_id), label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}

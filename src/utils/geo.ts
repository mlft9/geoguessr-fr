// src/utils/geo.ts

export type LatLngLiteral = { lat: number; lng: number };

/** Distance haversine en km entre deux LatLng */
export function haversineKm(a: LatLngLiteral, b: LatLngLiteral) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Score FR (0–5000) avec décroissance exponentielle */
export function scoreFromKm(km: number) {
  const scaleKm = 150; // ajusté pour la France
  const s = Math.round(5000 * Math.exp(-km / scaleKm));
  return Math.max(0, Math.min(5000, s));
}

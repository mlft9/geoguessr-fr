// src/utils/geo.ts
import { GAME_CONFIG } from "../config";

/** Distance haversine en kilomètres entre 2 points (lat/lng en degrés) */
export function haversineKm(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral
): number {
  const R = 6371; // rayon Terre (km)
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Calcul du score à partir d'une distance (km).
 *
 * - maxScore contrôlé par GAME_CONFIG.maxScore
 * - Si GAME_CONFIG.franceScale === true :
 *     le score tombe à ~1% du max vers 1000 km (échelle adaptée à la France)
 * - Sinon :
 *     on utilise une échelle plus "monde" (≈ 2000 km, comme ton ancienne formule)
 */
export function scoreFromKm(km: number): number {
  const max = GAME_CONFIG.maxScore;

  // Échelle de décroissance (km)
  // France : ~1% du score à 1000 km  → k ≈ 1000 / ln(100) ≈ 217 km
  // Monde  : k = 2000 km (proche de ta version initiale)
  const k = GAME_CONFIG.franceScale
    ? 1000 / Math.log(100) // ≈ 217.147...
    : 2000;

  const raw = Math.round(max * Math.exp(-km / k));
  return clamp(raw, 0, max);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

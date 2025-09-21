// src/config.ts

/** Configuration générale du jeu */
export const GAME_CONFIG = {
  // 🎯 Score
  maxScore: 5000,         // score maximum par manche
  franceScale: true,      // si true, échelle de score adaptée à la France

  // 📏 Spawn
  urbanProbability: 0.85, // probabilité de spawn en zone urbaine
  urbanRadiusKm: 4,       // rayon max autour d’une ville (km)
  ruralRadiusM: 3000,     // rayon max pour recherche Street View en rural (m)

  // 🌍 Carte (bornes France)
  frBounds: { latMin: 41.3, latMax: 51.1, lngMin: -5.1, lngMax: 9.6 },

  // 🗺️ Affichage
  showRealMarker: false,  // afficher le vrai marqueur sur la mini-carte ?

  // 🎛️ UI — options (utilisées par la mini-carte et l’overlay)
  ui: {
    miniMapInitialCenter: { lat: 46.6, lng: 2.2 }, // centre initial mini-carte
    miniMapInitialZoom: 5,                         // zoom initial mini-carte
    hoverExpandMiniMap: true,                      // agrandir au survol
    guessDraggable: true,                          // le marqueur de guess peut être déplacé
  },

  // 🎨 Couleurs des pins (AdvancedMarkerElement.PinElement)
  pins: {
    realColor: "#EA4335", // rouge (vraie position)
    guessColor: "#4285F4" // bleu (supposition)
  },
} as const;

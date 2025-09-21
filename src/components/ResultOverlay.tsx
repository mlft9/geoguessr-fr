// src/components/ResultOverlay.tsx
import { useEffect, useRef } from "react";
import { GAME_CONFIG } from "../config"; // 👈 nouvel import

type LatLngLiteral = google.maps.LatLngLiteral;

type Props = {
  real: LatLngLiteral;
  guess: LatLngLiteral;
  score: number;
  km: number;
  onClose: () => void;
  onNext: () => void;
  mapStyle?: google.maps.MapTypeStyle[];
  /** 🔑 Requis pour AdvancedMarkerElement (vector map) */
  mapId?: string;
};

export default function ResultOverlay({
  real,
  guess,
  score,
  km,
  onClose,
  onNext,
  mapStyle = [],
  mapId,
}: Props) {
  const resultMapDivRef = useRef<HTMLDivElement | null>(null);
  const resultMapRef = useRef<google.maps.Map | null>(null);
  const resultLineRef = useRef<google.maps.Polyline | null>(null);

  // 🔴🔵 AdvancedMarkers (au lieu de google.maps.Marker)
  const resultRealRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const resultGuessRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!resultMapDivRef.current) return;

    // Carte résultat (avec Map ID pour activer Advanced Markers)
    resultMapRef.current = new google.maps.Map(resultMapDivRef.current, {
      center: { lat: 46.6, lng: 2.2 },
      zoom: 5,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      backgroundColor: "#0b0f14",
      disableDefaultUI: true,
      clickableIcons: false,
      disableDoubleClickZoom: true,
      // styles: mapStyle,
      mapId, // ✅ important pour AdvancedMarkerElement
    });

    // Pins rouge & bleu via PinElement
    const redPin = new google.maps.marker.PinElement({
      background: "#EA4335",
      glyphColor: "#ffffff",
    });
    const bluePin = new google.maps.marker.PinElement({
      background: "#4285F4",
      glyphColor: "#ffffff",
    });

    // Marqueurs avancés
    resultRealRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: resultMapRef.current!,
      position: real,
      title: "Vraie position",
      content: redPin.element,
    });
    resultGuessRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: resultMapRef.current!,
      position: guess,
      title: "Votre supposition",
      content: bluePin.element,
    });

    // Ligne entre les deux points
    resultLineRef.current = new google.maps.Polyline({
      path: [real, guess],
      geodesic: true,
      strokeColor: "#66a3ff",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: resultMapRef.current!,
    });

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(real);
    bounds.extend(guess);
    resultMapRef.current.fitBounds(bounds, 40);

    return () => {
      resultLineRef.current?.setMap(null);
      if (resultRealRef.current) resultRealRef.current.map = null;
      if (resultGuessRef.current) resultGuessRef.current.map = null;

      resultLineRef.current = null;
      resultRealRef.current = null;
      resultGuessRef.current = null;
      resultMapRef.current = null;
    };
  }, [real, guess, mapStyle, mapId]);

  return (
    <div className="result-overlay">
      <div className="result-card panel">
        <div className="result-header">
          <div className="badge">
            Distance : <b>{(km * 1000).toFixed(0)} m</b> ({km.toFixed(2)} km)
          </div>
          <div className="badge">
            Score : <b>{score}</b> / {GAME_CONFIG.maxScore}
          </div>
        </div>
        <div className="result-map">
          <div ref={resultMapDivRef} className="fill" />
        </div>
        <div className="result-footer">
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
          <button className="btn" onClick={onNext}>
            Manche suivante
          </button>
        </div>
      </div>
    </div>
  );
}

// src/components/ResultOverlay.tsx
import { useEffect, useRef } from "react";

type LatLngLiteral = google.maps.LatLngLiteral;

type Props = {
  real: LatLngLiteral;
  guess: LatLngLiteral;
  score: number;
  km: number;
  onClose: () => void;
  onNext: () => void;
  mapStyle?: google.maps.MapTypeStyle[];
};

export default function ResultOverlay({
  real,
  guess,
  score,
  km,
  onClose,
  onNext,
  mapStyle = [],
}: Props) {
  const resultMapDivRef = useRef<HTMLDivElement | null>(null);
  const resultMapRef = useRef<google.maps.Map | null>(null);
  const resultLineRef = useRef<google.maps.Polyline | null>(null);
  const resultRealRef = useRef<google.maps.Marker | null>(null);
  const resultGuessRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!resultMapDivRef.current) return;

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
      styles: mapStyle,
    });

    resultRealRef.current = new google.maps.Marker({
      position: real,
      map: resultMapRef.current,
      icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      title: "Vraie position",
    });
    resultGuessRef.current = new google.maps.Marker({
      position: guess,
      map: resultMapRef.current,
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      title: "Votre supposition",
    });
    resultLineRef.current = new google.maps.Polyline({
      path: [real, guess],
      geodesic: true,
      strokeColor: "#66a3ff",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: resultMapRef.current,
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(real);
    bounds.extend(guess);
    resultMapRef.current.fitBounds(bounds, 40);

    return () => {
      resultLineRef.current?.setMap(null);
      resultRealRef.current?.setMap(null);
      resultGuessRef.current?.setMap(null);
      resultLineRef.current = null;
      resultRealRef.current = null;
      resultGuessRef.current = null;
      resultMapRef.current = null;
    };
  }, [real, guess, mapStyle]);

  return (
    <div className="result-overlay">
      <div className="result-card panel">
        <div className="result-header">
          <div className="badge">
            Distance : <b>{(km * 1000).toFixed(0)} m</b> ({km.toFixed(2)} km)
          </div>
          <div className="badge">
            Score : <b>{score}</b> / 5000
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
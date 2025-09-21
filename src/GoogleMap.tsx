import { useEffect, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import ResultOverlay from "./components/ResultOverlay";
import MiniMap, { type MiniMapHandle } from "./components/MiniMap";
import { CITY_SEEDS } from "./data/cities";
import { haversineKm, scoreFromKm } from "./utils/geo";

const FR_BOUNDS = { latMin: 41.3, latMax: 51.1, lngMin: -5.1, lngMax: 9.6 };
const SHOW_REAL_MARKER = false;
const mapStyle: google.maps.MapTypeStyle[] = [];

function weightedSeed(): { seed: google.maps.LatLngLiteral; radius: number } {
  const urban = Math.random() < 0.85;
  if (urban) {
    const center = CITY_SEEDS[Math.floor(Math.random() * CITY_SEEDS.length)];
    const maxKm = 4;
    const a = Math.random() * 2 * Math.PI;
    const r = Math.random() * maxKm;
    const dLat = r / 111;
    const dLng = r / (111 * Math.cos((center.lat * Math.PI) / 180));
    const seed = {
      lat: center.lat + dLat * Math.sin(a),
      lng: center.lng + dLng * Math.cos(a),
    };
    return { seed, radius: 800 };
  }
  const seed = {
    lat: FR_BOUNDS.latMin + (FR_BOUNDS.latMax - FR_BOUNDS.latMin) * Math.random(),
    lng: FR_BOUNDS.lngMin + (FR_BOUNDS.lngMax - FR_BOUNDS.lngMin) * Math.random(),
  };
  return { seed, radius: 3000 };
}

function getCountryCode(
  geocoder: google.maps.Geocoder,
  latLng: google.maps.LatLng
): Promise<string | null> {
  return new Promise((resolve) => {
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results) {
        for (const r of results) {
          for (const comp of r.address_components) {
            if (comp.types.includes("country")) {
              resolve(comp.short_name ?? null);
              return;
            }
          }
        }
      }
      resolve(null);
    });
  });
}

async function findFrenchPanorama(
  sv: google.maps.StreetViewService,
  geocoder: google.maps.Geocoder,
  maxAttempts = 30
): Promise<google.maps.StreetViewLocation | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const { seed, radius } = weightedSeed();
    const location = await new Promise<google.maps.StreetViewLocation | null>(
      (resolve) => {
        sv.getPanorama(
          {
            location: seed,
            radius,
            preference: google.maps.StreetViewPreference.NEAREST,
            source: google.maps.StreetViewSource.OUTDOOR,
          },
          (data, status) => {
            const hasLinks = (data?.links?.length ?? 0) > 0;
            if (status === google.maps.StreetViewStatus.OK && data?.location && hasLinks) {
              resolve(data.location);
            } else {
              resolve(null);
            }
          }
        );
      }
    );

  if (location?.latLng) {
      const cc = await getCountryCode(geocoder, location.latLng);
      if (cc === "FR") return location;
    }
  }
  return null;
}

export default function MapWithStreetView() {
  // Street View refs
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const realMarkerRef = useRef<google.maps.Marker | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);

  // Reset Street View
  const initialPanoPosRef = useRef<google.maps.LatLng | null>(null);
  const initialPovRef = useRef<google.maps.StreetViewPov | null>(null);

  // MiniMap ref
  const miniMapRef = useRef<MiniMapHandle | null>(null);

  // Réutilisation des services
  const svRef = useRef<google.maps.StreetViewService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [isLarge, setIsLarge] = useState(false);
  const [validated, setValidated] = useState(false);
  const validatedRef = useRef(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ km: number; score: number } | null>(null);

  // positions figées pour l’overlay
  const [lastReal, setLastReal] = useState<google.maps.LatLngLiteral | null>(null);
  const [lastGuess, setLastGuess] = useState<google.maps.LatLngLiteral | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    id: "gmaps-sdk",
  });

  // sync ref <- state
  useEffect(() => {
    validatedRef.current = validated;
  }, [validated]);

  // première manche
  useEffect(() => {
    if (!isLoaded || !panoDivRef.current) return;
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // --- handlers ---
  async function startNewRound() {
    if (!isLoaded || !panoDivRef.current) return;

    setLoading(true);
    setValidated(false);
    setShowResult(false);
    setResult(null);
    setLastReal(null);
    setLastGuess(null);

    // Nettoie ancienne ligne & guess
    lineRef.current?.setMap(null);
    lineRef.current = null;
    miniMapRef.current?.clearGuess();

    // Reset mini-carte
    const map = miniMapRef.current?.getMap();
    if (map) {
      map.setZoom(5);
      map.setCenter(new google.maps.LatLng(46.6, 2.2));
    }

    // services (réutilisés)
    if (!svRef.current) svRef.current = new google.maps.StreetViewService();
    if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();

    const loc = await findFrenchPanorama(svRef.current, geocoderRef.current);
    const chosen = loc?.latLng;

    if (!chosen) {
      setLoading(false);
      console.warn("Aucun panorama FR trouvé après plusieurs essais.");
      return;
    }

    if (!panoRef.current) {
      panoRef.current = new google.maps.StreetViewPanorama(panoDivRef.current, {
        position: chosen,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: false,
        linksControl: true,
        showRoadLabels: true,
        fullscreenControl: false,
      });
    } else {
      panoRef.current.setPosition(chosen);
    }

    initialPanoPosRef.current = chosen;
    initialPovRef.current = panoRef.current.getPov();
    panoRef.current.setZoom(1);

    if (!realMarkerRef.current) {
      realMarkerRef.current = new google.maps.Marker({
        position: chosen,
        map: SHOW_REAL_MARKER ? map ?? null : null,
        title: "Vraie position",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });
    } else {
      realMarkerRef.current.setPosition(chosen);
      realMarkerRef.current.setMap(SHOW_REAL_MARKER ? map ?? null : null);
    }

    setLoading(false);
  }

  function resetToStart() {
    if (!panoRef.current || !initialPanoPosRef.current) return;
    panoRef.current.setPosition(initialPanoPosRef.current);
    if (initialPovRef.current) panoRef.current.setPov(initialPovRef.current);
    panoRef.current.setZoom(1);
  }

  function onValidate() {
    const map = miniMapRef.current?.getMap();
    const realPos = realMarkerRef.current?.getPosition();
    const guessPos = miniMapRef.current?.getGuessLatLng();
    if (!map || !realPos || !guessPos) {
      alert("Pose d'abord ta supposition (clic sur la mini-carte).");
      return;
    }

    const a = { lat: realPos.lat(), lng: realPos.lng() };
    const b = { lat: guessPos.lat(), lng: guessPos.lng() };
    const km = haversineKm(a, b);
    const score = scoreFromKm(km);
    setResult({ km, score });
    setValidated(true);

    // fige pour l’overlay
    setLastReal(a);
    setLastGuess(b);

    // Trace la ligne sur la mini-carte
    lineRef.current?.setMap(null);
    lineRef.current = new google.maps.Polyline({
      path: [realPos, guessPos],
      geodesic: true,
      strokeColor: "#66a3ff",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map,
    });
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(realPos);
    bounds.extend(guessPos);
    map.fitBounds(bounds, 40);

    setShowResult(true);
  }

  if (loadError) return <div>Erreur de chargement Google Maps</div>;
  if (!isLoaded) return <div>Chargement…</div>;

  return (
    <div className="stage">
      {/* Street View plein écran */}
      <div className="pano-fill">
        <div
          ref={panoDivRef}
          className="fill"
          style={{ visibility: loading ? "hidden" : "visible" }}
        />
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(11,15,20,.6)",
              fontSize: 16,
            }}
          >
            Recherche d’un spot en France…
          </div>
        )}
      </div>

      {/* Mini-carte */}
      <MiniMap
        ref={miniMapRef}
        isLoaded={isLoaded}
        isLarge={isLarge}
        onToggleSize={() => setIsLarge((v) => !v)}
        loading={loading}
        validated={validated}
        onValidate={onValidate}
        onResetToStart={resetToStart}
        mapStyle={mapStyle}
      />

      {/* Overlay Résultat */}
      {showResult && result && lastReal && lastGuess && (
        <ResultOverlay
          real={lastReal}
          guess={lastGuess}
          score={result.score}
          km={result.km}
          onClose={() => setShowResult(false)}
          onNext={startNewRound}
          mapStyle={mapStyle}
        />
      )}
    </div>
  );
}

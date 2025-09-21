import { useEffect, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import ResultOverlay from "./components/ResultOverlay";
import MiniMap, { type MiniMapHandle } from "./components/MiniMap";
import { CITY_SEEDS } from "./data/cities";
import { haversineKm, scoreFromKm } from "./utils/geo";
import { GAME_CONFIG } from "./config";

const mapStyle: google.maps.MapTypeStyle[] = [];
const LIBRARIES: ("marker")[] = ["marker"];

// 🔑 Map ID (vector) pour activer AdvancedMarkerElement
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string;

function weightedSeed(): { seed: google.maps.LatLngLiteral; radius: number } {
  const urban = Math.random() < GAME_CONFIG.urbanProbability;

  if (urban) {
    const center = CITY_SEEDS[Math.floor(Math.random() * CITY_SEEDS.length)];
    const maxKm = GAME_CONFIG.urbanRadiusKm; // distance de spawn autour de la ville
    const a = Math.random() * 2 * Math.PI;
    const r = Math.random() * maxKm;
    const dLat = r / 111;
    const dLng = r / (111 * Math.cos((center.lat * Math.PI) / 180));
    const seed = {
      lat: center.lat + dLat * Math.sin(a),
      lng: center.lng + dLng * Math.cos(a),
    };
    // rayon de recherche Street View en zone urbaine (conservé à 800 m)
    return { seed, radius: 800 };
  }

  const { frBounds } = GAME_CONFIG;
  const seed = {
    lat: frBounds.latMin + (frBounds.latMax - frBounds.latMin) * Math.random(),
    lng: frBounds.lngMin + (frBounds.lngMax - frBounds.lngMin) * Math.random(),
  };
  // rayon de recherche Street View en zone rurale (configurable)
  return { seed, radius: GAME_CONFIG.ruralRadiusM };
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

// Helper pour lire une position d’AdvancedMarkerElement en LatLng
function toLatLng(pos: google.maps.LatLng | google.maps.LatLngLiteral) {
  return pos instanceof google.maps.LatLng ? pos : new google.maps.LatLng(pos);
}

export default function MapWithStreetView() {
  // Street View refs
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);

  // 🔴 vrai marqueur -> AdvancedMarkerElement
  const realMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
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

  const [lastReal, setLastReal] = useState<google.maps.LatLngLiteral | null>(null);
  const [lastGuess, setLastGuess] = useState<google.maps.LatLngLiteral | null>(null);

  const [panoError, setPanoError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    id: "gmaps-sdk",
    libraries: LIBRARIES,
  });

  useEffect(() => {
    validatedRef.current = validated;
  }, [validated]);

  useEffect(() => {
    if (!isLoaded || !panoDivRef.current) return;
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  async function startNewRound() {
    if (!isLoaded || !panoDivRef.current) return;

    setPanoError(null);
    setLoading(true);
    setValidated(false);
    setShowResult(false);
    setResult(null);
    setLastReal(null);
    setLastGuess(null);

    // Nettoyage
    lineRef.current?.setMap(null);
    lineRef.current = null;
    miniMapRef.current?.clearGuess();

    const map = miniMapRef.current?.getMap();
    if (map) {
      map.setZoom(5);
      map.setCenter(new google.maps.LatLng(46.6, 2.2));
    }

    if (!svRef.current) svRef.current = new google.maps.StreetViewService();
    if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();

    const loc = await findFrenchPanorama(svRef.current, geocoderRef.current);
    const chosen = loc?.latLng;

    if (!chosen) {
      setLoading(false);
      setPanoError("Aucun panorama Street View trouvé en France. Réessayer ?");
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

    // 🔴 vrai marqueur avec AdvancedMarkerElement (pin rouge)
    const redPin = new google.maps.marker.PinElement({
      background: "#EA4335",
      glyphColor: "#ffffff",
    });

    if (!realMarkerRef.current) {
      realMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: chosen,
        title: "Vraie position",
        content: redPin.element,
        map: GAME_CONFIG.showRealMarker ? map ?? null : null, // visible seulement si flag
      });
    } else {
      realMarkerRef.current.position = chosen;
      realMarkerRef.current.map = GAME_CONFIG.showRealMarker ? map ?? null : null;
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
    const realPosAny = realMarkerRef.current?.position;
    const guessPos = miniMapRef.current?.getGuessLatLng();

    if (!map || !realPosAny || !guessPos) {
      alert("Pose d'abord ta supposition (clic sur la mini-carte).");
      return;
    }

    const realPos = toLatLng(realPosAny);

    const a = { lat: realPos.lat(), lng: realPos.lng() };
    const b = { lat: guessPos.lat(), lng: guessPos.lng() };
    const km = haversineKm(a, b);
    const score = scoreFromKm(km);
    setResult({ km, score });
    setValidated(true);

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
        mapId={MAP_ID} // 🔑 Map ID pour AdvancedMarkers côté mini-carte
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
          mapId={MAP_ID} // ✅ passer le Map ID aussi à l’overlay
        />
      )}

      {/* Panneau "Réessayer" si aucun panorama */}
      {panoError && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(11,15,20,.6)",
            zIndex: 1000,
          }}
        >
          <div className="panel" style={{ padding: 16, minWidth: 320 }}>
            <div style={{ marginBottom: 12 }}>{panoError}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setPanoError(null)}>
                Fermer
              </button>
              <button className="btn" onClick={startNewRound}>
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

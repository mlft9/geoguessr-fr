import { useEffect, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const FR_BOUNDS = {
  latMin: 41.3,
  latMax: 51.1,
  lngMin: -5.1,
  lngMax: 9.6,
};

// Style pour masquer les POI
const mapStyle: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

export default function MapWithStreetView() {
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const realMarkerRef = useRef<google.maps.Marker | null>(null);
  const guessMarkerRef = useRef<google.maps.Marker | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);

  // Overlay Résultat
  const resultMapDivRef = useRef<HTMLDivElement | null>(null);
  const resultMapRef = useRef<google.maps.Map | null>(null);
  const resultLineRef = useRef<google.maps.Polyline | null>(null);
  const resultRealRef = useRef<google.maps.Marker | null>(null);
  const resultGuessRef = useRef<google.maps.Marker | null>(null);

  const [loading, setLoading] = useState(true);
  const [isLarge, setIsLarge] = useState(false);
  const [validated, setValidated] = useState(false);
  const validatedRef = useRef(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ km: number; score: number } | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    id: "gmaps-sdk",
  });

  // ---- utilitaires ----
  function randomCoords(): google.maps.LatLngLiteral {
    const lat =
      FR_BOUNDS.latMin + (FR_BOUNDS.latMax - FR_BOUNDS.latMin) * Math.random();
    const lng =
      FR_BOUNDS.lngMin + (FR_BOUNDS.lngMax - FR_BOUNDS.lngMin) * Math.random();
    return { lat, lng };
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
      const seed = randomCoords();
      const location = await new Promise<google.maps.StreetViewLocation | null>(
        (resolve) => {
          sv.getPanorama(
            {
              location: seed,
              radius: 1200,
              preference: google.maps.StreetViewPreference.NEAREST,
            },
            (data, status) => {
              if (status === google.maps.StreetViewStatus.OK && data?.location) {
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

  function haversineKm(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h =
      sinDLat * sinDLat +
      Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function scoreFromKm(km: number) {
    const s = Math.round(5000 * Math.exp(-km / 2000));
    return Math.max(0, Math.min(5000, s));
  }

  // ---- sync ref <- state ----
  useEffect(() => {
    validatedRef.current = validated;
  }, [validated]);

  // ---- init mini-carte (1 fois) ----
  useEffect(() => {
    if (!isLoaded || !mapDivRef.current) return;

    mapRef.current = new google.maps.Map(mapDivRef.current, {
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

    // Clic = poser/déplacer le guess (si non validé)
    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !mapRef.current) return;
      if (validatedRef.current) return;

      if (!guessMarkerRef.current) {
        guessMarkerRef.current = new google.maps.Marker({
          position: e.latLng,
          map: mapRef.current,
          draggable: true,
          title: "Votre supposition",
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
      } else {
        guessMarkerRef.current.setPosition(e.latLng);
      }
    });

    return () => {
      mapRef.current = null;
    };
  }, [isLoaded]);

  // ---- première manche ----
  useEffect(() => {
    if (!isLoaded || !panoDivRef.current) return;
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // ---- helpers de round ----
  async function startNewRound() {
    if (!isLoaded || !panoDivRef.current || !mapRef.current) return;

    setLoading(true);
    setValidated(false);
    setShowResult(false);
    setResult(null);

    // Nettoyage visuel mini-carte
    lineRef.current?.setMap(null);
    lineRef.current = null;
    guessMarkerRef.current?.setMap(null);
    guessMarkerRef.current = null;
    mapRef.current.setZoom(5);
    mapRef.current.setCenter(new google.maps.LatLng(46.6, 2.2));

    const sv = new google.maps.StreetViewService();
    const geocoder = new google.maps.Geocoder();

    const loc = await findFrenchPanorama(sv, geocoder);
    const chosen = loc?.latLng;

    if (!chosen) {
      setLoading(false);
      console.warn("Aucun panorama FR trouvé après plusieurs essais.");
      return;
    }

    // Instancier / mettre à jour Street View
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

    // Marqueur ROUGE (vrai)
    if (!realMarkerRef.current) {
      realMarkerRef.current = new google.maps.Marker({
        position: chosen,
        map: mapRef.current,
        title: "Vraie position",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });
    } else {
      realMarkerRef.current.setPosition(chosen);
    }

    setLoading(false);
  }

  // ---- validation -> calcul + overlay résultat ----
  function onValidate() {
    if (!mapRef.current || !realMarkerRef.current) return;
    const realPos = realMarkerRef.current.getPosition();
    const guessPos = guessMarkerRef.current?.getPosition();

    if (!guessPos || !realPos) {
      alert("Pose d'abord ta supposition (clic sur la mini-carte).");
      return;
    }

    const a = { lat: realPos.lat(), lng: realPos.lng() };
    const b = { lat: guessPos.lat(), lng: guessPos.lng() };
    const km = haversineKm(a, b);
    const score = scoreFromKm(km);
    setResult({ km, score });
    setValidated(true);

    // Ligne + fitBounds sur la mini-carte (pour cohérence visuelle)
    lineRef.current?.setMap(null);
    lineRef.current = new google.maps.Polyline({
      path: [realPos, guessPos],
      geodesic: true,
      strokeColor: "#66a3ff",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: mapRef.current,
    });
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(realPos);
    bounds.extend(guessPos);
    mapRef.current.fitBounds(bounds, 40);

    // Afficher l’overlay résultat
    setShowResult(true);
    // La carte résultat sera initialisée dans l’effet ci-dessous
  }

  // ---- init / update de la carte "Résultat" quand overlay ouvert ----
  useEffect(() => {
    if (!showResult || !resultMapDivRef.current || !mapRef.current) return;

    // Récup positions existantes
    const realPos = realMarkerRef.current?.getPosition();
    const guessPos = guessMarkerRef.current?.getPosition();
    if (!realPos || !guessPos) return;

    // (Re)création propre de la carte résultat
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

    // Marqueurs
    resultRealRef.current = new google.maps.Marker({
      position: realPos,
      map: resultMapRef.current,
      icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      title: "Vraie position",
    });
    resultGuessRef.current = new google.maps.Marker({
      position: guessPos,
      map: resultMapRef.current,
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      title: "Votre supposition",
    });

    // Ligne
    resultLineRef.current = new google.maps.Polyline({
      path: [realPos, guessPos],
      geodesic: true,
      strokeColor: "#66a3ff",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: resultMapRef.current,
    });

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(realPos);
    bounds.extend(guessPos);
    resultMapRef.current.fitBounds(bounds, 40);

    return () => {
      resultLineRef.current?.setMap(null);
      resultLineRef.current = null;
      resultRealRef.current = null;
      resultGuessRef.current = null;
      resultMapRef.current = null;
    };
  }, [showResult]);

  // ---- resize mini-carte ----
  useEffect(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    // @ts-ignore
    google.maps.event.trigger(mapRef.current, "resize");
    if (center) mapRef.current.setCenter(center);
  }, [isLarge]);

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
              backdropFilter: "blur(2px)",
              fontSize: 16,
            }}
          >
            Recherche d’un spot en France…
          </div>
        )}
      </div>

      {/* Mini-carte */}
      <div className={`overlay-map panel ${isLarge ? "large" : "small"}`}>
        <button
          className="overlay-toggle"
          onClick={() => setIsLarge((v) => !v)}
          title={isLarge ? "Réduire la mini-carte" : "Agrandir la mini-carte"}
        >
          {isLarge ? "Réduire" : "Agrandir"}
        </button>

        <button
          onClick={onValidate}
          className="btn"
          style={{ position: "absolute", left: 8, bottom: 8, zIndex: 3 }}
          disabled={validated}
          title="Calculer distance et score"
        >
          {validated ? "Validé" : "Valider"}
        </button>

        <div ref={mapDivRef} className="fill" />
      </div>

      {/* Overlay Résultat */}
      {showResult && result && (
        <div className="result-overlay">
          <div className="result-card panel">
            <div className="result-header">
              <div className="badge">
                Distance : <b>{(result.km * 1000).toFixed(0)} m</b> ({result.km.toFixed(2)} km)
              </div>
              <div className="badge">Score : <b>{result.score}</b> / 5000</div>
            </div>

            <div className="result-map">
              <div ref={resultMapDivRef} className="fill" />
            </div>

            <div className="result-footer">
              <button className="btn" onClick={() => setShowResult(false)}>
                Fermer
              </button>
              <button className="btn" onClick={startNewRound}>
                Manche suivante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

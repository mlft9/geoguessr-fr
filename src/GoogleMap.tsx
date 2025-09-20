import { useEffect, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const FR_BOUNDS = { latMin: 41.3, latMax: 51.1, lngMin: -5.1, lngMax: 9.6 };

// Afficher le vrai marqueur (rouge) pendant la manche ?
const SHOW_REAL_MARKER = false;

// Style pour masquer les POI
// Laisse les POI visibles (pas de style qui les cache)
const mapStyle: google.maps.MapTypeStyle[] = [];


/** Graines "urbaines" (centres villes / bourgs) — échantillon couvrant la France métropolitaine */
const CITY_SEEDS: google.maps.LatLngLiteral[] = [
  // grandes villes
  { lat: 48.8566, lng: 2.3522 }, // Paris
  { lat: 43.2965, lng: 5.3698 }, // Marseille
  { lat: 45.7640, lng: 4.8357 }, // Lyon
  { lat: 43.6047, lng: 1.4442 }, // Toulouse
  { lat: 43.7102, lng: 7.2620 }, // Nice
  { lat: 47.2184, lng: -1.5536 }, // Nantes
  { lat: 48.5734, lng: 7.7521 }, // Strasbourg
  { lat: 43.6119, lng: 3.8772 }, // Montpellier
  { lat: 44.8378, lng: -0.5792 }, // Bordeaux
  { lat: 50.6292, lng: 3.0573 }, // Lille
  { lat: 48.1173, lng: -1.6778 }, // Rennes
  { lat: 49.2583, lng: 4.0317 }, // Reims
  { lat: 45.1885, lng: 5.7245 }, // Grenoble
  { lat: 47.3220, lng: 5.0415 }, // Dijon
  { lat: 49.4431, lng: 1.0993 }, // Rouen
  { lat: 48.6894, lng: 6.1844 }, // Nancy
  { lat: 49.1193, lng: 6.1757 }, // Metz
  { lat: 48.8667, lng: 2.3333 }, // Paris-centre (doublon volontaire)

  // villes moyennes & littoral/est/ouest
  { lat: 46.5802, lng: 0.3404 }, // Poitiers
  { lat: 46.2044, lng: 5.2258 }, // Bourg-en-Bresse
  { lat: 45.7772, lng: 3.0870 }, // Clermont-Ferrand
  { lat: 45.4397, lng: 4.3872 }, // Saint-Étienne
  { lat: 43.1257, lng: 5.9306 }, // Toulon
  { lat: 43.9493, lng: 4.8055 }, // Avignon
  { lat: 44.0143, lng: 1.3550 }, // Montauban
  { lat: 44.5620, lng: 6.0780 }, // Gap
  { lat: 42.6976, lng: 2.8954 }, // Perpignan
  { lat: 43.2951, lng: -0.3686 }, // Pau
  { lat: 43.4931, lng: -1.4748 }, // Bayonne
  { lat: 46.1603, lng: -1.1511 }, // La Rochelle
  { lat: 48.3904, lng: -4.4861 }, // Brest
  { lat: 47.9961, lng: 0.1996 },  // Le Mans
  { lat: 47.9029, lng: 1.9093 },  // Orléans
  { lat: 49.1829, lng: -0.3707 }, // Caen
  { lat: 50.9513, lng: 1.8587 },  // Calais
  { lat: 50.7239, lng: 1.6133 },  // Boulogne-sur-Mer
  { lat: 47.2186, lng: -2.1520 }, // Saint-Nazaire
  { lat: 46.5017, lng: 6.4969 },  // Thonon/Évian
  { lat: 45.8992, lng: 6.1296 },  // Annecy
  { lat: 44.9334, lng: 4.8924 },  // Valence
  { lat: 47.2380, lng: 6.0251 },  // Besançon
  { lat: 48.0790, lng: 7.3585 },  // Colmar
  { lat: 47.9022, lng: 7.2468 },  // Mulhouse

  // Corse / Alpes / campagnes pour villages
  { lat: 41.9264, lng: 8.7369 },  // Ajaccio
  { lat: 42.7028, lng: 9.4500 },  // Bastia
  { lat: 44.5592, lng: 6.4953 },  // Barcelonnette
  { lat: 44.0930, lng: 6.2350 },  // Castellane
  { lat: 45.2920, lng: 6.5830 },  // Modane
  { lat: 45.9237, lng: 6.8694 },  // Chamonix

  // ajouts diversité
  { lat: 44.1060, lng: 4.0839 },  // Alès
  { lat: 43.6766, lng: 4.6286 },  // Arles
  { lat: 46.6714, lng: -1.4264 }, // La Roche-sur-Yon
  { lat: 47.4784, lng: -0.5632 }, // Angers
  { lat: 47.3936, lng: 0.6892 },  // Tours
  { lat: 48.4439, lng: 1.4890 },  // Chartres
  { lat: 49.8941, lng: 2.2958 },  // Amiens
  { lat: 49.2581, lng: 1.2167 },  // Évreux
  { lat: 50.3700, lng: 3.0800 },  // Valenciennes
  { lat: 50.6901, lng: 3.1800 },  // Tourcoing
  { lat: 50.6881, lng: 2.8820 },  // Lens
  { lat: 47.7440, lng: 7.3456 },  // Belfort
  { lat: 48.6690, lng: 6.1550 },  // Lunéville
  { lat: 47.3220, lng: -2.4280 }, // Guérande
  { lat: 43.1843, lng: 0.7216 },  // Tarbes
  { lat: 44.8945, lng: -0.2405 }, // Libourne
  { lat: 45.1560, lng: 1.5330 },  // Brive-la-Gaillarde
  { lat: 45.8336, lng: 1.2611 },  // Limoges
  { lat: 46.5890, lng: 3.3333 },  // Moulins
  { lat: 46.9900, lng: 3.1667 },  // Nevers
  { lat: 47.0101, lng: 4.8333 },  // Autun
  { lat: 48.0731, lng: -0.7667 }, // Laval
  { lat: 48.3076, lng: 4.0667 },  // Troyes
  { lat: 47.9961, lng: 2.7333 },  // Gien
  { lat: 44.5200, lng: 3.5000 },  // Mende
  { lat: 44.0136, lng: 1.3550 },  // Moissac
  { lat: 43.9330, lng: 2.1480 },  // Albi

  // nouveaux ajouts
  { lat: 48.6833, lng: 6.1667 },  // Toul
  { lat: 48.8333, lng: 2.1333 },  // Versailles
  { lat: 48.5833, lng: 2.6667 },  // Melun
  { lat: 49.0333, lng: 2.0667 },  // Cergy
  { lat: 48.7667, lng: 2.4833 },  // Créteil
  { lat: 49.3833, lng: 2.7833 },  // Compiègne
  { lat: 49.9000, lng: 2.3000 },  // Abbeville
  { lat: 50.7167, lng: 1.6167 },  // Dunkerque
  { lat: 49.6167, lng: -1.6333 }, // Cherbourg
  { lat: 49.5000, lng: 0.1167 },  // Le Havre
  { lat: 49.1833, lng: -1.0833 }, // Saint-Lô
  { lat: 48.4500, lng: 0.0833 },  // Alençon
  { lat: 47.3000, lng: -0.0833 }, // Saumur
  { lat: 46.8000, lng: -0.8000 }, // Bressuire
  { lat: 45.8833, lng: 0.9000 },  // Saint-Junien
  { lat: 45.9000, lng: -0.9500 }, // Rochefort
  { lat: 46.1333, lng: -1.1500 }, // Île de Ré (Saint-Martin)
  { lat: 48.0000, lng: -0.0833 }, // Mayenne
  { lat: 48.5500, lng: -2.7833 }, // Saint-Brieuc
  { lat: 47.6667, lng: -2.9833 }, // Vannes
  { lat: 47.7500, lng: -3.3667 }, // Lorient
  { lat: 47.3000, lng: -2.5000 }, // Pornichet
  { lat: 48.1000, lng: -1.6500 }, // Fougères
  { lat: 47.6667, lng: -1.6500 }, // Châteaubriant
  { lat: 44.2167, lng: 0.6333 },  // Agen
  { lat: 44.4000, lng: 0.7000 },  // Villeneuve-sur-Lot
  { lat: 44.5333, lng: 2.0333 },  // Rodez
  { lat: 44.1500, lng: 3.3833 },  // Florac
  { lat: 44.0167, lng: 4.4167 },  // Uzès
  { lat: 44.1000, lng: 3.0833 },  // Millau
  { lat: 42.5000, lng: 2.0833 },  // Prades
  { lat: 42.6833, lng: 2.6833 },  // Céret
  { lat: 43.6667, lng: 4.6333 },  // Saintes-Maries-de-la-Mer
  { lat: 43.3000, lng: 6.6333 },  // Fréjus
  { lat: 43.5500, lng: 6.9333 },  // Cannes
  { lat: 43.9333, lng: 6.6333 },  // Digne-les-Bains
  { lat: 44.6833, lng: 6.6500 },  // Briançon
  { lat: 44.9333, lng: 6.5667 },  // L’Argentière-la-Bessée
  { lat: 45.3667, lng: 5.5667 },  // Voiron
  { lat: 45.1833, lng: 5.7167 },  // Échirolles
  { lat: 45.9000, lng: 6.1167 },  // Seynod
  { lat: 45.5667, lng: 5.9333 },  // Aix-les-Bains
  { lat: 46.3500, lng: 6.4833 },  // Divonne-les-Bains
  { lat: 46.6667, lng: 4.3667 },  // Le Creusot
  { lat: 47.0500, lng: 4.8333 },  // Beaune
  { lat: 47.8000, lng: 3.5667 },  // Auxerre
  { lat: 47.3167, lng: 5.0167 },  // Dole
  { lat: 47.2333, lng: 6.0333 },  // Montbéliard
  { lat: 49.1167, lng: 7.0667 },  // Bitche
  { lat: 48.6500, lng: 7.7167 },  // Haguenau
  { lat: 48.4333, lng: 7.4667 },  // Sélestat
  { lat: 48.2833, lng: 7.4500 },  // Ribeauvillé
  { lat: 48.1667, lng: 7.3000 },  // Guebwiller
  { lat: 48.5833, lng: 7.5500 },  // Obernai
  { lat: 41.6333, lng: 9.2500 },  // Porto-Vecchio
  { lat: 42.0833, lng: 9.0167 },  // Corte
];

/** Retourne une coordonnée biaisée :
 *  - 85% autour d'une ville/bourg (rayon ≤ ~8 km)
 *  - 15% dans toute la France
 * Renvoie aussi un rayon de recherche Street View adapté.
 */
function weightedSeed(): { seed: google.maps.LatLngLiteral; radius: number } {
  const urban = Math.random() < 0.85;
  if (urban) {
    const center = CITY_SEEDS[Math.floor(Math.random() * CITY_SEEDS.length)];
    const maxKm = 8; // “autour de la ville”
    const a = Math.random() * 2 * Math.PI;
    const r = Math.random() * maxKm;
    const dLat = r / 111; // ~km->deg
    const dLng = r / (111 * Math.cos((center.lat * Math.PI) / 180));
    const seed = { lat: center.lat + dLat * Math.sin(a), lng: center.lng + dLng * Math.cos(a) };
    return { seed, radius: 800 }; // en ville, rayon Street View plus serré
  }

  // “route perdue” en pleine France
  const seed = {
    lat: FR_BOUNDS.latMin + (FR_BOUNDS.latMax - FR_BOUNDS.latMin) * Math.random(),
    lng: FR_BOUNDS.lngMin + (FR_BOUNDS.lngMax - FR_BOUNDS.lngMin) * Math.random(),
  };
  return { seed, radius: 3000 }; // en rural, rayon plus large pour accrocher un pano
}

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

  const initialPanoPosRef = useRef<google.maps.LatLng | null>(null);
  const initialPovRef = useRef<google.maps.StreetViewPov | null>(null);


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

  // ---- utilitaires existants ----
  function getCountryCode(geocoder: google.maps.Geocoder, latLng: google.maps.LatLng): Promise<string | null> {
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
      const location = await new Promise<google.maps.StreetViewLocation | null>((resolve) => {
        sv.getPanorama(
          { location: seed, radius, preference: google.maps.StreetViewPreference.NEAREST },
          (data, status) => {
            if (status === google.maps.StreetViewStatus.OK && data?.location) resolve(data.location);
            else resolve(null);
          }
        );
      });

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
    const h = sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function scoreFromKm(km: number) {
    const scaleKm = 150; // plus petit => la chute est plus rapide
    const s = Math.round(5000 * Math.exp(-km / scaleKm));
    return Math.max(0, Math.min(5000, s));
  }

  // ---- sync ref <- state ----
  useEffect(() => { validatedRef.current = validated; }, [validated]);

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

    return () => { mapRef.current = null; };
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

    initialPanoPosRef.current = chosen;                         // position de départ
    initialPovRef.current = panoRef.current.getPov();           // POV de départ (heading/pitch)
    panoRef.current.setZoom(1);                                 // zoom de départ (optionnel)

    if (!realMarkerRef.current) {
      realMarkerRef.current = new google.maps.Marker({
        position: chosen,
        map: SHOW_REAL_MARKER ? mapRef.current : null, // visible ou caché selon le flag
        title: "Vraie position",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });
    } else {
      realMarkerRef.current.setPosition(chosen);
      // s’assurer que l’affichage correspond au flag à chaque nouvelle manche
      realMarkerRef.current.setMap(SHOW_REAL_MARKER ? mapRef.current : null);
    }

    setLoading(false);
  }

  function resetToStart() {
    if (!panoRef.current || !initialPanoPosRef.current) return;
    panoRef.current.setPosition(initialPanoPosRef.current);
    if (initialPovRef.current) panoRef.current.setPov(initialPovRef.current);
    panoRef.current.setZoom(1);
  }


  // ---- validation -> calcul + overlay résultat ----
  function onValidate() {
    if (!mapRef.current || !realMarkerRef.current) return;
    const realPos = realMarkerRef.current.getPosition();
    const guessPos = guessMarkerRef.current?.getPosition();
    if (!guessPos || !realPos) { alert("Pose d'abord ta supposition (clic sur la mini-carte)."); return; }

    const a = { lat: realPos.lat(), lng: realPos.lng() };
    const b = { lat: guessPos.lat(), lng: guessPos.lng() };
    const km = haversineKm(a, b);
    const score = scoreFromKm(km);
    setResult({ km, score });
    setValidated(true);

    lineRef.current?.setMap(null);
    lineRef.current = new google.maps.Polyline({
      path: [realPos, guessPos], geodesic: true,
      strokeColor: "#66a3ff", strokeOpacity: 0.9, strokeWeight: 3,
      map: mapRef.current,
    });
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(realPos); bounds.extend(guessPos);
    mapRef.current.fitBounds(bounds, 40);

    setShowResult(true);
  }

  // ---- carte "Résultat" ----
  useEffect(() => {
    if (!showResult || !resultMapDivRef.current) return;

    const realPos = realMarkerRef.current?.getPosition();
    const guessPos = guessMarkerRef.current?.getPosition();
    if (!realPos || !guessPos) return;

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
      position: realPos, map: resultMapRef.current,
      icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", title: "Vraie position",
    });
    resultGuessRef.current = new google.maps.Marker({
      position: guessPos, map: resultMapRef.current,
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", title: "Votre supposition",
    });
    resultLineRef.current = new google.maps.Polyline({
      path: [realPos, guessPos], geodesic: true,
      strokeColor: "#66a3ff", strokeOpacity: 0.9, strokeWeight: 3,
      map: resultMapRef.current,
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(realPos); bounds.extend(guessPos);
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
        <div ref={panoDivRef} className="fill" style={{ visibility: loading ? "hidden" : "visible" }} />
        {loading && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "rgba(11,15,20,.6)", fontSize: 16,
          }}>
            Recherche d’un spot en France…
          </div>
        )}
      </div>

      {/* Mini-carte */}
      <div className={`overlay-map panel ${isLarge ? "large" : "small"}`}>
        <button
          className="overlay-toggle"
          onClick={() => setIsLarge(v => !v)}
          title={isLarge ? "Réduire la mini-carte" : "Agrandir la mini-carte"}
        >
          {isLarge ? "Réduire" : "Agrandir"}
        </button>
        {/* Bouton Revenir au départ */}
        <button
          onClick={resetToStart}
          className="btn"
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 3,
            opacity: loading ? 0.5 : 1,
            pointerEvents: loading ? "none" : "auto",
          }}
          title="Revenir à la position et au point de vue initiaux"
        >
          Revenir au départ
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

      {/* Overlay Résultat (fond uni sombre déjà configuré en CSS) */}
      {showResult && result && (
        <div className="result-overlay">
          <div className="result-card panel">
            <div className="result-header">
              <div className="badge">
                Distance : <b>{(result.km * 1000).toFixed(0)} m</b> ({result.km.toFixed(2)} km)
              </div>
              <div className="badge">Score : <b>{result.score}</b> / 5000</div>
            </div>
            <div className="result-map"><div ref={resultMapDivRef} className="fill" /></div>
            <div className="result-footer">
              <button className="btn" onClick={() => setShowResult(false)}>Fermer</button>
              <button className="btn" onClick={startNewRound}>Manche suivante</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

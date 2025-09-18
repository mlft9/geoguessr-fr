import { useEffect, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const FR_BOUNDS = {
  latMin: 41.3,
  latMax: 51.1,
  lngMin: -5.1,
  lngMax: 9.6,
};

export default function MapWithStreetView() {
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const realMarkerRef = useRef<google.maps.Marker | null>(null);
  const guessMarkerRef = useRef<google.maps.Marker | null>(null);

  const [loading, setLoading] = useState(true);
  const [isLarge, setIsLarge] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    id: "gmaps-sdk",
  });

  // Génère une coordonnée aléatoire dans l’enveloppe FR
  function randomCoords(): google.maps.LatLngLiteral {
    const lat =
      FR_BOUNDS.latMin + (FR_BOUNDS.latMax - FR_BOUNDS.latMin) * Math.random();
    const lng =
      FR_BOUNDS.lngMin + (FR_BOUNDS.lngMax - FR_BOUNDS.lngMin) * Math.random();
    return { lat, lng };
  }

  // Reverse geocoding pour obtenir le pays
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

  // Trouver un pano FR
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

  useEffect(() => {
    if (!isLoaded || !panoDivRef.current || !mapDivRef.current) return;

    const sv = new google.maps.StreetViewService();
    const geocoder = new google.maps.Geocoder();

    // Initialisation mini-carte (centrée sur la France)
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: 46.6, lng: 2.2 },
      zoom: 5,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      backgroundColor: "#0b0f14",
      disableDefaultUI: true,
    });

    // Clic mini-carte -> guess marker (bleu)
    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !mapRef.current) return;
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

    // Recherche pano FR
    (async () => {
      const loc = await findFrenchPanorama(sv, geocoder);
      const chosen = loc?.latLng;

      if (!chosen) {
        setLoading(false);
        console.warn("Aucun panorama FR trouvé après plusieurs essais.");
        return;
      }

      panoRef.current = new google.maps.StreetViewPanorama(panoDivRef.current!, {
        position: chosen,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: false,
        linksControl: true,
        showRoadLabels: true,
        fullscreenControl: false,
      });

      realMarkerRef.current = new google.maps.Marker({
        position: chosen,
        map: mapRef.current!,
        title: "Vraie position",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });

      setLoading(false);
    })();

    return () => {
      mapRef.current = null;
      panoRef.current = null;
      realMarkerRef.current = null;
      guessMarkerRef.current = null;
    };
  }, [isLoaded]);

  // Force Google Maps à recalculer son viewport au resize
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

      {/* Mini-carte avec toggle */}
      <div className={`overlay-map panel ${isLarge ? "large" : "small"}`}>
        <button
          className="overlay-toggle"
          onClick={() => setIsLarge((v) => !v)}
          title={isLarge ? "Réduire la mini-carte" : "Agrandir la mini-carte"}
        >
          {isLarge ? "Réduire" : "Agrandir"}
        </button>
        <div ref={mapDivRef} className="fill" />
      </div>
    </div>
  );
}

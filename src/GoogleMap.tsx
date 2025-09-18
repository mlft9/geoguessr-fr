import { useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const franceBounds = {
  latMin: 41.3,  // Corse sud
  latMax: 51.1,  // Nord
  lngMin: -5.1,  // Bretagne
  lngMax: 9.6,   // Corse est
};

export default function MapWithStreetView() {
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    id: "gmaps-sdk",
  });

  // Fonction utilitaire : génère une coordonnée aléatoire en France
  function randomCoords() {
    const lat =
      franceBounds.latMin +
      (franceBounds.latMax - franceBounds.latMin) * Math.random();
    const lng =
      franceBounds.lngMin +
      (franceBounds.lngMax - franceBounds.lngMin) * Math.random();
    return { lat, lng };
  }

  // Trouver un point Street View valide
  function getRandomStreetView(
    service: google.maps.StreetViewService,
    attempt = 0,
    maxAttempts = 20
  ): Promise<google.maps.StreetViewLocation> {
    return new Promise((resolve, reject) => {
      if (attempt >= maxAttempts) {
        reject(new Error("Impossible de trouver un point Street View"));
        return;
      }

      const coords = randomCoords();

      service.getPanorama(
        { location: coords, radius: 5000 }, // cherche dans un rayon de 5 km
        (data, status) => {
          if (status === google.maps.StreetViewStatus.OK && data?.location) {
            resolve(data.location);
          } else {
            // réessaye
            resolve(getRandomStreetView(service, attempt + 1, maxAttempts));
          }
        }
      );
    });
  }

  useEffect(() => {
    if (!isLoaded || !panoDivRef.current || !mapDivRef.current) return;

    const streetViewService = new google.maps.StreetViewService();

    // Cherche un spawn valide
    getRandomStreetView(streetViewService)
      .then((location) => {
        // Street View plein écran
        panoRef.current = new google.maps.StreetViewPanorama(
          panoDivRef.current!,
          {
            position: location.latLng,
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: false,
            linksControl: true,
            showRoadLabels: true,
            fullscreenControl: false,
          }
        );

        // Mini-carte en bas à droite
        mapRef.current = new google.maps.Map(mapDivRef.current!, {
          center: location.latLng,
          zoom: 6,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          backgroundColor: "#0b0f14",
          disableDefaultUI: true,
        });

        // On ajoute un marker rouge sur la mini-carte pour repérer le spawn
        new google.maps.Marker({
          position: location.latLng,
          map: mapRef.current,
          title: "Position de départ",
        });
      })
      .catch((err) => {
        console.error("Erreur spawn Street View :", err);
      });

    return () => {
      mapRef.current = null;
      panoRef.current = null;
    };
  }, [isLoaded]);

  if (loadError) return <div>Erreur de chargement Google Maps</div>;
  if (!isLoaded) return <div>Chargement…</div>;

  return (
    <div className="stage">
      {/* Street View plein écran */}
      <div className="pano-fill">
        <div ref={panoDivRef} className="fill" />
      </div>

      {/* Mini-carte en bas à droite */}
      <div className="overlay-map panel">
        <div ref={mapDivRef} className="fill" />
      </div>
    </div>
  );
}

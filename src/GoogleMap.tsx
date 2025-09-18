import { useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const center = { lat: 48.8566, lng: 2.3522 }; // Paris

export default function MapWithStreetView() {
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    id: "gmaps-sdk",
  });

  useEffect(() => {
    if (!isLoaded || !panoDivRef.current || !mapDivRef.current) return;

    // 1) Street View en plein écran (couche du dessous)
    panoRef.current = new google.maps.StreetViewPanorama(panoDivRef.current, {
      position: center,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: false,
      linksControl: true,
      showRoadLabels: true,
      fullscreenControl: false,
      motionTracking: false,
      panControl: true,
    });

    // 2) Mini-carte overlay en bas à droite (couche au-dessus)
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: 6,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      backgroundColor: "#0b0f14",
      disableDefaultUI: true,
    });

    // Clic sur la mini-carte => déplacer le pano
    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !panoRef.current) return;
      panoRef.current.setPosition(e.latLng);
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
      <div id="pano-root" className="pano-fill">
        <div ref={panoDivRef} className="fill" />
      </div>

      {/* Mini-carte en bas à droite */}
      <div id="mini-map" className="overlay-map panel">
        <div ref={mapDivRef} className="fill" />
      </div>
    </div>
  );
}

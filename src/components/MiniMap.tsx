// src/components/MiniMap.tsx
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

export type MiniMapHandle = {
  getMap: () => google.maps.Map | null;
  getGuessLatLng: () => google.maps.LatLng | null;
  clearGuess: () => void;
};

type Props = {
  isLoaded: boolean;
  isLarge: boolean;
  onToggleSize: () => void;

  loading: boolean;
  validated: boolean;

  onValidate: () => void;
  onResetToStart: () => void;

  mapStyle?: google.maps.MapTypeStyle[];
};

const MiniMap = forwardRef<MiniMapHandle, Props>(function MiniMap(
  {
    isLoaded,
    isLarge,
    onToggleSize,
    loading,
    validated,
    onValidate,
    onResetToStart,
    mapStyle = [],
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const guessMarkerRef = useRef<google.maps.Marker | null>(null);

  const [isHover, setIsHover] = useState(false);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getGuessLatLng: () => guessMarkerRef.current?.getPosition() ?? null,
    clearGuess: () => {
      guessMarkerRef.current?.setMap(null);
      guessMarkerRef.current = null;
    },
  }));

  // Init carte
  useEffect(() => {
    if (!isLoaded || !containerRef.current || mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
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

    // Click -> poser / déplacer la supposition
    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !mapRef.current) return;
      if (validated) return; // si déjà validé, on ignore les nouveaux clics
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
  }, [isLoaded, mapStyle, validated]);

  // Resize quand la taille change
  useEffect(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    // @ts-ignore
    google.maps.event.trigger(mapRef.current, "resize");
    if (center) mapRef.current.setCenter(center);
  }, [isLarge]);

  return (
    <div
      className={`overlay-map panel ${isLarge ? "xlarge" : isHover ? "large" : "small"}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <button
        className="overlay-toggle"
        onClick={onToggleSize}
        title={isLarge ? "Réduire la mini-carte" : "Agrandir la mini-carte"}
      >
        {isLarge ? "Réduire" : "Agrandir"}
      </button>

      <button
        onClick={onResetToStart}
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

      <div ref={containerRef} className="fill" />
    </div>
  );
});

export default MiniMap;

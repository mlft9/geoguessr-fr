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

  // Gestion fine des listeners
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const clickListenerAttachedRef = useRef(false);

  // 🔑 ref toujours à jour pour l’état "validated"
  const validatedRef = useRef(validated);
  useEffect(() => {
    validatedRef.current = validated;
  }, [validated]);

  const [isHover, setIsHover] = useState(false);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getGuessLatLng: () => guessMarkerRef.current?.getPosition() ?? null,
    clearGuess: () => {
      guessMarkerRef.current?.setMap(null);
      guessMarkerRef.current = null;
    },
  }));

  // 1) Créer la carte si besoin (une fois)
  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;
    if (mapRef.current) return;

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
  }, [isLoaded, mapStyle]);

  // 2) Attacher le listener de clic si la map existe et si pas encore attaché
  useEffect(() => {
    if (!mapRef.current) return;
    if (clickListenerAttachedRef.current) return;

    const clickListener = mapRef.current.addListener(
      "click",
      (e: google.maps.MapMouseEvent) => {
        if (!e.latLng || !mapRef.current) return;
        // lire l’état courant via la ref pour éviter le "stale closure"
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
      }
    );

    listenersRef.current.push(clickListener);
    clickListenerAttachedRef.current = true;
  }, [mapRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup listeners à l’unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach((l) => l.remove());
      listenersRef.current = [];
      clickListenerAttachedRef.current = false;
    };
  }, []);

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
      className={`overlay-map panel ${
        isLarge ? "xlarge" : isHover ? "large" : "small"
      }`}
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

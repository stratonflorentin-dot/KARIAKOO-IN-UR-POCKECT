"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { useI18n } from "@/i18n/client";

export type AppCoordinates = { lat: number; lng: number; accuracy: number };
type LocationContextValue = { position: AppCoordinates | null; requestLocation: () => void };
const LocationContext = createContext<LocationContextValue | null>(null);

export function useAppLocation() {
  const value = useContext(LocationContext);
  if (!value) throw new Error("useAppLocation must be used inside AppLocationProvider.");
  return value;
}

/** Requests browser location while the app is open. Coordinates stay in memory on this device. */
export function AppLocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<AppCoordinates | null>(null);
  const [error, setError] = useState<"denied" | "unavailable" | "unsupported" | null>(null);
  const watchRef = useRef<number | null>(null);
  const { locale } = useI18n();

  const stop = useCallback(() => {
    if (watchRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("unsupported");
      return;
    }
    if (!navigator.geolocation) {
      setError("unsupported");
      return;
    }
    setError(null);
    stop();
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
        setError(null);
      },
      (geoError) => setError(geoError.code === geoError.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 25_000 },
    );
  }, [stop]);

  useEffect(() => {
    // Start promptly so the browser can request permission on first app use.
    const initial = window.setTimeout(requestLocation, 0);
    const onVisibility = () => {
      if (document.visibilityState === "visible") requestLocation();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [requestLocation, stop]);

  const value = useMemo(() => ({ position, requestLocation }), [position, requestLocation]);
  const copy = {
    en: { denied: "Allow location in your browser and device settings to use location features.", unavailable: "Could not read your location. Check that device location is on.", unsupported: "Location needs a secure HTTPS connection and a supported browser.", retry: "Try location again" },
    sw: { denied: "Ruhusu eneo kwenye mipangilio ya kivinjari na kifaa ili kutumia vipengele vya eneo.", unavailable: "Imeshindikana kupata eneo lako. Hakikisha huduma ya eneo imewashwa.", unsupported: "Eneo linahitaji HTTPS na kivinjari kinachotumika.", retry: "Jaribu tena" },
    fr: { denied: "Autorisez la position dans les paramètres du navigateur et de l’appareil pour utiliser ces fonctions.", unavailable: "Position introuvable. Vérifiez que la localisation de l’appareil est activée.", unsupported: "La localisation nécessite HTTPS et un navigateur compatible.", retry: "Réessayer" },
  }[locale];

  return (
    <LocationContext.Provider value={value}>
      {children}
      {error && (
        <aside role="status" className="fixed bottom-4 left-4 z-[1000] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-line bg-white p-3 text-sm shadow-lg sm:bottom-6 sm:left-6">
          <MapPin size={18} className="shrink-0 text-brand-700" aria-hidden="true" />
          <span>{copy[error]}</span>
          {error !== "unsupported" && <button type="button" onClick={requestLocation} className="shrink-0 font-semibold text-brand-700 underline">{copy.retry}</button>}
        </aside>
      )}
    </LocationContext.Provider>
  );
}

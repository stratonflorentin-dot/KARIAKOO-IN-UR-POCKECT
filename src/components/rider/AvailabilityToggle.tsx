"use client";

import { useEffect, useRef, useState } from "react";
import {
  setRiderPresence,
  updateRiderLocation,
} from "@/app/[lang]/rider/actions";

export function AvailabilityToggle({ initialOnline }: { initialOnline: boolean }) {
  const [online, setOnline] = useState(initialOnline);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const heartbeat = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const sharing = useRef(false);

  function stopLocationUpdates() {
    sharing.current = false;
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (heartbeat.current !== null) {
      window.clearInterval(heartbeat.current);
      heartbeat.current = null;
    }
  }

  async function publish(lng: number, lat: number) {
    const now = Date.now();
    if (now - lastSentAt.current < 15_000) return;
    lastSentAt.current = now;
    await updateRiderLocation(lng, lat);
  }

  function startLocationUpdates() {
    if (sharing.current || !("geolocation" in navigator)) return;
    sharing.current = true;
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => void publish(coords.longitude, coords.latitude),
      (err) => {
        setMessage("Live GPS paused. Check browser location permission and device GPS.");
        // If location is denied, stop so the manual "Share live location" button
        // reappears for an explicit permission prompt.
        if (err.code === err.PERMISSION_DENIED) {
          stopLocationUpdates();
          setTracking(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    heartbeat.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => void publish(coords.longitude, coords.latitude),
        () => setMessage("Could not refresh GPS. Check browser location permission and device GPS."),
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
      );
    }, 45_000);
  }

  useEffect(() => () => stopLocationUpdates(), []);

  // An online rider shares live location automatically — including right after
  // accepting a delivery and when returning to the app already online — so
  // customers can track active deliveries without a manual tap. Resumes
  // silently when location permission is already granted.
  useEffect(() => {
    if (online) startLocationUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function enableTracking() {
    if (!("geolocation" in navigator)) {
      setMessage("This browser does not support GPS location.");
      return;
    }
    setPending(true);
    try {
      const initial = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 20_000,
        }),
      );
      const result = await updateRiderLocation(
        initial.coords.longitude,
        initial.coords.latitude,
      );
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      lastSentAt.current = Date.now();
      startLocationUpdates();
      setMessage("Live location sharing is on for active deliveries while this page stays open.");
    } catch {
      setMessage("Allow browser location and turn on device GPS to share live location.");
    } finally {
      setPending(false);
    }
  }

  async function toggle() {
    setPending(true);
    setMessage("");
    try {
      if (!online) {
        if (!("geolocation" in navigator)) {
          setMessage("This browser does not support GPS location.");
          return;
        }
        // Request permission from this user gesture before taking a rider online.
        const initial = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 10_000,
            timeout: 20_000,
          }),
        );
        const result = await setRiderPresence(
          true,
          initial.coords.longitude,
          initial.coords.latitude,
        );
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setOnline(true);
        lastSentAt.current = Date.now();
        startLocationUpdates();
        setMessage("Online. Your live location is shared with customers for active deliveries while this page stays open.");
      } else {
        const result = await setRiderPresence(false);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        stopLocationUpdates();
        setTracking(false);
        setOnline(false);
        setMessage("You are offline.");
      }
    } catch (error) {
      const permissionDenied =
        error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED;
      setMessage(permissionDenied
        ? "Allow location access in your browser and turn on device GPS to go online."
        : "Could not get your GPS location. Check device GPS and try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={online} className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold disabled:opacity-60 sm:px-4 sm:text-sm ${online ? "bg-emerald-600 text-white" : "bg-white/15 text-white/85"}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-white" : "bg-white/50"}`} aria-hidden="true" />
      {pending ? "Saving…" : online ? "Online" : "Offline"}
    </button>
    {online && !tracking && <button type="button" disabled={pending} onClick={enableTracking} className="h-11 shrink-0 whitespace-nowrap rounded-full border border-white/30 px-3 text-xs font-semibold text-white disabled:opacity-60 sm:px-4 sm:text-sm">Share live location</button>}
    <span role="status" aria-live="polite" className="sr-only">{message}</span>
  </div>;
}

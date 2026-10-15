"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/States";
import type { MapStop } from "./RiderMap";

// MapLibre needs the browser (WebGL, window), so it loads client-side only,
// and only on screens that show a map.
const RiderMap = dynamic(() => import("./RiderMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 sm:h-80" />,
});

export function RiderMapLoader({ stops, nextStopIndex }: { stops: MapStop[]; nextStopIndex: number }) {
  if (stops.length === 0) return null;
  return <RiderMap stops={stops} nextStopIndex={nextStopIndex} />;
}

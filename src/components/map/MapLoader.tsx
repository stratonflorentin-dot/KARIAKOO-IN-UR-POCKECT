"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/States";
import type MarketMapType from "./MarketMap";

// MapLibre needs the browser (WebGL, window), so maps load client-side only,
// and only on screens that show one.
const MarketMap = dynamic(() => import("./MarketMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 sm:h-80" />,
});

export function MapLoader(props: ComponentProps<typeof MarketMapType>) {
  if (props.points.length === 0) return null;
  return <MarketMap {...props} />;
}

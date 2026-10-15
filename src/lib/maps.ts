// Map helpers shared by server and client code.

/** Google Maps directions link to [longitude, latitude] (opens the phone's maps app). */
export function directionsUrl(geo: [number, number]): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${geo[1]},${geo[0]}`;
}

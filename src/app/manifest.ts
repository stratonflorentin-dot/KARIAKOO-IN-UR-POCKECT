import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KARIAKOO — In Your Pocket",
    short_name: "Kariakoo",
    description:
      "Soko la Kariakoo Mfukoni Mwako — Nunua kutoka maduka halisi ya Kariakoo na upokee mlangoni kwako Dar es Salaam.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a211a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

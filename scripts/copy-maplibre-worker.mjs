// Copies MapLibre's prebuilt web worker into /public so the browser can load
// it directly. Turbopack can't resolve MapLibre's bundler worker URL (the map
// goes blank), a fix learned from the my-view project. Copying from the
// installed package on every dev/build keeps worker and library versions in
// lockstep.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "maplibre-gl", "dist");
const dest = join(root, "public", "maplibre");
mkdirSync(dest, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs", "maplibre-gl.css"]) {
  copyFileSync(join(src, file), join(dest, file));
}
console.log("MapLibre worker copied to public/maplibre/");

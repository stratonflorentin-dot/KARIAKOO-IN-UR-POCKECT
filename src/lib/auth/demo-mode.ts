// Development-only role preview. `next build` / `next start` set NODE_ENV to
// "production", which permanently disables this switch: the /dev page 404s,
// the server action refuses, and the preview cookie is ignored.
export const DEMO_ROLE_PREVIEW_ENABLED = process.env.NODE_ENV === "development";

export const DEMO_ROLE_COOKIE = "kk_demo_role";

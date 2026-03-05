export const prerender = true;
export const ssr = false; // Leaflet requires client-side only usually, but with dynamic import it's fine. Setting false makes it SPA mode which is safer for map apps.

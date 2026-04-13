# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

The active source code is in `travel_tracker/`. The `app/` directory contains only a pre-built static distribution and is not actively developed.

## Commands

Run from `travel_tracker/`:

```bash
npm run dev        # Start dev server
npm run build      # Build static site to build/
npm run preview    # Preview production build
npm run check      # Svelte + TypeScript type checking
```

No test suite exists.

## Architecture

**SvelteKit** app configured with `@sveltejs/adapter-static` (outputs to `build/`). Single route (`src/routes/+page.svelte`) composing two components: `LeafletMap` and `JourneyPanel`.

### Map rendering (`src/lib/components/LeafletMap.svelte`)

Leaflet is browser-only and must be dynamically imported inside `onMount` to avoid SSR issues. The map loads two GeoJSON layers simultaneously:

- `static/world-atlas.json` — world countries (TopoJSON, converted at load time)
- `static/china-provinces.json` — Chinese provinces as a separate overlay

**China is intentionally excluded from country-level highlighting** in the world layer — it is handled entirely by the province layer instead. Visited countries and provinces are driven by `travelConfig.ts`, not the store.

Journey markers are re-rendered reactively via `$: if (map && $journeyStore) { updateJourneyMarkers(); }` whenever the store changes.

### Coordinate resolution

When a `Journey` has no explicit `coordinates`, `LeafletMap` looks up the location name against `CHINA_PROVINCES` (from `src/lib/data/chinaData.ts`), checking province names first and then city names within each province.

### Antimeridian handling (`src/lib/utils/mapUtils.ts`)

`loadWorldData` converts TopoJSON → GeoJSON and then runs `wrapCoordinates` on every polygon to prevent horizontal artifacts for countries like Russia and Fiji that cross the 180° longitude line.

### State and persistence (`src/lib/utils/journeyStore.ts`)

A Svelte writable store (`journeyStore`) initialized from `localStorage` key `travel_globe_journeys`, falling back to `travelConfig.journeys`. All mutations (add/delete/export) go through the exported functions, not direct store writes. The `$app/environment` `browser` guard prevents any `localStorage` access during SSR.

### Data configuration (`src/lib/data/travelConfig.ts`)

Static source-of-truth for `visitedCountries`, `visitedChinaProvinces`, `visitedChinaCities`, and the default `journeys`. Editing this file changes what is highlighted on the map for a fresh session (before `localStorage` is populated).

### Plugin interface (`src/lib/plugins/types.ts`)

Defines `MapPlugin` / `MapPluginManager` interfaces with `onInit` and `onDestroy` hooks. Not yet wired to any runtime — it is a forward-looking extension point.

### Path alias

`$lib` resolves to `src/lib/` (standard SvelteKit convention).

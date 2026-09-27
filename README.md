# Heliocentric Explorer

> A desktop-first Next.js + Three.js interactive observatory for exploring the Solar System, featuring curated planetary field guides, an accessible Equal Earth country atlas, and responsive 3D navigation.

---

## Overview

**Heliocentric Explorer** balances scientific data with intuitive interactive 3D visualization. Physical distances and planetary diameters span orders of magnitude that make raw-scale exploration unreadable on standard screens. Heliocentric Explorer bridges this gap by combining an **Interactive View** (readable orbital spacing and body scales with accurate AU distance metrics) with fixed-size locator aids, cinematic camera tracking, and deep educational field guides for all eight major planets.

---

## Key Features

- **3D Solar System Observatory**:
  - Built with **Three.js** and **React Three Fiber (R3F)**.
  - Smooth orbit, pan, and zoom controls with camera target focusing.
  - Celestial body rendering with custom shaders, atmospheric glows, axial tilts, and rotation periods.
  - Major moon systems for Mars (Phobos, Deimos), Jupiter (Io, Europa, Ganymede, Callisto), Saturn (Titan, Enceladus), and Neptune (Triton).
  - Minor body layers: an instanced Asteroid Belt, Kuiper Belt particle field, dwarf planets (Ceres, Vesta, Pallas, Juno, Pluto, Eris, Haumea, Makemake), and Comet Halley's elliptical orbit.

- **Adaptive Solar Scale & Locator System**:
  - Intelligent display math ensures inner planets (Mercury, Venus) remain visible outside the Sun's corona while retaining authentic scientific AU readouts.
  - Subpixel and remote bodies feature clickable, fixed-screen-size locator dots and decluttered labels that smoothly yield to 3D geometry once zoomed in.
  - Quick overview presets: **Inner planets** and **All planets** automatically fit bounds to the unobstructed viewport.

- **Eight-World Planetary Field Guides**:
  - Dedicated exploration panels for Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.
  - 34 curated planetary surface and atmospheric highlights linked to scientific missions and USGS/NASA coordinate databases.
  - 3D interactive pins with surface-follow camera tracking that respects planetary axial rotation.
  - Category filters, environment & interior cross-sections, mission milestones, and linked NASA/ESA/USGS reference sources.

- **Interactive Earth Country Atlas**:
  - Full-screen modal atlas powered by an **Equal Earth** projection via **D3-geo** and **TopoJSON**.
  - Searchable directory of 250+ countries and territories by name, capital, or ISO code.
  - Smooth drag-pan and scroll-zoom (up to 24×), keyboard navigation with roving tab stops, and boundary highlighting.
  - **"Fly to globe"**: One-click transition from 2D atlas selection to high-resolution 3D geographic globe coordinates.
  - Earth features multi-layer maps: daytime terrain, normal bump mapping, specular ocean reflection, dynamic night lights with Sun-aligned day/night terminator, and drifting cloud layers.

- **Temporal Simulation Controls**:
  - Play, pause, and variable speed scaling (0.25×, 1×, 8×, and 64× simulated Earth days per real second).
  - Full timeline scrubbing across an Earth year directly from the temporal control dock.
  - Visual layer toggles: orbital paths, body labels, atmospheric glows, and orbital motion trails.

- **Resilient 3D Asset Architecture**:
  - Independent `SceneAssetBoundary` wrapping: isolated Suspense boundaries ensure remote texture load delays or failures do not crash the scene.
  - Procedural colored fallback materials and texture reload prompts keep controls and celestial navigation interactive under all network conditions.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router), React 19 |
| **3D Rendering** | [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/), [@react-three/drei](https://github.com/pmndrs/drei) |
| **Geospatial & Cartography** | [d3-geo](https://github.com/d3/d3-geo), [topojson-client](https://github.com/topojson/topojson-client) |
| **Icons & Styling** | [Lucide React](https://lucide.dev/), Scoped CSS Modules, Vanilla CSS |
| **Language & Tooling** | TypeScript 5.8, Node.js native test runner (`node:test`), tsx, ESLint |

---

## Project Structure

```text
Solar_System/
├── src/
│   ├── app/
│   │   ├── globals.css                # Global theme tokens, typography, and viewport reset
│   │   ├── layout.tsx                 # Root HTML shell and SEO metadata
│   │   └── page.tsx                   # Main entry point mounting the SolarSystem component
│   ├── components/
│   │   ├── BodyLocators.tsx           # 2D fixed-size locator dots and decluttered labels
│   │   ├── EarthAtlas.tsx             # Fullscreen Equal Earth modal map & country index
│   │   ├── EarthAtlas.module.css      # Scoped styling for the atlas modal & controls
│   │   ├── PlanetExplorerPanel.tsx    # Eight-world field guide, feature search & science panel
│   │   ├── PlanetExplorerPanel.module.css # Scoped styles for the exploration drawer
│   │   ├── SceneAssetBoundary.tsx     # Suspense and error boundary for robust asset loading
│   │   ├── SolarMaterial.tsx          # Custom Sun surface and corona shader materials
│   │   └── SolarSystem.tsx            # Primary 3D canvas, orbit physics, camera rig & HUD
│   └── lib/
│       ├── earth-atlas.ts             # TopoJSON parsing, Equal Earth math, country joins & search
│       ├── earth-atlas.test.ts        # Unit tests for atlas projection, clipping & joins
│       ├── planet-exploration.ts      # Curated features, coordinate databases & planet facts
│       ├── planet-exploration.test.ts # Data integrity tests for all 34 planetary features
│       ├── scene-navigation.ts        # Camera tracking, coordinate conversions & surface quaternions
│       ├── scene-navigation.test.ts   # Navigation, rotation follow & boundary tests
│       ├── solar-scale.ts             # Display radius, orbital spacing, framing & projection math
│       └── solar-scale.test.ts        # Scale regression, corona clearance & frustum tests
├── public/                            # Static assets and texture fallbacks
├── eslint.config.mjs                  # Modern ESLint configuration
├── next.config.ts                     # Next.js build settings
├── package.json                       # Dependencies, scripts and package metadata
├── tsconfig.json                      # Strict TypeScript compiler configuration
└── README.md                          # Project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js**: v20+ (recommended v22 or later)
- **npm**: v10+

### Installation

```bash
git clone <repository-url>
cd Solar_System
npm install
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Tip**: The observatory opens by default in paused **Earth focus mode** with the Earth field guide active. Click **Whole planet**, **SYSTEM**, or **RESET VIEW** in the HUD to transition to the wider solar system view.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js local development server on port 3000. |
| `npm run build` | Builds the optimized production application. |
| `npm run start` | Runs the compiled Next.js production server. |
| `npm run lint` | Runs ESLint across all TypeScript and React files. |
| `npm test` | Executes the unit test suite using Node's native test runner with `tsx`. |

---

## Exploration Guide

1. **Orbit & Inspect**: Drag with the primary mouse button to rotate the camera around the active target. Scroll to zoom in and out. Click any celestial body to center and inspect it.
2. **Field Guides**: Click **Explore [planet] in detail** from the bottom planetary dock to open the curated guide.
3. **Surface Pins**: Select any landmark from the field guide or click pins directly on rocky bodies. The camera will smoothly frame the target while locking to surface rotation.
4. **World Atlas (Earth)**: Choose **Countries & world map** to launch the Equal Earth atlas. Search any country, territory, or capital, then click **Fly to globe** to transition back to the 3D globe centered on that nation.
5. **System Presets**: Use **Focus Sun**, **Inner planets**, or **All planets** to adjust overview bounds without losing track of distant worlds.
6. **Time & Visual Layers**: Expand the lower-left drawer to alter simulation speed, scrub through the calendar year, toggle motion trails, or activate an inspection fill light.

---

## Scientific Limits and Attribution

- **Planetary Mapping & Terrain**:
  - Rocky planet pins (Mercury, Venus, Mars) are mapped from authoritative USGS Astrogeology and NASA surveys. Venus features represent radar-mapped topography (Magellan mission) rather than optical cloud photography.
  - Gas and ice giants (Jupiter, Saturn, Uranus, Neptune) do not possess rigid solid surfaces. Atmospheric pins represent approximate latitude belts and schematic longitudes; dynamic cloud features drift over time.
- **Cartographic Data**:
  - Country boundaries: [Natural Earth / world-atlas](https://github.com/topojson/world-atlas) (`countries-50m.json`, 1:50M generalized scale; 3D globe uses `countries-110m.json`). Public domain / ISC license.
  - Country metadata: [mledoze/countries](https://github.com/mledoze/countries), licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Country counts reflect joined datasets and do not imply political endorsement.
- **Imagery & Textures**:
  - Planetary maps derived from NASA/JPL/SSI, [Solar System Scope](https://www.solarsystemscope.com/textures/) (licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), and [Three.js planet examples](https://threejs.org/examples/textures/planets/).
  - Textures provide global context and are not high-resolution ground terrain renderers.
- **Orbital Mechanics**:
  - Bodies move according to their true orbital periods and semi-major axes. However, this is an interactive educational model with padded display scaling, not a high-precision astronomical ephemeris.

---

## Validation & Testing

Run the test suite and linters to verify codebase health:

```bash
npm run lint
npm test
npm run build
```

- **Unit Suite**: Validates antimeridian polygon clipping, geometry hole handling, country metadata joins, zoom clamps, geographic coordinate transforms, and planetary feature integrity.
- **Scale Regression Suite**: Validates Mercury/Venus clearance from solar corona bounds, non-intersecting planetary envelopes, HUD-safe overview framing, adaptive near/far depth clipping, and locator label decluttering.

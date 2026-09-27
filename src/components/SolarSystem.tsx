"use client";

import dynamic from "next/dynamic";
import PlanetExplorerPanel from "./PlanetExplorerPanel";
import { PLANET_EXPLORATION, type ExplorablePlanet, type PlanetFeature } from "@/lib/planet-exploration";
import { surfacePoint, surfaceCoordinates, coordinatesLabel, flightProgress, closeupDistances, followSurfaceFrame, type GeographicTarget } from "@/lib/scene-navigation";
import { AU_SCALE, SCENE_UNITS_PER_KM, SUN_CORONA_MULTIPLIER, bodyRadius, orbitRadius, overviewFrame, cameraClipping, type ScaleMode, type OverviewMode } from "@/lib/solar-scale";
import { BodyLocators, LocatorUpdater } from "./BodyLocators";
import { SceneAssetBoundary } from "./SceneAssetBoundary";
import SolarMaterial from "./SolarMaterial";
import {
  AdaptiveDpr,
  Html,
  Line,
  OrbitControls,
  Stars,
  Trail,
  useTexture,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { feature as topoFeature } from "topojson-client";
import {
  Activity,
  ChevronRight,
  Clock3,
  Crosshair,
  Database,
  Eye,
  Globe2,
  Info,
  Map,
  Maximize2,
  Moon,
  MousePointer2,
  Navigation,
  Pause,
  Play,
  Rotate3d,
  Settings2,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import type { ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type MutableRefObject,
} from "react";

const EarthAtlas = dynamic(() => import("./EarthAtlas"), { ssr: false });
type ExplorationMode = "system" | ExplorablePlanet;
type SurfaceTarget = GeographicTarget & { bodyId: ExplorablePlanet; id: string };
const isExplorable = (id: string): id is ExplorablePlanet => Object.hasOwn(PLANET_EXPLORATION, id);
type PlanetId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "phobos"
  | "deimos"
  | "io"
  | "europa"
  | "ganymede"
  | "callisto"
  | "titan"
  | "enceladus"
  | "triton"
  | "ceres"
  | "vesta"
  | "pallas"
  | "juno"
  | "pluto"
  | "eris"
  | "haumea"
  | "makemake"
  | "asteroid-belt"
  | "kuiper-belt"
  | "halley";

type PlanetDefinition = {
  id: PlanetId;
  name: string;
  code: string;
  type: string;
  distanceAU: number;
  radiusKm: number;
  orbitalPeriod: number;
  rotationPeriod: number;
  moons: number;
  temperature: string;
  mass: string;
  color: string;
  accent: string;
  texture: string;
  description: string;
  facts: string[];
  atmosphere?: string;
  inclination: number;
  phase: number;
};

type MajorMoonDefinition = PlanetDefinition & {
  parent: "mars" | "jupiter" | "saturn" | "neptune";
  orbitRadiusKm: number;
};

type Location = {
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  country: string;
  timezone: string;
  fact: string;
};

type GeoFeature = {
  type: "Feature";
  properties?: {
    ADMIN?: string;
    NAME?: string;
    name?: string;
  };
  geometry?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
};

const TEXTURE_ROOT = "https://threejs.org/examples/textures/planets/";
const PLANET_TEXTURE_ROOT =
  "https://raw.githubusercontent.com/ncdev2015/3D-Solar-System-Threejs/master/public/resources/images/";
const GAS_GIANT_TEXTURE_ROOT =
  "https://raw.githubusercontent.com/pcwilliams/solarsystem/main/SolarSystem/Textures/";
const EARTH_BORDER_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const PLANETS: PlanetDefinition[] = [
  {
    id: "mercury",
    name: "Mercury",
    code: "MERCURY / I",
    type: "Terrestrial planet",
    distanceAU: 0.387,
    radiusKm: 2_439.7,
    orbitalPeriod: 87.97,
    rotationPeriod: 58.646,
    moons: 0,
    temperature: "167 °C mean",
    mass: "3.3011 × 10²³ kg",
    color: "#9c9b97",
    accent: "#b6aaa3",
    texture: `${GAS_GIANT_TEXTURE_ROOT}mercury_2k.jpg`,
    description:
      "A cratered world locked in a 3:2 spin–orbit resonance with the Sun.",
    facts: ["Fastest orbit in the system", "No substantial atmosphere", "Core is 85% of its radius"],
    atmosphere: "Trace exosphere",
    inclination: 0.06,
    phase: 0.8,
  },
  {
    id: "venus",
    name: "Venus",
    code: "VENUS / II",
    type: "Terrestrial planet",
    distanceAU: 0.723,
    radiusKm: 6_051.8,
    orbitalPeriod: 224.7,
    rotationPeriod: -243.025,
    moons: 0,
    temperature: "464 °C mean",
    mass: "4.8675 × 10²⁴ kg",
    color: "#d69b55",
    accent: "#f5c777",
    texture: `${GAS_GIANT_TEXTURE_ROOT}venus_2k.jpg`,
    description:
      "A cloud-shrouded greenhouse world with the densest atmosphere of any rocky planet.",
    facts: ["Hottest planetary surface", "Retrograde rotation", "Sulfuric-acid clouds"],
    atmosphere: "96.5% carbon dioxide",
    inclination: 0.03,
    phase: 2.4,
  },
  {
    id: "earth",
    name: "Earth",
    code: "EARTH / III",
    type: "Ocean planet",
    distanceAU: 1,
    radiusKm: 6_371,
    orbitalPeriod: 365.256,
    rotationPeriod: 0.99727,
    moons: 1,
    temperature: "14 °C mean",
    mass: "5.9722 × 10²⁴ kg",
    color: "#2f82bc",
    accent: "#66d0d8",
    texture: `${TEXTURE_ROOT}earth_atmos_2048.jpg`,
    description:
      "A living blue world with liquid oceans, a nitrogen-rich atmosphere, and a constantly changing surface.",
    facts: ["71% surface covered by ocean", "Only known world with life", "Active plate tectonics"],
    atmosphere: "78% nitrogen / 21% oxygen",
    inclination: 0.00005,
    phase: 4.1,
  },
  {
    id: "mars",
    name: "Mars",
    code: "MARS / IV",
    type: "Terrestrial planet",
    distanceAU: 1.524,
    radiusKm: 3_389.5,
    orbitalPeriod: 686.98,
    rotationPeriod: 1.026,
    moons: 2,
    temperature: "−63 °C mean",
    mass: "6.4171 × 10²³ kg",
    color: "#ad4e32",
    accent: "#ee835e",
    texture: `${GAS_GIANT_TEXTURE_ROOT}mars_2k.jpg`,
    description:
      "A cold desert planet sculpted by ancient water, dust storms, volcanoes, and polar ice.",
    facts: ["Olympus Mons is the tallest volcano", "Day is 24h 39m", "Two irregular moons"],
    atmosphere: "95% carbon dioxide",
    inclination: 0.032,
    phase: 5.2,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    code: "JUPITER / V",
    type: "Gas giant",
    distanceAU: 5.203,
    radiusKm: 69_911,
    orbitalPeriod: 4_332.59,
    rotationPeriod: 0.41354,
    moons: 95,
    temperature: "−110 °C cloud tops",
    mass: "1.8982 × 10²⁷ kg",
    color: "#c08a68",
    accent: "#f0c29b",
    texture: `${GAS_GIANT_TEXTURE_ROOT}jupiter_2k.jpg`,
    description:
      "A striped hydrogen giant whose Great Red Spot has been raging for centuries.",
    facts: ["Largest planet", "Powerful magnetosphere", "Great Red Spot is a storm"],
    atmosphere: "89% hydrogen / 10% helium",
    inclination: 0.023,
    phase: 1.1,
  },
  {
    id: "saturn",
    name: "Saturn",
    code: "SATURN / VI",
    type: "Gas giant",
    distanceAU: 9.537,
    radiusKm: 58_232,
    orbitalPeriod: 10_759.22,
    rotationPeriod: 0.44401,
    moons: 146,
    temperature: "−140 °C cloud tops",
    mass: "5.6834 × 10²⁶ kg",
    color: "#d2b47e",
    accent: "#ffe1a3",
    texture: `${GAS_GIANT_TEXTURE_ROOT}saturn_2k.jpg`,
    description:
      "The ringed jewel of the system, with thousands of icy fragments shepherded by moons.",
    facts: ["Least dense planet", "Seven major ring groups", "Titan has a thick atmosphere"],
    atmosphere: "96% hydrogen / 3% helium",
    inclination: 0.043,
    phase: 3.45,
  },
  {
    id: "uranus",
    name: "Uranus",
    code: "URANUS / VII",
    type: "Ice giant",
    distanceAU: 19.191,
    radiusKm: 25_362,
    orbitalPeriod: 30_688.5,
    rotationPeriod: -0.71833,
    moons: 28,
    temperature: "−195 °C cloud tops",
    mass: "8.6810 × 10²⁵ kg",
    color: "#8bd2d1",
    accent: "#b8f0e8",
    texture: `${GAS_GIANT_TEXTURE_ROOT}uranus_2k.jpg`,
    description:
      "An ice giant tipped on its side, rolling through its long, blue-green seasons.",
    facts: ["Axial tilt is 97.8°", "Faint dark ring system", "Coldest planetary atmosphere"],
    atmosphere: "Hydrogen, helium, methane",
    inclination: 0.013,
    phase: 5.9,
  },
  {
    id: "neptune",
    name: "Neptune",
    code: "NEPTUNE / VIII",
    type: "Ice giant",
    distanceAU: 30.069,
    radiusKm: 24_622,
    orbitalPeriod: 60_182,
    rotationPeriod: 0.67125,
    moons: 16,
    temperature: "−200 °C cloud tops",
    mass: "1.0241 × 10²⁶ kg",
    color: "#4169c8",
    accent: "#80a5ff",
    texture: `${GAS_GIANT_TEXTURE_ROOT}neptune_2k.jpg`,
    description:
      "A deep-blue ice giant with supersonic winds and storms that appear and fade over time.",
    facts: ["Fastest winds measured", "Triton orbits backwards", "Discovered mathematically"],
    atmosphere: "Hydrogen, helium, methane",
    inclination: 0.031,
    phase: 0.25,
  },
];

const MOON_DEFINITION: PlanetDefinition = {
  id: "moon",
  name: "The Moon",
  code: "LUNA / EARTH I",
  type: "Natural satellite",
  distanceAU: 0.00257,
  radiusKm: 1_737.4,
  orbitalPeriod: 27.3217,
  rotationPeriod: 27.3217,
  moons: 0,
  temperature: "−20 °C mean",
  mass: "7.342 × 10²² kg",
  color: "#b7b3a9",
  accent: "#e0d7c8",
  texture: `${TEXTURE_ROOT}moon_1024.jpg`,
  description:
    "Earth’s tidally locked companion, whose surface preserves billions of years of impact history.",
  facts: ["Raises Earth’s tides", "Same face always points to Earth", "Footprints can last millions of years"],
  atmosphere: "Practically airless exosphere",
  inclination: 0,
  phase: 0,
};

const MINOR_BODIES: PlanetDefinition[] = [
  {
    id: "ceres",
    name: "Ceres",
    code: "CERES / DWARF",
    type: "Dwarf planet / asteroid belt",
    distanceAU: 2.767,
    radiusKm: 469.7,
    orbitalPeriod: 1_680.5,
    rotationPeriod: 0.378,
    moons: 0,
    temperature: "−105 °C mean",
    mass: "9.3835 × 10²⁰ kg",
    color: "#857e73",
    accent: "#d8c7aa",
    texture: "",
    description:
      "The largest object in the asteroid belt and the only dwarf planet in the inner Solar System.",
    facts: ["Water ice deposits", "Round under its own gravity", "Visited by NASA’s Dawn mission"],
    atmosphere: "Transient water vapor",
    inclination: 0.059,
    phase: 2.15,
  },
  {
    id: "vesta",
    name: "Vesta",
    code: "VESTA / 4",
    type: "Differentiated asteroid",
    distanceAU: 2.362,
    radiusKm: 262.7,
    orbitalPeriod: 1_325.6,
    rotationPeriod: 0.222,
    moons: 0,
    temperature: "−100 °C mean",
    mass: "2.5908 × 10²⁰ kg",
    color: "#81776c",
    accent: "#e1b78e",
    texture: "",
    description:
      "A bright, battered protoplanet with a huge south-polar impact basin and a layered interior.",
    facts: ["Second-most massive asteroid", "Has a basaltic crust", "Dawn orbited Vesta"],
    atmosphere: "None",
    inclination: 0.062,
    phase: 5.1,
  },
  {
    id: "pallas",
    name: "Pallas",
    code: "PALLAS / 2",
    type: "Carbonaceous asteroid",
    distanceAU: 2.773,
    radiusKm: 256,
    orbitalPeriod: 1_686.5,
    rotationPeriod: 0.325,
    moons: 0,
    temperature: "−105 °C mean",
    mass: "2.04 × 10²⁰ kg",
    color: "#686b69",
    accent: "#b7c4bd",
    texture: "",
    description:
      "A tilted, primitive world whose unusually inclined orbit makes it a standout member of the belt.",
    facts: ["Discovered in 1802", "High orbital inclination", "Likely hydrated minerals"],
    atmosphere: "None",
    inclination: 0.192,
    phase: 4.35,
  },
  {
    id: "juno",
    name: "Juno",
    code: "JUNO / 3",
    type: "Stony asteroid",
    distanceAU: 2.67,
    radiusKm: 117,
    orbitalPeriod: 1_591.6,
    rotationPeriod: 0.147,
    moons: 0,
    temperature: "−110 °C mean",
    mass: "2.67 × 10¹⁹ kg",
    color: "#8f7c70",
    accent: "#d8a489",
    texture: "",
    description:
      "A large, reflective rocky asteroid with a complex, heavily cratered surface.",
    facts: ["One of the brightest asteroids", "Stony S-type composition", "Discovered in 1804"],
    atmosphere: "None",
    inclination: 0.226,
    phase: 1.3,
  },
  {
    id: "pluto",
    name: "Pluto",
    code: "PLUTO / DWARF",
    type: "Dwarf planet / Kuiper belt",
    distanceAU: 39.482,
    radiusKm: 1_188.3,
    orbitalPeriod: 90_560,
    rotationPeriod: -6.387,
    moons: 5,
    temperature: "−229 °C mean",
    mass: "1.303 × 10²² kg",
    color: "#a88873",
    accent: "#f0c7a1",
    texture: "",
    description:
      "A complex icy world with nitrogen glaciers, a heart-shaped basin, and a companion system of moons.",
    facts: ["Sputnik Planitia glacier", "Charon is tidally locked", "New Horizons flyby in 2015"],
    atmosphere: "Nitrogen, methane, carbon monoxide",
    inclination: 0.42,
    phase: 3.1,
  },
  {
    id: "eris",
    name: "Eris",
    code: "ERIS / DWARF",
    type: "Dwarf planet / scattered disk",
    distanceAU: 67.78,
    radiusKm: 1_163,
    orbitalPeriod: 203_830,
    rotationPeriod: 1.08,
    moons: 1,
    temperature: "−243 °C estimate",
    mass: "1.6466 × 10²² kg",
    color: "#bfc6c7",
    accent: "#edf5f2",
    texture: "",
    description:
      "A distant, reflective dwarf planet whose discovery helped redefine what it means to be a planet.",
    facts: ["Highly eccentric orbit", "Moon named Dysnomia", "More massive than Pluto"],
    atmosphere: "Seasonal nitrogen frost",
    inclination: 0.442,
    phase: 5.25,
  },
  {
    id: "haumea",
    name: "Haumea",
    code: "HAUMEA / DWARF",
    type: "Fast-spinning dwarf planet",
    distanceAU: 43.13,
    radiusKm: 816,
    orbitalPeriod: 103_774,
    rotationPeriod: 0.163,
    moons: 2,
    temperature: "−241 °C estimate",
    mass: "4.006 × 10²¹ kg",
    color: "#b3bcc0",
    accent: "#e1eff2",
    texture: "",
    description:
      "An elongated, rapidly spinning icy body with a ring and two known moons.",
    facts: ["Day lasts under four hours", "Collisional family", "Has a thin ring"],
    atmosphere: "None detected",
    inclination: 0.46,
    phase: 0.55,
  },
  {
    id: "makemake",
    name: "Makemake",
    code: "MAKEMAKE / DWARF",
    type: "Dwarf planet / Kuiper belt",
    distanceAU: 45.79,
    radiusKm: 715,
    orbitalPeriod: 113_183,
    rotationPeriod: 0.948,
    moons: 1,
    temperature: "−239 °C estimate",
    mass: "3.1 × 10²¹ kg",
    color: "#b67d68",
    accent: "#e9b18e",
    texture: "",
    description:
      "A reddish Kuiper belt world coated in volatile ices and accompanied by a small moon.",
    facts: ["Discovered near Easter 2005", "Methane and ethane ices", "Moon nicknamed MK2"],
    atmosphere: "Possible seasonal atmosphere",
    inclination: 0.28,
    phase: 2.7,
  },
];

const MAJOR_MOONS: MajorMoonDefinition[] = [
  {
    id: "phobos",
    name: "Phobos",
    code: "MARS I",
    type: "Natural satellite",
    distanceAU: 1.524,
    radiusKm: 11.1,
    orbitalPeriod: 0.319,
    rotationPeriod: 0.319,
    moons: 0,
    temperature: "−40 °C mean",
    mass: "1.0659 × 10¹⁶ kg",
    color: "#776b60",
    accent: "#c4a98c",
    texture: "",
    description: "A dark, irregular moon racing around Mars three times each Martian day.",
    facts: ["Orbits inside synchronous orbit", "May be a captured asteroid", "Future impact or breakup likely"],
    atmosphere: "None",
    inclination: 0.02,
    phase: 0.8,
    parent: "mars",
    orbitRadiusKm: 9_376,
  },
  {
    id: "deimos",
    name: "Deimos",
    code: "MARS II",
    type: "Natural satellite",
    distanceAU: 1.524,
    radiusKm: 6.2,
    orbitalPeriod: 1.263,
    rotationPeriod: 1.263,
    moons: 0,
    temperature: "−40 °C mean",
    mass: "1.4762 × 10¹⁵ kg",
    color: "#92867a",
    accent: "#e0c4a6",
    texture: "",
    description: "The smaller and smoother outer moon of Mars, shaped by ancient impacts.",
    facts: ["Rises in the west on Mars", "Likely captured asteroid", "Irregular, lumpy silhouette"],
    atmosphere: "None",
    inclination: 0.04,
    phase: 2.1,
    parent: "mars",
    orbitRadiusKm: 23_463,
  },
  {
    id: "io",
    name: "Io",
    code: "JUPITER I",
    type: "Volcanic natural satellite",
    distanceAU: 5.203,
    radiusKm: 1_821.6,
    orbitalPeriod: 1.769,
    rotationPeriod: 1.769,
    moons: 0,
    temperature: "−130 °C mean",
    mass: "8.9319 × 10²² kg",
    color: "#d2b44f",
    accent: "#ffed8d",
    texture: "",
    description: "A sulfur-stained volcanic world constantly flexed by Jupiter’s gravity and its neighboring moons.",
    facts: ["Most volcanically active body", "Hundreds of active volcanoes", "Thin sulfur dioxide atmosphere"],
    atmosphere: "Sulfur dioxide",
    inclination: 0.01,
    phase: 0.2,
    parent: "jupiter",
    orbitRadiusKm: 421_700,
  },
  {
    id: "europa",
    name: "Europa",
    code: "JUPITER II",
    type: "Ocean world",
    distanceAU: 5.203,
    radiusKm: 1_560.8,
    orbitalPeriod: 3.551,
    rotationPeriod: 3.551,
    moons: 0,
    temperature: "−160 °C mean",
    mass: "4.7998 × 10²² kg",
    color: "#b9a98d",
    accent: "#e6d8c1",
    texture: "",
    description: "A cracked ice shell hides a global salty ocean that could be habitable.",
    facts: ["Global subsurface ocean", "Red-brown lineae", "Target of Europa Clipper"],
    atmosphere: "Oxygen exosphere",
    inclination: 0.02,
    phase: 2.4,
    parent: "jupiter",
    orbitRadiusKm: 671_034,
  },
  {
    id: "ganymede",
    name: "Ganymede",
    code: "JUPITER III",
    type: "Icy natural satellite",
    distanceAU: 5.203,
    radiusKm: 2_634.1,
    orbitalPeriod: 7.155,
    rotationPeriod: 7.155,
    moons: 0,
    temperature: "−160 °C mean",
    mass: "1.4819 × 10²³ kg",
    color: "#8e8b83",
    accent: "#cfc8b7",
    texture: "",
    description: "The largest moon in the Solar System, with its own intrinsic magnetic field.",
    facts: ["Larger than Mercury", "Only moon with a magnetic field", "Layered ocean system"],
    atmosphere: "Oxygen exosphere",
    inclination: 0.03,
    phase: 4.8,
    parent: "jupiter",
    orbitRadiusKm: 1_070_412,
  },
  {
    id: "callisto",
    name: "Callisto",
    code: "JUPITER IV",
    type: "Cratered natural satellite",
    distanceAU: 5.203,
    radiusKm: 2_410.3,
    orbitalPeriod: 16.689,
    rotationPeriod: 16.689,
    moons: 0,
    temperature: "−139 °C mean",
    mass: "1.0759 × 10²³ kg",
    color: "#756f68",
    accent: "#b7aaa0",
    texture: "",
    description: "A heavily cratered outer moon with an ancient surface and a possible buried ocean.",
    facts: ["Valhalla impact basin", "Far outside Jupiter’s radiation belts", "Potential future outpost site"],
    atmosphere: "Carbon dioxide exosphere",
    inclination: 0.04,
    phase: 1.6,
    parent: "jupiter",
    orbitRadiusKm: 1_882_709,
  },
  {
    id: "titan",
    name: "Titan",
    code: "SATURN VI",
    type: "Atmospheric natural satellite",
    distanceAU: 9.537,
    radiusKm: 2_574.7,
    orbitalPeriod: 15.945,
    rotationPeriod: 15.945,
    moons: 0,
    temperature: "−179 °C mean",
    mass: "1.3452 × 10²³ kg",
    color: "#c99755",
    accent: "#ffd083",
    texture: "",
    description: "A hazy world with methane rain, rivers, lakes, seas, and a buried water ocean.",
    facts: ["Dense nitrogen atmosphere", "Liquid methane lakes", "Dragonfly mission target"],
    atmosphere: "98.4% nitrogen",
    inclination: 0.02,
    phase: 3.2,
    parent: "saturn",
    orbitRadiusKm: 1_221_870,
  },
  {
    id: "enceladus",
    name: "Enceladus",
    code: "SATURN II",
    type: "Cryovolcanic natural satellite",
    distanceAU: 9.537,
    radiusKm: 252.1,
    orbitalPeriod: 1.37,
    rotationPeriod: 1.37,
    moons: 0,
    temperature: "−201 °C mean",
    mass: "1.0802 × 10²⁰ kg",
    color: "#dce7e7",
    accent: "#ffffff",
    texture: "",
    description: "A bright icy moon venting water-rich plumes from a hidden subsurface ocean.",
    facts: ["Tiger stripe fractures", "Water vapor plumes", "Freshest surface in the system"],
    atmosphere: "Water vapor plume",
    inclination: 0.01,
    phase: 5.4,
    parent: "saturn",
    orbitRadiusKm: 238_020,
  },
  {
    id: "triton",
    name: "Triton",
    code: "NEPTUNE I",
    type: "Captured natural satellite",
    distanceAU: 30.069,
    radiusKm: 1_353.4,
    orbitalPeriod: 5.877,
    rotationPeriod: 5.877,
    moons: 0,
    temperature: "−235 °C mean",
    mass: "2.139 × 10²² kg",
    color: "#b5a9a0",
    accent: "#e8d0c6",
    texture: "",
    description: "Neptune’s largest moon, orbiting backwards with active nitrogen geysers.",
    facts: ["Retrograde orbit", "Likely captured Kuiper object", "Young icy surface"],
    atmosphere: "Nitrogen, methane",
    inclination: 0.1,
    phase: 4.1,
    parent: "neptune",
    orbitRadiusKm: 354_759,
  },
];

const ASTEROID_BELT_DEFINITION: PlanetDefinition = {
  id: "asteroid-belt",
  name: "Asteroid Belt",
  code: "MINOR BODIES / 2.1–3.3 AU",
  type: "Rocky debris field",
  distanceAU: 2.7,
  radiusKm: 0,
  orbitalPeriod: 1_500,
  rotationPeriod: 0,
  moons: 0,
  temperature: "−100 °C class",
  mass: "≈ 3% of the Moon",
  color: "#9d846c",
  accent: "#e2b27d",
  texture: "",
  description:
    "A broad population of rocky remnants orbiting between Mars and Jupiter, including Ceres and Vesta.",
  facts: ["Mostly empty space", "Jupiter shapes the belt", "Remnant of planet formation"],
  atmosphere: "None",
  inclination: 0.04,
  phase: 0,
};

const KUIPER_BELT_DEFINITION: PlanetDefinition = {
  id: "kuiper-belt",
  name: "Kuiper Belt",
  code: "MINOR BODIES / 30–50 AU",
  type: "Icy debris field",
  distanceAU: 40,
  radiusKm: 0,
  orbitalPeriod: 90_000,
  rotationPeriod: 0,
  moons: 0,
  temperature: "−230 °C class",
  mass: "Unknown",
  color: "#7896bd",
  accent: "#a9d7ff",
  texture: "",
  description:
    "A cold, ancient reservoir of icy bodies beyond Neptune, home to Pluto and other dwarf planets.",
  facts: ["Neptune’s resonances", "Source of short-period comets", "Extends beyond Neptune"],
  atmosphere: "None",
  inclination: 0.08,
  phase: 0,
};

const HALLEY_DEFINITION: PlanetDefinition = {
  id: "halley",
  name: "Comet Halley",
  code: "1P / HALLEY",
  type: "Periodic comet",
  distanceAU: 17.94,
  radiusKm: 5.5,
  orbitalPeriod: 27_375,
  rotationPeriod: 2.2,
  moons: 0,
  temperature: "Variable / active",
  mass: "2.2 × 10¹⁴ kg",
  color: "#d9d2c3",
  accent: "#b8eeff",
  texture: "",
  description:
    "The most famous periodic comet, returning to the inner Solar System roughly every 76 years.",
  facts: ["Last perihelion: 1986", "Next perihelion: 2061", "Nucleus is a dark snowball"],
  atmosphere: "Dust and ion coma",
  inclination: 0.6,
  phase: 1.4,
};

const SUN_DEFINITION: PlanetDefinition = {
  id: "sun",
  name: "The Sun",
  code: "SOL / G2V",
  type: "G-type main-sequence star",
  distanceAU: 0,
  radiusKm: 695_700,
  orbitalPeriod: 0,
  rotationPeriod: 25.05,
  moons: 0,
  temperature: "5,500 °C photosphere",
  mass: "1.989 × 10³⁰ kg",
  color: "#ffb13b",
  accent: "#ffdf8a",
  texture: `${PLANET_TEXTURE_ROOT}sun.jpg`,
  description:
    "The star at the center of our system, holding 99.86% of its total mass and driving every orbit.",
  facts: ["4.6 billion years old", "Light takes 8m 20s to reach Earth", "Fuses hydrogen into helium"],
  atmosphere: "Corona / plasma",
  inclination: 0,
  phase: 0,
};

const LOCATOR_BODIES = [SUN_DEFINITION, ...PLANETS];

const BODY_BY_ID: Record<PlanetId, PlanetDefinition> = {
  sun: SUN_DEFINITION,
  mercury: PLANETS[0],
  venus: PLANETS[1],
  earth: PLANETS[2],
  moon: MOON_DEFINITION,
  mars: PLANETS[3],
  jupiter: PLANETS[4],
  saturn: PLANETS[5],
  uranus: PLANETS[6],
  neptune: PLANETS[7],
  phobos: MAJOR_MOONS[0],
  deimos: MAJOR_MOONS[1],
  io: MAJOR_MOONS[2],
  europa: MAJOR_MOONS[3],
  ganymede: MAJOR_MOONS[4],
  callisto: MAJOR_MOONS[5],
  titan: MAJOR_MOONS[6],
  enceladus: MAJOR_MOONS[7],
  triton: MAJOR_MOONS[8],
  ceres: MINOR_BODIES[0],
  vesta: MINOR_BODIES[1],
  pallas: MINOR_BODIES[2],
  juno: MINOR_BODIES[3],
  pluto: MINOR_BODIES[4],
  eris: MINOR_BODIES[5],
  haumea: MINOR_BODIES[6],
  makemake: MINOR_BODIES[7],
  "asteroid-belt": ASTEROID_BELT_DEFINITION,
  "kuiper-belt": KUIPER_BELT_DEFINITION,
  halley: HALLEY_DEFINITION,
};

const SURFACE_LOCATIONS: Location[] = [
  {
    name: "New York City",
    subtitle: "Urban coast / North America",
    lat: 40.7128,
    lon: -74.006,
    country: "United States",
    timezone: "UTC−05:00",
    fact: "A major Atlantic megacity at the mouth of the Hudson River.",
  },
  {
    name: "Mumbai",
    subtitle: "Monsoon coast / South Asia",
    lat: 19.076,
    lon: 72.8777,
    country: "India",
    timezone: "UTC+05:30",
    fact: "A densely populated harbor city on India’s west coast.",
  },
  {
    name: "Nairobi",
    subtitle: "Highland capital / East Africa",
    lat: -1.2921,
    lon: 36.8219,
    country: "Kenya",
    timezone: "UTC+03:00",
    fact: "A high-altitude capital near the equator and Nairobi National Park.",
  },
  {
    name: "Reykjavík",
    subtitle: "Volcanic island / North Atlantic",
    lat: 64.1466,
    lon: -21.9426,
    country: "Iceland",
    timezone: "UTC+00:00",
    fact: "A northern city powered by abundant geothermal and hydroelectric energy.",
  },
  {
    name: "Sydney",
    subtitle: "Pacific edge / Oceania",
    lat: -33.8688,
    lon: 151.2093,
    country: "Australia",
    timezone: "UTC+10:00",
    fact: "A coastal city wrapped around one of the world’s most recognizable harbors.",
  },
  {
    name: "São Paulo",
    subtitle: "Highland megacity / South America",
    lat: -23.5505,
    lon: -46.6333,
    country: "Brazil",
    timezone: "UTC−03:00",
    fact: "The largest city in the Southern Hemisphere by metropolitan population.",
  },
  {
    name: "Singapore",
    subtitle: "Equatorial city-state / Southeast Asia",
    lat: 1.3521,
    lon: 103.8198,
    country: "Singapore",
    timezone: "UTC+08:00",
    fact: "A highly connected city-state sitting almost directly on the equator.",
  },
  {
    name: "McMurdo Station",
    subtitle: "Antarctic research hub",
    lat: -77.8419,
    lon: 166.6863,
    country: "Antarctica",
    timezone: "UTC+12:00",
    fact: "The largest research station on the Antarctic continent.",
  },
];

const TIME_OPTIONS = [0.25, 1, 8, 64];

const formatDays = (days: number) => {
  if (days < 1) return `${days.toFixed(2)} d`;
  if (days < 1000) return `${Math.round(days).toLocaleString()} d`;
  return `${(days / 365.25).toFixed(1)} y`;
};

const formatDistance = (au: number) => {
  if (au < 0.01) return `${(au * 149_597_870).toFixed(0)} km`;
  return `${au.toFixed(3)} AU`;
};

const latLonToVector = (lat: number, lon: number, radius: number) => {
  return new THREE.Vector3(...surfacePoint(lat, lon, radius));
};

const geometryRings = (geometry: GeoFeature["geometry"]) => {
  if (!geometry) return [] as Array<Array<[number, number]>>;
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as Array<Array<[number, number]>>) ?? [];
  }
  return (
    (geometry.coordinates as Array<Array<Array<[number, number]>>>) ?? []
  ).flat();
};

const setSrgb = (texture: THREE.Texture | null) => {
  if (texture) texture.colorSpace = THREE.SRGBColorSpace;
};

type SceneProps = {
  simTimeRef: MutableRefObject<number>;
  playing: boolean;
  timeScale: number;
  scaleMode: ScaleMode;
  overview: OverviewMode;
  locatorLayer: MutableRefObject<HTMLDivElement | null>;
  selectedId: PlanetId;
  hoveredId: PlanetId | null;
  focusId: PlanetId | null;
  focusVersion: number;
  resetVersion: number;
  showOrbits: boolean;
  showLabels: boolean;
  showAtmosphere: boolean;
  showTrails: boolean;
  showSmallBodies: boolean;
  explorationMode: ExplorationMode;
  selectedLocation: Location | null;
  surfaceTarget: SurfaceTarget | null;
  inspectionLighting: boolean;
  onTimeTick: (value: number) => void;
  onSelectBody: (id: PlanetId) => void;
  onHoverBody: (id: PlanetId | null) => void;
  onCountrySelect: (name: string) => void;
  onLocationSelect: (location: Location) => void;
  onFeatureSelect: (feature: PlanetFeature) => void;
  onAssetFailure: (name: string) => void;
};

type BodyRefMap = MutableRefObject<Record<string, THREE.Object3D | null>>;

function SystemScene({
  simTimeRef,
  playing,
  timeScale,
  scaleMode,
  overview,
  locatorLayer,
  selectedId,
  hoveredId,
  focusId,
  focusVersion,
  resetVersion,
  showOrbits,
  showLabels,
  showAtmosphere,
  showTrails,
  showSmallBodies,
  explorationMode,
  selectedLocation,
  surfaceTarget,
  inspectionLighting,
  onTimeTick,
  onSelectBody,
  onHoverBody,
  onCountrySelect,
  onLocationSelect,
  onFeatureSelect,
  onAssetFailure,
}: SceneProps) {
  const bodyRefs = useRef<Record<string, THREE.Object3D | null>>({});
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const tickAccumulator = useRef(0);

  const registerBody = useCallback((id: string, object: THREE.Object3D | null) => {
    bodyRefs.current[id] = object;
  }, []);

  useFrame((_, delta) => {
    if (playing) simTimeRef.current += Math.min(delta, 0.05) * timeScale;
    tickAccumulator.current += delta;
    if (tickAccumulator.current > 0.2) {
      tickAccumulator.current = 0;
      onTimeTick(simTimeRef.current);
    }
  });

  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <ambientLight intensity={0.1} color="#9ab5d8" />
      {explorationMode !== "system" && inspectionLighting && <InspectionLight />}
      <pointLight
        position={[0, 0, 0]}
        intensity={2_500}
        distance={0}
        decay={1.2}
        color="#fff1d0"
      />
      <Stars
        radius={900}
        depth={160}
        count={3_200}
        factor={3.6}
        saturation={0.25}
        fade
        speed={0.18}
      />
      <SunBody
        scaleMode={scaleMode}
        selected={selectedId === "sun"}
        hovered={hoveredId === "sun"}
        showLabels={showLabels}
        showAtmosphere={showAtmosphere}
        onSelect={() => onSelectBody("sun")}
        onHover={(value) => onHoverBody(value ? "sun" : null)}
        registerBody={registerBody}
        onAssetFailure={onAssetFailure}
      />
      {showOrbits && <OrbitalPaths scaleMode={scaleMode} />}
      {PLANETS.map((planet) => (
        <MemoPlanetBody
          key={planet.id}
          planet={planet}
          simTimeRef={simTimeRef}
          scaleMode={scaleMode}
          selected={selectedId === planet.id}
          hovered={hoveredId === planet.id}
          selectedBodyId={selectedId}
          showOrbits={showOrbits}
          showLabels={showLabels}
          showAtmosphere={showAtmosphere}
          showTrails={showTrails}
          explorationMode={explorationMode}
          selectedLocation={selectedLocation}
          surfaceTarget={surfaceTarget?.bodyId === planet.id ? surfaceTarget : null}
          onSelect={onSelectBody}
          onHover={onHoverBody}
          onCountrySelect={onCountrySelect}
          onLocationSelect={onLocationSelect}
          onFeatureSelect={onFeatureSelect}
          registerBody={registerBody}
          onAssetFailure={onAssetFailure}
        />
      ))}
      {showSmallBodies && (
        <>
          <AsteroidBelt
            simTimeRef={simTimeRef}
            scaleMode={scaleMode}
            selected={selectedId === "asteroid-belt"}
            hovered={hoveredId === "asteroid-belt"}
            showLabels={showLabels}
            onSelect={() => onSelectBody("asteroid-belt")}
            onHover={(value) => onHoverBody(value ? "asteroid-belt" : null)}
            registerBody={registerBody}
          />
          <KuiperBelt
            simTimeRef={simTimeRef}
            scaleMode={scaleMode}
            selected={selectedId === "kuiper-belt"}
            hovered={hoveredId === "kuiper-belt"}
            showLabels={showLabels}
            onSelect={() => onSelectBody("kuiper-belt")}
            onHover={(value) => onHoverBody(value ? "kuiper-belt" : null)}
            registerBody={registerBody}
          />
          {MINOR_BODIES.map((body) => (
            <MinorBody
              key={body.id}
              body={body}
              simTimeRef={simTimeRef}
              scaleMode={scaleMode}
              selected={selectedId === body.id}
              hovered={hoveredId === body.id}
              showLabels={showLabels}
              onSelect={onSelectBody}
              onHover={onHoverBody}
              registerBody={registerBody}
            />
          ))}
          <CometBody
            simTimeRef={simTimeRef}
            scaleMode={scaleMode}
            selected={selectedId === "halley"}
            hovered={hoveredId === "halley"}
            showLabels={showLabels}
            onSelect={() => onSelectBody("halley")}
            onHover={(value) => onHoverBody(value ? "halley" : null)}
            registerBody={registerBody}
          />
        </>
      )}
      <CameraFocus
        controlsRef={controlsRef}
        bodyRefs={bodyRefs}
        scaleMode={scaleMode}
        overview={overview}
        focusId={focusId}
        focusVersion={focusVersion}
        resetVersion={resetVersion}
        surfaceTarget={surfaceTarget}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        regress
        enableDamping
        dampingFactor={0.065}
        rotateSpeed={0.42}
        zoomSpeed={0.74}
        panSpeed={0.42}
        maxDistance={6000}
        minDistance={0.0000001}
        autoRotate={false}
      />
      <AdaptiveDpr pixelated={false} />
      <LocatorUpdater layerRef={locatorLayer} bodies={LOCATOR_BODIES} bodyRefs={bodyRefs} scaleMode={scaleMode} showLabels={showLabels} />
    </>
  );
}

const MemoSystemScene = memo(SystemScene);

function OrbitalPaths({ scaleMode }: { scaleMode: ScaleMode }) {
  const paths = useMemo(
    () =>
      PLANETS.map((planet) => {
        const radius = orbitRadius(planet.distanceAU, scaleMode);
        return {
          planet,
          points: Array.from({ length: 96 }, (_, index) => {
            const angle = (index / 96) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
          }),
        };
      }),
    [scaleMode],
  );

  return (
    <group>
      {paths.map(({ planet, points }) => {
        return (
          <Line
            key={planet.id}
            points={points}
            color={planet.accent}
            lineWidth={planet.id === "earth" ? 1.45 : 0.7}
            transparent
            opacity={planet.id === "earth" ? 0.34 : 0.16}
            rotation={[planet.inclination, 0, 0]}
          />
        );
      })}
    </group>
  );
}

type SunProps = {
  scaleMode: ScaleMode;
  selected: boolean;
  hovered: boolean;
  showLabels: boolean;
  showAtmosphere: boolean;
  onSelect: () => void;
  onHover: (value: boolean) => void;
  registerBody: (id: string, object: THREE.Object3D | null) => void;
  onAssetFailure: (name: string) => void;
};

function SunBody({
  scaleMode,
  selected,
  hovered,
  showLabels,
  showAtmosphere,
  onSelect,
  onHover,
  registerBody,
  onAssetFailure,
}: SunProps) {
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const radius = bodyRadius(SUN_DEFINITION.radiusKm, scaleMode);

  useEffect(() => {
    registerBody("sun", group.current);
    return () => registerBody("sun", null);
  }, [registerBody]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.05;
    if (glow.current) {
      const pulse = 1 + Math.sin(performance.now() * 0.0012) * 0.018;
      glow.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={group}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
        scale={scaleMode === "exploration" && (hovered || selected) ? 1.045 : 1}
      >
        <sphereGeometry args={[radius, 48, 48]} />
        <SceneAssetBoundary name="Sun texture" onFailure={onAssetFailure} fallback={<meshBasicMaterial color="#ffd078" />}>
          <Suspense fallback={<meshBasicMaterial color="#ffd078" />}><SolarMaterial url={SUN_DEFINITION.texture} /></Suspense>
        </SceneAssetBoundary>
      </mesh>
      <mesh ref={glow} scale={1.12} raycast={() => null}>
         <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color={selected ? "#fff2b4" : "#ff9c23"}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {showAtmosphere && (
        <mesh scale={1.18} raycast={() => null}>
           <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial
            color="#ffcf75"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      {showAtmosphere && (
        <mesh scale={SUN_CORONA_MULTIPLIER} raycast={() => null}>
           <sphereGeometry args={[radius, 24, 24]} />
          <meshBasicMaterial
            color="#f87923"
            transparent
            opacity={0.035}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      {showLabels && scaleMode === "exploration" && (selected || hovered) && (
        <Html position={[0, radius * 2, 0]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className={`body-label ${selected ? "is-selected" : ""}`}>
            <span className="label-orb" style={{ background: "#ffbd4a" }} />
            <span>The Sun</span>
            <small>G2V STAR</small>
          </div>
        </Html>
      )}
    </group>
  );
}

type PlanetBodyProps = {
  planet: PlanetDefinition;
  simTimeRef: MutableRefObject<number>;
  scaleMode: ScaleMode;
  selected: boolean;
  hovered: boolean;
  selectedBodyId: PlanetId;
  showOrbits: boolean;
  showLabels: boolean;
  showAtmosphere: boolean;
  showTrails: boolean;
  explorationMode: ExplorationMode;
  selectedLocation: Location | null;
  surfaceTarget: SurfaceTarget | null;
  onSelect: (id: PlanetId) => void;
  onHover: (id: PlanetId | null) => void;
  onCountrySelect: (name: string) => void;
  onLocationSelect: (location: Location) => void;
  onFeatureSelect: (feature: PlanetFeature) => void;
  registerBody: (id: string, object: THREE.Object3D | null) => void;
  onAssetFailure: (name: string) => void;
};

function PlanetBody({
  planet,
  simTimeRef,
  scaleMode,
  selected,
  hovered,
  selectedBodyId,
  showOrbits,
  showLabels,
  showAtmosphere,
  showTrails,
  explorationMode,
  selectedLocation,
  surfaceTarget,
  onSelect,
  onHover,
  onCountrySelect,
  onLocationSelect,
  onFeatureSelect,
  registerBody,
  onAssetFailure,
}: PlanetBodyProps) {
  const orbitGroup = useRef<THREE.Group>(null);
  const spinGroup = useRef<THREE.Group>(null);
  const radius = bodyRadius(planet.radiusKm, scaleMode);
  const distance = orbitRadius(planet.distanceAU, scaleMode);
  const isEarth = planet.id === "earth";

  // Callback refs also re-register when enabling trails remounts the wrapper.
  const registerOrbit = useCallback((object: THREE.Group | null) => {
    orbitGroup.current = object;
    registerBody(planet.id, object);
  }, [planet.id, registerBody]);
  const registerSurface = useCallback((object: THREE.Group | null) => {
    spinGroup.current = object;
    registerBody(`${planet.id}:surface`, object);
  }, [planet.id, registerBody]);

  useFrame(() => {
    if (orbitGroup.current) {
      const orbitAngle = planet.phase + (simTimeRef.current / planet.orbitalPeriod) * Math.PI * 2;
      orbitGroup.current.position.set(
        Math.cos(orbitAngle) * distance,
        Math.sin(orbitAngle * 0.67) * distance * planet.inclination,
        Math.sin(orbitAngle) * distance,
      );
    }
    if (spinGroup.current) {
      const direction = planet.rotationPeriod < 0 ? -1 : 1;
      spinGroup.current.rotation.y =
        direction * (simTimeRef.current / Math.abs(planet.rotationPeriod)) * Math.PI * 2;
    }
  });

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(planet.id);
  };

  const content = (
    <group
      ref={registerOrbit}
      onClick={handleSelect}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(planet.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      <group ref={registerSurface}>
        <SceneAssetBoundary name={`${planet.name} textures`} onFailure={onAssetFailure} fallback={<FallbackBody radius={radius} color={planet.color} />}>
        <Suspense fallback={<FallbackBody radius={radius} color={planet.color} />}>
        {isEarth ? (
          <EarthSurface
            radius={radius}
            simTimeRef={simTimeRef}
            selected={selected}
            showAtmosphere={showAtmosphere}
            explorationMode={explorationMode}
            selectedLocation={selectedLocation}
            onCountrySelect={onCountrySelect}
            onLocationSelect={onLocationSelect}
            onSelectBody={() => onSelect("earth")}
          />
        ) : (
          <TexturedPlanet
            planet={planet}
            radius={radius}
            selected={selected}
            showAtmosphere={showAtmosphere}
            onAssetFailure={onAssetFailure}
          />
        )}
        </Suspense>
        </SceneAssetBoundary>
        {explorationMode === planet.id && isExplorable(planet.id) && (
          <PlanetFeatures
            planetId={planet.id}
            radius={radius}
            selectedTarget={surfaceTarget}
            showLabels={showLabels}
            onSelect={onFeatureSelect}
          />
        )}
      </group>
      {isEarth && (
        <SceneAssetBoundary name="Moon texture" onFailure={onAssetFailure} fallback={null}>
          <Suspense fallback={null}>
            <MoonBody
              earthRadius={radius}
              simTimeRef={simTimeRef}
              scaleMode={scaleMode}
              selected={selectedBodyId === "moon"}
              showLabels={showLabels}
              onSelect={() => onSelect("moon")}
              registerBody={registerBody}
              onAssetFailure={onAssetFailure}
            />
          </Suspense>
        </SceneAssetBoundary>
      )}
      {MAJOR_MOONS.some((moon) => moon.parent === planet.id) && (
        <MajorMoonSystem
          parent={planet.id}
          parentRadius={radius}
          simTimeRef={simTimeRef}
          scaleMode={scaleMode}
          showLabels={showLabels}
          showOrbits={showOrbits}
          selectedId={selectedBodyId}
          onSelect={onSelect}
          onHover={onHover}
          registerBody={registerBody}
        />
      )}
      {showLabels && scaleMode === "exploration" && explorationMode !== planet.id && (selected || hovered) && (
        <Html position={[0, radius * 1.65, 0]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className={`body-label ${selected ? "is-selected" : ""}`}>
            <span className="label-orb" style={{ background: planet.accent }} />
            <span>{planet.name}</span>
            <small>{planet.code}</small>
          </div>
        </Html>
      )}
    </group>
  );

  if (!showTrails) return content;

  return (
    <Trail
      width={selected ? 1.9 : 0.85}
      length={selected ? 6 : 3.2}
      color={planet.accent}
      attenuation={(value) => value * value}
    >
      {content}
    </Trail>
  );
}

const MemoPlanetBody = memo(PlanetBody);

type TexturedPlanetProps = {
  planet: PlanetDefinition;
  radius: number;
  selected: boolean;
  showAtmosphere: boolean;
  onAssetFailure: (name: string) => void;
};

function FallbackBody({ radius, color }: { radius: number; color: string }) {
  return <mesh><sphereGeometry args={[radius, 32, 24]} /><meshBasicMaterial color={color} /></mesh>;
}

function RingFallback({ radius }: { radius: number }) {
  return <mesh rotation={[Math.PI / 2.15, 0.12, 0.08]} raycast={() => null}><ringGeometry args={[radius * 1.22, radius * 2.52, 96]} /><meshBasicMaterial color="#b4a383" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} /></mesh>;
}

function TexturedPlanet({ planet, radius, selected, showAtmosphere, onAssetFailure }: TexturedPlanetProps) {
  const colorMap = useTexture(planet.texture);
  const isGasGiant = ["jupiter", "saturn", "uranus", "neptune"].includes(planet.id);
  useEffect(() => setSrgb(colorMap), [colorMap]);

  return (
    <>
      <mesh>
        <sphereGeometry args={[radius, isGasGiant ? 56 : 40, isGasGiant ? 56 : 40]} />
        <meshPhysicalMaterial
          map={colorMap}
          color={selected ? "#ffffff" : "#f8f4ed"}
          roughness={planet.id === "jupiter" || planet.id === "saturn" ? 0.83 : 0.9}
          metalness={0.02}
          clearcoat={isGasGiant ? 0.08 : 0}
          clearcoatRoughness={0.72}
          sheen={isGasGiant ? 0.12 : 0}
        />
      </mesh>
      {planet.id === "saturn" && <SceneAssetBoundary name="Saturn ring texture" onFailure={onAssetFailure} fallback={<RingFallback radius={radius} />}>
        <Suspense fallback={<RingFallback radius={radius} />}><SaturnRings radius={radius} /></Suspense>
      </SceneAssetBoundary>}
      {planet.id === "uranus" && <UranusRings radius={radius} />}
      {showAtmosphere && planet.atmosphere && (
        <Atmosphere
          radius={radius}
          color={planet.accent}
          intensity={planet.id === "venus" ? 0.13 : isGasGiant ? 0.11 : 0.08}
        />
      )}
    </>
  );
}

function SaturnRings({ radius }: { radius: number }) {
  const ringTexture = useTexture(`${GAS_GIANT_TEXTURE_ROOT}saturn_rings.png`);
  useEffect(() => setSrgb(ringTexture), [ringTexture]);

  return (
    <group rotation={[Math.PI / 2.15, 0.12, 0.08]}>
      <mesh raycast={() => null}>
        <ringGeometry args={[radius * 1.22, radius * 2.52, 256]} />
        <meshBasicMaterial
          map={ringTexture}
          transparent
          opacity={0.94}
          alphaTest={0.025}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh raycast={() => null}>
        <ringGeometry args={[radius * 1.05, radius * 1.19, 160]} />
        <meshBasicMaterial
          color="#aa9a78"
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh raycast={() => null}>
        <ringGeometry args={[radius * 1.67, radius * 1.76, 128]} />
        <meshBasicMaterial
          color="#060a10"
          transparent
          opacity={0.68}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.02} raycast={() => null}>
        <ringGeometry args={[radius * 2.49, radius * 2.56, 192]} />
        <meshBasicMaterial
          color="#e5d5ae"
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function UranusRings({ radius }: { radius: number }) {
  return (
    <group rotation={[Math.PI / 2.2, 0.03, 0.2]}>
      <mesh raycast={() => null}>
        <ringGeometry args={[radius * 1.42, radius * 1.78, 128]} />
        <meshBasicMaterial
          color="#6b8290"
          transparent
          opacity={0.34}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh raycast={() => null}>
        <ringGeometry args={[radius * 1.88, radius * 2.06, 128]} />
        <meshBasicMaterial
          color="#b1d3d5"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Atmosphere({
  radius,
  color,
  intensity,
}: {
  radius: number;
  color: string;
  intensity: number;
}) {
  const atmosphereColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <mesh scale={1.08} raycast={() => null}>
      <sphereGeometry args={[radius, 32, 32]} />
      <shaderMaterial
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={{
          uColor: { value: atmosphereColor },
          uIntensity: { value: intensity },
        }}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewPosition = mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec3 viewDirection = normalize(-vViewPosition);
            float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.6);
            float horizon = smoothstep(0.02, 0.9, fresnel);
            gl_FragColor = vec4(uColor, horizon * uIntensity);
          }
        `}
      />
    </mesh>
  );
}

type EarthSurfaceProps = {
  radius: number;
  simTimeRef: MutableRefObject<number>;
  selected: boolean;
  showAtmosphere: boolean;
  explorationMode: ExplorationMode;
  selectedLocation: Location | null;
  onCountrySelect: (name: string) => void;
  onLocationSelect: (location: Location) => void;
  onSelectBody: () => void;
};

function EarthSurface({
  radius,
  simTimeRef,
  showAtmosphere,
  explorationMode,
  selectedLocation,
  onCountrySelect,
  onLocationSelect,
  onSelectBody,
}: EarthSurfaceProps) {
  const [colorMap, normalMap, specularMap, lightsMap, cloudsMap] = useTexture([
    `${TEXTURE_ROOT}earth_atmos_2048.jpg`,
    `${TEXTURE_ROOT}earth_normal_2048.jpg`,
    `${TEXTURE_ROOT}earth_specular_2048.jpg`,
    `${TEXTURE_ROOT}earth_lights_2048.png`,
    `${TEXTURE_ROOT}earth_clouds_1024.png`,
  ]);
  const surfaceGroup = useRef<THREE.Group>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);
  const sunUniform = useMemo(() => ({ value: new THREE.Vector3(1, 0, 0) }), []);
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const normalScale = useMemo(() => new THREE.Vector2(0.6, 0.6), []);
  const addNightLighting = useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSunDirection = sunUniform;
    shader.fragmentShader = `uniform vec3 uSunDirection;\n${shader.fragmentShader}`.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0 - smoothstep(-0.12, 0.12, dot(normal, uSunDirection));",
    );
  }, [sunUniform]);

  useFrame(({ camera }) => {
    if (surfaceGroup.current) {
      surfaceGroup.current.getWorldPosition(worldPosition);
      sunUniform.value.copy(worldPosition).negate().transformDirection(camera.matrixWorldInverse);
    }
    if (cloudMesh.current) cloudMesh.current.rotation.y = simTimeRef.current * Math.PI * 0.03;
  });

  useEffect(() => {
    [colorMap, lightsMap, cloudsMap].forEach(setSrgb);
  }, [cloudsMap, colorMap, lightsMap]);

  const handleGlobeClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelectBody();
  };

  return (
    <group ref={surfaceGroup}>
      <mesh
        onClick={handleGlobeClick}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          normalScale={normalScale}
          specularMap={specularMap}
          specular={new THREE.Color("#6faebc")}
          shininess={16}
          color="#f9fbff"
          emissiveMap={lightsMap}
          emissive="#ffffff"
          emissiveIntensity={0.65}
          onBeforeCompile={addNightLighting}
          customProgramCacheKey={() => "earth-night-mask-v1"}
        />
      </mesh>
      {showAtmosphere && <mesh ref={cloudMesh} scale={1.015} raycast={() => null}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>}
      {showAtmosphere && <EarthAtmosphere radius={radius} />}
      {explorationMode === "earth" && (
        <EarthExplorationLayer
          radius={radius}
          simTimeRef={simTimeRef}
          selectedLocation={selectedLocation}
          onCountrySelect={onCountrySelect}
          onLocationSelect={onLocationSelect}
        />
      )}
    </group>
  );
}

function EarthAtmosphere({ radius }: { radius: number }) {
  return (
    <mesh scale={1.115} raycast={() => null}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshBasicMaterial
        color="#5bd6ff"
        transparent
        opacity={0.105}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

type MoonBodyProps = {
  earthRadius: number;
  simTimeRef: MutableRefObject<number>;
  scaleMode: ScaleMode;
  selected: boolean;
  showLabels: boolean;
  onSelect: () => void;
  registerBody: (id: string, object: THREE.Object3D | null) => void;
  onAssetFailure: (name: string) => void;
};

function MoonBody({
  earthRadius,
  simTimeRef,
  scaleMode,
  selected,
  showLabels,
  onSelect,
  registerBody,
  onAssetFailure,
}: MoonBodyProps) {
  const group = useRef<THREE.Group>(null);
  const moonRadius = bodyRadius(MOON_DEFINITION.radiusKm, scaleMode);
  const moonDistance = scaleMode === "physical" ? MOON_DEFINITION.distanceAU * AU_SCALE : earthRadius * 4.25;

  useEffect(() => {
    registerBody("moon", group.current);
    return () => registerBody("moon", null);
  }, [registerBody]);

  useFrame(() => {
    if (!group.current) return;
    const angle = simTimeRef.current * (Math.PI * 2 / MOON_DEFINITION.orbitalPeriod);
    group.current.position.set(
      Math.cos(angle) * moonDistance,
      Math.sin(angle * 0.72) * earthRadius * 0.2,
      Math.sin(angle) * moonDistance,
    );
    group.current.rotation.y = -angle;
  });

  return (
    <group ref={group}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => event.stopPropagation()}
        scale={scaleMode === "exploration" && selected ? 1.14 : 1}
      >
        <sphereGeometry args={[moonRadius, 32, 32]} />
        <SceneAssetBoundary name="Moon texture" onFailure={onAssetFailure} fallback={<meshBasicMaterial color="#b7b3a9" />}>
          <Suspense fallback={<meshBasicMaterial color="#b7b3a9" />}><LunarSurfaceMaterial /></Suspense>
        </SceneAssetBoundary>
      </mesh>
      {showLabels && selected && (
        <Html position={[0, moonRadius * 1.7, 0]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className="body-label compact">
            <span className="label-orb" style={{ background: "#d8d2c5" }} />
            <span>Luna</span>
            <small>EARTH I</small>
          </div>
        </Html>
      )}
    </group>
  );
}

function LunarSurfaceMaterial() {
  const texture = useTexture(MOON_DEFINITION.texture);
  useEffect(() => setSrgb(texture), [texture]);
  return <meshStandardMaterial map={texture} color="#e8e3d9" roughness={1} />;
}

function MajorMoonSystem({
  parent,
  parentRadius,
  simTimeRef,
  scaleMode,
  showLabels,
  showOrbits,
  selectedId,
  onSelect,
  onHover,
  registerBody,
}: {
  parent: PlanetId;
  parentRadius: number;
  simTimeRef: MutableRefObject<number>;
  scaleMode: ScaleMode;
  showLabels: boolean;
  showOrbits: boolean;
  selectedId: PlanetId;
  onSelect: (id: PlanetId) => void;
  onHover: (id: PlanetId | null) => void;
  registerBody: (id: string, object: THREE.Object3D | null) => void;
}) {
  const moons = useMemo(() => MAJOR_MOONS.filter((moon) => moon.parent === parent), [parent]);

  return (
    <group>
      {moons.map((moon) => (
        <group key={moon.id}>
          {showOrbits && <MoonOrbitPath moon={moon} parentRadius={parentRadius} scaleMode={scaleMode} />}
          <MajorMoon
            moon={moon}
            parentRadius={parentRadius}
            simTimeRef={simTimeRef}
            scaleMode={scaleMode}
            selected={selectedId === moon.id}
            showLabels={showLabels}
            onSelect={() => onSelect(moon.id)}
            onHover={(value) => onHover(value ? moon.id : null)}
            registerBody={registerBody}
          />
        </group>
      ))}
    </group>
  );
}

const explorationMoonOrbitMultiplier: Record<string, number> = {
  phobos: 2.9,
  deimos: 5.1,
  io: 3.5,
  europa: 4.9,
  ganymede: 6.35,
  callisto: 8.2,
  titan: 7.8,
  enceladus: 3.2,
  triton: 7.4,
};

const moonOrbitDistance = (moon: MajorMoonDefinition, parentRadius: number, scaleMode: ScaleMode) =>
  scaleMode === "physical"
    ? moon.orbitRadiusKm * SCENE_UNITS_PER_KM
    : parentRadius * explorationMoonOrbitMultiplier[moon.id];

function MoonOrbitPath({
  moon,
  parentRadius,
  scaleMode,
}: {
  moon: MajorMoonDefinition;
  parentRadius: number;
  scaleMode: ScaleMode;
}) {
  const points = useMemo(() => {
    const radius = moonOrbitDistance(moon, parentRadius, scaleMode);
    return Array.from({ length: 64 }, (_, index) => {
      const angle = (index / 64) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    });
  }, [moon, parentRadius, scaleMode]);

  return (
    <Line
      points={points}
      color={moon.accent}
      lineWidth={0.45}
      transparent
      opacity={0.18}
      raycast={() => null}
    />
  );
}

function MajorMoon({
  moon,
  parentRadius,
  simTimeRef,
  scaleMode,
  selected,
  showLabels,
  onSelect,
  onHover,
  registerBody,
}: {
  moon: MajorMoonDefinition;
  parentRadius: number;
  simTimeRef: MutableRefObject<number>;
  scaleMode: ScaleMode;
  selected: boolean;
  showLabels: boolean;
  onSelect: () => void;
  onHover: (value: boolean) => void;
  registerBody: (id: string, object: THREE.Object3D | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const radius = scaleMode === "physical"
    ? bodyRadius(moon.radiusKm, scaleMode)
    : Math.max(0.11, Math.pow(Math.max(moon.radiusKm, 100) / 6_371, 0.43) * 0.25);
  const distance = moonOrbitDistance(moon, parentRadius, scaleMode);

  useEffect(() => {
    registerBody(moon.id, group.current);
    return () => registerBody(moon.id, null);
  }, [moon.id, registerBody]);

  useFrame(() => {
    if (!group.current) return;
    const angle = moon.phase + (simTimeRef.current / moon.orbitalPeriod) * Math.PI * 2;
    group.current.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle * 0.74) * parentRadius * 0.24,
      Math.sin(angle) * distance,
    );
    group.current.rotation.y = -angle;
  });

  return (
    <group ref={group} scale={scaleMode === "exploration" && selected ? 1.2 : 1}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={moon.color}
          roughness={0.94}
          metalness={0.01}
          emissive={selected ? moon.accent : "#000000"}
          emissiveIntensity={selected ? 0.16 : 0}
        />
      </mesh>
      {showLabels && selected && (
        <Html position={[0, radius * 1.8, 0]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className="body-label is-selected compact">
            <span className="label-orb" style={{ background: moon.accent }} />
            <span>{moon.name}</span>
            <small>{moon.code}</small>
          </div>
        </Html>
      )}
    </group>
  );
}

type EarthExplorationLayerProps = {
  radius: number;
  simTimeRef: MutableRefObject<number>;
  selectedLocation: Location | null;
  onCountrySelect: (name: string) => void;
  onLocationSelect: (location: Location) => void;
};

function EarthExplorationLayer({
  radius,
  simTimeRef,
  selectedLocation,
  onCountrySelect,
  onLocationSelect,
}: EarthExplorationLayerProps) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const containsRef = useRef<typeof import("d3-geo").geoContains | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    fetch(EARTH_BORDER_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Country boundary request failed");
        return response.json() as Promise<Parameters<typeof topoFeature>[0]>;
      })
      .then(async (topology) => {
        const { geoContains } = await import("d3-geo");
        containsRef.current = geoContains;
        const collection = topoFeature(topology, topology.objects.countries) as unknown as {
          features?: GeoFeature[];
        };
        if (active) setFeatures(collection.features ?? []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const geometry = useMemo(() => {
    const points: number[] = [];
    for (const feature of features) for (const ring of geometryRings(feature.geometry)) {
      for (let i = 1; i < ring.length; i++) {
        points.push(...surfacePoint(ring[i - 1][1], ring[i - 1][0], radius * 1.008), ...surfacePoint(ring[i][1], ring[i][0], radius * 1.008));
      }
    }
    return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  }, [features, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <lineSegments geometry={geometry} raycast={() => null}>
        <lineBasicMaterial color="#8ee4eb" transparent opacity={0.65} depthWrite={false} />
      </lineSegments>
      {features.length > 0 && <mesh ref={surfaceRef} onClick={(event) => {
        event.stopPropagation();
        if (!surfaceRef.current || !containsRef.current) return;
        const local = surfaceRef.current.worldToLocal(event.point.clone());
        const { lat, lon } = surfaceCoordinates(local.x, local.y, local.z);
        const contains = containsRef.current;
        const feature = features.find((country) => contains(country as Parameters<typeof contains>[0], [lon, lat]));
        if (feature?.properties?.name) onCountrySelect(feature.properties.name);
      }}>
        <sphereGeometry args={[radius * 1.006, 48, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>}
      {SURFACE_LOCATIONS.map((location) => (
        <CityMarker
          key={location.name}
          location={location}
          radius={radius * 1.027}
          selected={selectedLocation?.name === location.name}
          onSelect={onLocationSelect}
        />
      ))}
      <EarthSatellites radius={radius} simTimeRef={simTimeRef} />
      <Html position={[0, -radius * 1.28, 0]} center zIndexRange={[8, 0]}>
        <div className="globe-status">
          <span className={`status-dot ${loading ? "is-loading" : ""}`} />
          {loading ? "LOADING BORDERS" : error ? "BORDERS UNAVAILABLE" : `${features.length} MAP AREAS · CLICK TO OPEN ATLAS`}
          {error && <button type="button" onClick={() => { setLoading(true); setError(false); setAttempt((value) => value + 1); }}>Retry</button>}
        </div>
      </Html>
    </group>
  );
}

function CityMarker({
  location,
  radius,
  selected,
  onSelect,
}: {
  location: Location;
  radius: number;
  selected: boolean;
  onSelect: (location: Location) => void;
}) {
  const position = useMemo(
    () => latLonToVector(location.lat, location.lon, radius),
    [location.lat, location.lon, radius],
  );
  return (
    <group position={position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(location);
        }}
        scale={selected ? 1.5 : 1}
      >
        <sphereGeometry args={[radius * (selected ? 0.027 : 0.018), 12, 12]} />
        <meshBasicMaterial color={selected ? "#fff6c4" : "#d2fff8"} />
      </mesh>
    </group>
  );
}

function EarthSatellites({ radius, simTimeRef }: { radius: number; simTimeRef: MutableRefObject<number> }) {
  const issRef = useRef<THREE.Group>(null);
  const orbitPoints = useMemo(() => {
    const points = Array.from({ length: 90 }, (_, index) => {
      const angle = (index / 90) * Math.PI * 2;
      const point = new THREE.Vector3(
        Math.cos(angle) * radius * 1.34,
        Math.sin(angle * 1.5) * radius * 0.22,
        Math.sin(angle) * radius * 1.34,
      );
      return point;
    });
    return points;
  }, [radius]);

  useFrame(() => {
    if (!issRef.current) return;
    // Demonstrative, not a live ISS ephemeris. All motion follows the pause/time controls.
    const time = simTimeRef.current * Math.PI * 2 / (92 / 1440);
    issRef.current.position.set(
      Math.cos(time) * radius * 1.34,
      Math.sin(time * 1.5) * radius * 0.22,
      Math.sin(time) * radius * 1.34,
    );
    issRef.current.rotation.y = time;
  });

  return (
    <group>
      <Line
        points={orbitPoints}
        color="#8de6f0"
        lineWidth={0.65}
        transparent
        opacity={0.34}
        dashed
        dashSize={radius * 0.08}
        gapSize={radius * 0.12}
        raycast={() => null}
      />
      <group ref={issRef} scale={radius}>
        <mesh>
          <boxGeometry args={[0.1, 0.028, 0.028]} />
          <meshBasicMaterial color="#e8f5ff" />
        </mesh>
        <mesh position={[0.09, 0, 0]}>
          <boxGeometry args={[0.075, 0.012, 0.012]} />
          <meshBasicMaterial color="#3d92d4" />
        </mesh>
        <Html position={[0, 0.12, 0]} center zIndexRange={[6, 0]} className="map-marker-label">
          <div className="map-marker satellite-marker">
            <span />
            <b>ISS · SCHEMATIC</b>
          </div>
        </Html>
      </group>
    </group>
  );
}

function InspectionLight() {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ camera, controls }) => {
    if (!light.current) return;
    light.current.position.copy(camera.position);
    const orbit = controls as OrbitControlsImpl | null;
    if (orbit) target.position.copy(orbit.target);
    target.updateMatrixWorld();
  });
  return <><primitive object={target} /><directionalLight ref={light} target={target} intensity={1.1} color="#eaf2ff" /></>;
}

function PlanetFeatures({ planetId, radius, selectedTarget, showLabels, onSelect }: {
  planetId: ExplorablePlanet; radius: number; selectedTarget: SurfaceTarget | null;
  showLabels: boolean; onSelect: (feature: PlanetFeature) => void;
}) {
  const guide = PLANET_EXPLORATION[planetId];
  return <group>
    {guide.features.map((feature) => <FeatureMarker key={feature.id} feature={feature} radius={radius}
      color={guide.accent} selected={selectedTarget?.id === feature.id} showLabel={showLabels} onSelect={onSelect} />)}
    {selectedTarget && !guide.features.some((feature) => feature.id === selectedTarget.id) && (
      <FeatureMarker radius={radius} color="#fff2ac" selected showLabel={showLabels} onSelect={onSelect}
        feature={{ ...selectedTarget, kind: "region", description: "Geographic reference point", sourceUrl: "https://www.naturalearthdata.com/" }} />
    )}
  </group>;
}

function FeatureMarker({ feature, radius, color, selected, showLabel, onSelect }: {
  feature: PlanetFeature; radius: number; color: string; selected: boolean; showLabel: boolean;
  onSelect: (feature: PlanetFeature) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLButtonElement>(null);
  const point = useMemo(() => latLonToVector(feature.lat, feature.lon, radius * 1.032), [feature.lat, feature.lon, radius]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), point.clone().normalize()), [point]);
  const scratch = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], []);
  useFrame(({ camera }) => {
    if (!group.current || !label.current) return;
    const [position, center, normal] = scratch;
    group.current.getWorldPosition(position);
    group.current.parent?.getWorldPosition(center);
    normal.subVectors(position, center).normalize();
    const facing = normal.dot(center.subVectors(camera.position, position).normalize()) > 0.12;
    label.current.style.visibility = facing && position.distanceTo(camera.position) < radius * 24 ? "visible" : "hidden";
  });
  return <group ref={group} position={point} quaternion={quaternion}>
    <mesh onClick={(event) => { event.stopPropagation(); onSelect(feature); }} onPointerOver={(event) => event.stopPropagation()}>
      <sphereGeometry args={[radius * (selected ? 0.034 : 0.022), 12, 12]} />
      <meshBasicMaterial color={selected ? "#fff8ce" : color} toneMapped={false} />
    </mesh>
    {selected && <mesh raycast={() => null}><torusGeometry args={[radius * 0.054, radius * 0.004, 5, 40]} /><meshBasicMaterial color={color} /></mesh>}
    {showLabel && <Html position={[0, 0, radius * 0.025]} center zIndexRange={[9, 0]}>
      <button ref={label} type="button" className={`feature-pin-label ${selected ? "is-selected" : ""}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); onSelect(feature); }}>{feature.name}{feature.approximate ? " ≈" : ""}</button>
    </Html>}
  </group>;
}

type SmallBodyInteractionProps = {
  simTimeRef: MutableRefObject<number>;
  scaleMode: ScaleMode;
  selected: boolean;
  hovered: boolean;
  showLabels: boolean;
  onSelect: () => void;
  onHover: (value: boolean) => void;
  registerBody: (id: string, object: THREE.Object3D | null) => void;
};

function AsteroidBelt({
  simTimeRef,
  scaleMode,
  selected,
  hovered,
  showLabels,
  onSelect,
  onHover,
  registerBody,
}: SmallBodyInteractionProps) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const instances = useMemo(
    () =>
      Array.from({ length: 1_050 }, (_, index) => {
        const seed = index * 12.9898;
        const random = (value: number) => (Math.sin(value) * 43_758.5453) % 1;
        const angle = (index / 1_050) * Math.PI * 2 + random(seed) * 0.12;
        const distanceAU = 2.08 + Math.abs(random(seed + 4.7)) * 1.24;
        return {
          position: new THREE.Vector3(
            Math.cos(angle) * orbitRadius(distanceAU, scaleMode),
            random(seed + 9.1) * 0.42,
            Math.sin(angle) * orbitRadius(distanceAU, scaleMode),
          ),
          scale: scaleMode === "physical"
            ? (1.5 + Math.abs(random(seed + 14.3)) * 35) * SCENE_UNITS_PER_KM
            : 0.045 + Math.abs(random(seed + 14.3)) * 0.085,
          rotation: new THREE.Euler(random(seed + 18) * 3, random(seed + 22) * 3, random(seed + 26) * 3),
          color: new THREE.Color().setHSL(0.075 + Math.abs(random(seed + 30)) * 0.04, 0.23, 0.29 + Math.abs(random(seed + 34)) * 0.25),
        };
      }),
    [scaleMode],
  );
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0.02, vertexColors: true }),
    [],
  );

  useEffect(() => {
    registerBody("asteroid-belt", group.current);
    if (!mesh.current) return () => registerBody("asteroid-belt", null);
    const helper = new THREE.Object3D();
    instances.forEach((instance, index) => {
      helper.position.copy(instance.position);
      helper.rotation.copy(instance.rotation);
      helper.scale.setScalar(instance.scale);
      helper.updateMatrix();
      mesh.current?.setMatrixAt(index, helper.matrix);
      mesh.current?.setColorAt(index, instance.color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
    return () => registerBody("asteroid-belt", null);
  }, [instances, registerBody]);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y = (simTimeRef.current / ASTEROID_BELT_DEFINITION.orbitalPeriod) * Math.PI * 2;
    }
  });

  return (
    <group
      ref={group}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <instancedMesh ref={mesh} args={[geometry, material, instances.length]} />
      {showLabels && (selected || hovered) && (
        <Html position={[0, 0.6, 2.7 * AU_SCALE]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className={`body-label ${selected ? "is-selected" : ""}`}>
            <span className="label-orb" style={{ background: ASTEROID_BELT_DEFINITION.accent }} />
            <span>Asteroid Belt</span>
            <small>2.1–3.3 AU / ROCKY DEBRIS</small>
          </div>
        </Html>
      )}
    </group>
  );
}

function KuiperBelt({
  simTimeRef,
  scaleMode,
  selected,
  hovered,
  showLabels,
  onSelect,
  onHover,
  registerBody,
}: SmallBodyInteractionProps) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(900 * 3);
    for (let index = 0; index < 900; index += 1) {
      const seed = index * 18.17;
      const random = (value: number) => (Math.sin(value) * 43_758.5453) % 1;
      const angle = (index / 900) * Math.PI * 2 + random(seed) * 0.08;
      const radiusAU = 31 + Math.abs(random(seed + 2.4)) * 20;
      positions[index * 3] = Math.cos(angle) * orbitRadius(radiusAU, scaleMode);
      positions[index * 3 + 1] = random(seed + 8) * 5.4;
      positions[index * 3 + 2] = Math.sin(angle) * orbitRadius(radiusAU, scaleMode);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return buffer;
  }, [scaleMode]);
  const material = useMemo(
    () => new THREE.PointsMaterial({
      color: "#9acff2",
      size: scaleMode === "physical" ? 0.004 : 0.54,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.46,
    }),
    [scaleMode],
  );

  useEffect(() => {
    registerBody("kuiper-belt", group.current);
    return () => registerBody("kuiper-belt", null);
  }, [registerBody]);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y = (simTimeRef.current / KUIPER_BELT_DEFINITION.orbitalPeriod) * Math.PI * 2;
    }
  });

  return (
    <group
      ref={group}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <points geometry={geometry} material={material} />
      {showLabels && (selected || hovered) && (
        <Html position={[0, 0.8, 40 * AU_SCALE]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className={`body-label ${selected ? "is-selected" : ""}`}>
            <span className="label-orb" style={{ background: KUIPER_BELT_DEFINITION.accent }} />
            <span>Kuiper Belt</span>
            <small>30–50 AU / ICY RESERVOIR</small>
          </div>
        </Html>
      )}
    </group>
  );
}

function MinorBody({
  body,
  simTimeRef,
  scaleMode,
  selected,
  hovered,
  showLabels,
  onSelect,
  onHover,
  registerBody,
}: {
  body: PlanetDefinition;
  simTimeRef: MutableRefObject<number>;
  scaleMode: ScaleMode;
  selected: boolean;
  hovered: boolean;
  showLabels: boolean;
  onSelect: (id: PlanetId) => void;
  onHover: (id: PlanetId | null) => void;
  registerBody: (id: string, object: THREE.Object3D | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const distance = orbitRadius(body.distanceAU, scaleMode);
  const radius = scaleMode === "physical"
    ? bodyRadius(body.radiusKm, scaleMode)
    : Math.max(0.18, Math.pow(Math.max(body.radiusKm, 100) / 6_371, 0.38) * 0.33);

  useEffect(() => {
    registerBody(body.id, group.current);
    return () => registerBody(body.id, null);
  }, [body.id, registerBody]);

  useFrame(() => {
    if (!group.current) return;
    const angle = body.phase + (simTimeRef.current / body.orbitalPeriod) * Math.PI * 2;
    group.current.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle * 0.63) * distance * body.inclination,
      Math.sin(angle) * distance,
    );
    group.current.rotation.y = (simTimeRef.current / Math.max(0.1, Math.abs(body.rotationPeriod))) * Math.PI * 2;
  });

  return (
    <group
      ref={group}
      scale={scaleMode === "exploration" && (selected || hovered) ? 1.16 : 1}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(body.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(body.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      <mesh>
        <icosahedronGeometry args={[radius, 1]} />
        <meshStandardMaterial
          color={selected ? "#fff6dc" : body.color}
          roughness={0.92}
          metalness={0.01}
          emissive={selected ? body.accent : "#000000"}
          emissiveIntensity={selected ? 0.18 : 0}
        />
      </mesh>
      {showLabels && (selected || hovered) && (
        <Html position={[0, radius * 1.7, 0]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className={`body-label ${selected ? "is-selected" : ""}`}>
            <span className="label-orb" style={{ background: body.accent }} />
            <span>{body.name}</span>
            <small>{body.code}</small>
          </div>
        </Html>
      )}
    </group>
  );
}

function CometBody({
  simTimeRef,
  scaleMode,
  selected,
  hovered,
  showLabels,
  onSelect,
  onHover,
  registerBody,
}: SmallBodyInteractionProps) {
  const group = useRef<THREE.Group>(null);
  const cometRadius = scaleMode === "physical" ? bodyRadius(HALLEY_DEFINITION.radiusKm, scaleMode) : 0.24;
  const tailPoints = useMemo(() => {
    const tailLength = scaleMode === "physical" ? 0.004 : 8.2;
    return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, tailLength * 0.007, -tailLength * 0.56), new THREE.Vector3(0, tailLength * 0.03, -tailLength)];
  }, [scaleMode]);

  useEffect(() => {
    registerBody("halley", group.current);
    return () => registerBody("halley", null);
  }, [registerBody]);

  useFrame(() => {
    if (!group.current) return;
    const semiMajorAxis = 17.94;
    const eccentricity = 0.967;
    const angle = HALLEY_DEFINITION.phase + (simTimeRef.current / HALLEY_DEFINITION.orbitalPeriod) * Math.PI * 2;
    const radiusAU = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(angle));
    const radius = orbitRadius(radiusAU, scaleMode);
    group.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.08, Math.sin(angle) * radius);
    group.current.rotation.y = Math.PI / 2 - angle;
  });

  return (
    <group
      ref={group}
      scale={scaleMode === "exploration" && (selected || hovered) ? 1.12 : 1}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <Line points={tailPoints} color="#8fe5ff" lineWidth={selected ? 1.7 : 0.8} transparent opacity={0.42} />
      <mesh>
        <sphereGeometry args={[cometRadius, 18, 18]} />
        <meshBasicMaterial color="#e9f4dc" />
      </mesh>
      <mesh scale={1.8} raycast={() => null}>
        <sphereGeometry args={[cometRadius, 14, 14]} />
        <meshBasicMaterial color="#b8eeff" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {showLabels && (selected || hovered) && (
        <Html position={[0, 0.6, 0]} center zIndexRange={[9, 0]} className="body-label-wrap">
          <div className={`body-label ${selected ? "is-selected" : ""}`}>
            <span className="label-orb" style={{ background: HALLEY_DEFINITION.accent }} />
            <span>Comet Halley</span>
            <small>1P / PERIODIC COMET</small>
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraFocus({
  controlsRef,
  bodyRefs,
  scaleMode,
  overview,
  focusId,
  focusVersion,
  resetVersion,
  surfaceTarget,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  bodyRefs: BodyRefMap;
  scaleMode: ScaleMode;
  overview: OverviewMode;
  focusId: PlanetId | null;
  focusVersion: number;
  resetVersion: number;
  surfaceTarget: SurfaceTarget | null;
}) {
  const { camera, size } = useThree();
  const flight = useRef({ active: false, tracking: false, elapsed: 0 });
  const scratch = useMemo(() => ({
    center: new THREE.Vector3(), aim: new THREE.Vector3(), desired: new THREE.Vector3(),
    direction: new THREE.Vector3(), startPosition: new THREE.Vector3(), startTarget: new THREE.Vector3(),
    lastAim: new THREE.Vector3(), offset: new THREE.Vector3(), rotation: new THREE.Quaternion(),
    lastRotation: new THREE.Quaternion(), deltaRotation: new THREE.Quaternion(),
  }), []);
  const defaultPosition = useMemo(
    () => new THREE.Vector3(...overviewFrame(scaleMode, overview, size.width, size.height).position),
    [scaleMode, overview, size.width, size.height],
  );

  useEffect(() => {
    flight.current = { active: Boolean(focusId), tracking: false, elapsed: 0 };
    scratch.startPosition.copy(camera.position);
    scratch.startTarget.copy(controlsRef.current?.target ?? scratch.center.set(0, 0, 0));
    if (!focusId && controlsRef.current) {
      camera.position.copy(defaultPosition);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = scaleMode === "physical" ? 0.000001 : 0.1;
      controlsRef.current.update();
    }
  }, [camera, controlsRef, defaultPosition, focusId, focusVersion, resetVersion, scaleMode, scratch]);

  useEffect(() => {
    const controls = controlsRef.current;
    // Taking control interrupts the flight, but retains orbital tracking.
    const interrupt = () => { flight.current.active = false; };
    controls?.addEventListener("start", interrupt);
    return () => controls?.removeEventListener("start", interrupt);
  }, [controlsRef]);

  useFrame(({ camera }, delta) => {
    if (!focusId) {
      const clip = cameraClipping(camera.position.distanceTo(controlsRef.current?.target ?? scratch.center.set(0, 0, 0)));
      if (camera instanceof THREE.PerspectiveCamera && (camera.near !== clip.near || camera.far !== clip.far)) {
        camera.near = clip.near;
        camera.far = clip.far;
        camera.updateProjectionMatrix();
      }
      return;
    }
    if (!controlsRef.current) return;
    const object = bodyRefs.current[focusId];
    if (!object) return;
    const { center, aim, desired, direction, startPosition, startTarget, lastAim, offset, rotation, lastRotation, deltaRotation } = scratch;
    object.getWorldPosition(center);
    const surface = surfaceTarget?.bodyId === focusId ? surfaceTarget : null;
    const radius = bodyRadius(BODY_BY_ID[focusId].radiusKm, scaleMode);
    const framing = closeupDistances(radius || 2, Boolean(surface));
    if (surface) {
      direction.set(...surfacePoint(surface.lat, surface.lon));
      rotation.identity();
      bodyRefs.current[`${focusId}:surface`]?.getWorldQuaternion(rotation);
      direction.applyQuaternion(rotation).normalize();
      aim.copy(center).addScaledVector(direction, radius * 0.98);
      desired.copy(center).addScaledVector(direction, framing.distance);
    } else {
      aim.copy(center);
      direction.copy(center).negate().normalize();
      if (direction.lengthSq() < 0.01) direction.set(0.58, 0.36, 1);
      direction.setY(direction.y + 0.48);
      direction.normalize();
      const distance = focusId === "asteroid-belt" ? 72 : focusId === "kuiper-belt" ? 670 : framing.distance * (focusId === "saturn" ? 1.55 : 1);
      desired.copy(center).addScaledVector(direction, distance);
    }
    controlsRef.current.minDistance = framing.min;
    if (flight.current.active) {
      flight.current.elapsed += Math.min(delta, 0.05);
      const t = flightProgress(flight.current.elapsed);
      camera.position.lerpVectors(startPosition, desired, t);
      controlsRef.current.target.lerpVectors(startTarget, aim, t);
      if (t === 1) flight.current.active = false;
    } else if (flight.current.tracking) {
      if (surface) {
        // Preserve user orbit/zoom/pan in the rotating surface frame.
        deltaRotation.copy(lastRotation).invert().premultiply(rotation);
        followSurfaceFrame(camera.position, lastAim, aim, deltaRotation);
        followSurfaceFrame(controlsRef.current.target, lastAim, aim, deltaRotation);
      } else {
        offset.subVectors(aim, lastAim);
        camera.position.add(offset);
        controlsRef.current.target.add(offset);
      }
    }
    flight.current.tracking = true;
    lastAim.copy(aim);
    lastRotation.copy(rotation);
    controlsRef.current.update();
    if (!flight.current.active && radius > 0) {
      offset.subVectors(camera.position, center);
      if (offset.length() < radius * 1.025) {
        if (offset.lengthSq() === 0) offset.set(0, 0, 1);
        camera.position.copy(center).add(offset.setLength(radius * 1.025));
      }
    }
    const clip = cameraClipping(camera.position.distanceTo(center), radius);
    if (camera instanceof THREE.PerspectiveCamera && (camera.near !== clip.near || camera.far !== clip.far)) {
      camera.near = clip.near;
      camera.far = clip.far;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

export default function SolarSystem() {
  const [selectedId, setSelectedId] = useState<PlanetId>("earth");
  const [hoveredId, setHoveredId] = useState<PlanetId | null>(null);
  const [explorationMode, setExplorationMode] = useState<ExplorationMode>("earth");
  const [playing, setPlaying] = useState(false);
  const [timeScale, setTimeScale] = useState(8);
  // One user-facing view only: interactive display scale. The physical branch
  // remains in the math utilities for scientific reference/tests, not as a UI mode.
  const scaleMode: ScaleMode = "exploration";
  const [overview, setOverview] = useState<OverviewMode>("system");
  const [simTime, setSimTime] = useState(0);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showTrails, setShowTrails] = useState(false);
  const [showSmallBodies, setShowSmallBodies] = useState(true);
  const [focusId, setFocusId] = useState<PlanetId | null>("earth");
  const [focusVersion, setFocusVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(SURFACE_LOCATIONS[1]);
  const [surfaceTarget, setSurfaceTarget] = useState<SurfaceTarget | null>(null);
  const [inspectionLighting, setInspectionLighting] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [assetFailures, setAssetFailures] = useState<string[]>([]);
  const simTimeRef = useRef(0);
  const locatorLayer = useRef<HTMLDivElement>(null);

  const selectedBody = BODY_BY_ID[selectedId];

  const selectBody = useCallback((id: PlanetId) => {
    setSelectedId(id);
    if (MINOR_BODIES.some((body) => body.id === id) || id === "halley" || id.endsWith("-belt")) setShowSmallBodies(true);
    if (id !== selectedId) {
      setSurfaceTarget(null);
      if (explorationMode !== "system") {
        setExplorationMode(isExplorable(id) ? id : "system");
        setPlaying(false);
        setFocusId(id);
        setFocusVersion((version) => version + 1);
      }
    }
  }, [explorationMode, selectedId]);

  const focusBody = useCallback((id: PlanetId) => {
    setSelectedId(id);
    setExplorationMode((current) => current !== "system" && isExplorable(id) ? id : "system");
    if (MINOR_BODIES.some((body) => body.id === id) || id === "halley" || id.endsWith("-belt")) setShowSmallBodies(true);
    setSurfaceTarget(null);
    setFocusId(id);
    setPlaying(false);
    setFocusVersion((version) => version + 1);
  }, []);

  const focusLocator = useCallback((id: string) => focusBody(id as PlanetId), [focusBody]);

  const resetView = useCallback(() => {
    setFocusId(null);
    setSurfaceTarget(null);
    setExplorationMode("system");
    setResetVersion((version) => version + 1);
  }, []);

  const openExplorationMode = useCallback(
    (mode: ExplorationMode) => {
      setExplorationMode(mode);
      setSelectedCountry(null);
      setWorldMapOpen(false);
      setSurfaceTarget(null);
      if (mode !== "system") {
        setSelectedId(mode);
        setFocusId(mode);
        setPlaying(false);
        setFocusVersion((version) => version + 1);
      } else {
        setFocusId(null);
        setResetVersion((version) => version + 1);
      }
    },
    [],
  );

  const onLocationSelect = useCallback((location: Location) => {
    setSelectedLocation(location);
    setSurfaceTarget({ bodyId: "earth", id: `city:${location.name}`, name: location.name, lat: location.lat, lon: location.lon });
    setPlaying(false);
    setFocusId("earth");
    setFocusVersion((version) => version + 1);
  }, []);

  const onFeatureSelect = useCallback((feature: PlanetFeature) => {
    if (explorationMode === "system") return;
    setSurfaceTarget({ ...feature, bodyId: explorationMode });
    setFocusId(explorationMode);
    setPlaying(false);
    setFocusVersion((version) => version + 1);
  }, [explorationMode]);

  const onLocateCountry = useCallback((target: GeographicTarget) => {
    setSelectedCountry(target.name);
    setSelectedId("earth");
    setExplorationMode("earth");
    setPlaying(false);
    setSurfaceTarget({ ...target, bodyId: "earth", id: `country:${target.name}` });
    setFocusId("earth");
    setFocusVersion((version) => version + 1);
  }, []);

  const openCountryAtlas = useCallback(() => {
    setSelectedId("earth");
    setExplorationMode("earth");
    setPlaying(false);
    setFocusId("earth");
    setFocusVersion((version) => version + 1);
    setWorldMapOpen(true);
  }, []);

  const onCountrySelect = useCallback((name: string) => {
    setSelectedCountry(name);
    setWorldMapOpen(true);
  }, []);

  const onTimeTick = useCallback((value: number) => {
    setSimTime(value);
  }, []);

  const onAssetFailure = useCallback((name: string) => {
    setAssetFailures((previous) => previous.includes(name) ? previous : [...previous, name]);
  }, []);

  const seekToEarthDay = useCallback((dayOfYear: number) => {
    const currentEarthYear = Math.floor(simTimeRef.current / 365.25);
    const nextTime = currentEarthYear * 365.25 + dayOfYear;
    simTimeRef.current = nextTime;
    setSimTime(nextTime);
  }, []);

  const toggleMode = (mode: ExplorationMode) => {
    if (mode === explorationMode) {
      openExplorationMode("system");
    } else {
      openExplorationMode(mode);
    }
  };

  return (
    <main className="observatory-shell">
      <div className="canvas-layer">
        <Canvas
          frameloop={worldMapOpen ? "never" : "always"}
          camera={{
            position: [0, 190, 380],
            fov: 42,
            near: 1,
            far: 6000,
          }}
          dpr={[1, 1.35]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance", depth: true }}
          onPointerMissed={() => setHoveredId(null)}
        >
            <MemoSystemScene
              simTimeRef={simTimeRef}
              playing={playing}
              timeScale={timeScale}
              scaleMode={scaleMode}
              overview={overview}
              locatorLayer={locatorLayer}
              selectedId={selectedId}
              hoveredId={hoveredId}
              focusId={focusId}
              focusVersion={focusVersion}
              resetVersion={resetVersion}
              showOrbits={showOrbits}
              showLabels={showLabels}
              showAtmosphere={showAtmosphere}
              showTrails={showTrails}
              showSmallBodies={showSmallBodies}
              explorationMode={explorationMode}
              selectedLocation={selectedLocation}
              surfaceTarget={surfaceTarget}
              inspectionLighting={inspectionLighting}
              onTimeTick={onTimeTick}
              onSelectBody={selectBody}
              onHoverBody={setHoveredId}
              onCountrySelect={onCountrySelect}
              onLocationSelect={onLocationSelect}
              onFeatureSelect={onFeatureSelect}
              onAssetFailure={onAssetFailure}
            />
        </Canvas>
      </div>
      <BodyLocators layerRef={locatorLayer} bodies={LOCATOR_BODIES} showLabels={showLabels} onFocus={focusLocator} />

      <div className="hud-layer">
        <header className="top-bar">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <span className="brand-mark-core" />
              <span className="brand-mark-orbit orbit-one" />
              <span className="brand-mark-orbit orbit-two" />
            </div>
            <div className="brand-copy">
              <span className="micro-label">DEEP SPACE OBSERVATORY / 01</span>
              <strong>HELIOCENTRIC EXPLORER</strong>
            </div>
          </div>
          <div className="top-readouts">
            <div className="readout-chip live-chip">
              <span className="live-dot" />
              <span>{playing ? "SIMULATED TIME" : "SIMULATION PAUSED"}</span>
              <b>T+ {formatDays(simTime)}</b>
            </div>
            <div className="readout-chip">
              <span>MODEL</span>
              <b>EDUCATIONAL</b>
            </div>
            <div className="readout-chip">
              <span>CATALOGUE</span>
              <b>{showSmallBodies ? Object.keys(BODY_BY_ID).length : PLANETS.length + MAJOR_MOONS.length + 2} ENTRIES</b>
            </div>
            <button
              className="icon-button top-icon-button"
              type="button"
              aria-label="Enter fullscreen"
              title="Enter fullscreen"
              onClick={() => document.documentElement.requestFullscreen?.()}
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </header>

        {explorationMode === "system" && <section className="overview-toolbar" aria-label="Solar system overview navigation">
          <div><strong>{focusId ? `${BODY_BY_ID[focusId].name} close-up` : overview === "inner" ? "Inner solar system" : "Sun & all eight planets"}</strong>
            <span>INTERACTIVE DISPLAY SCALE</span></div>
          <nav aria-label="Overview presets">
            <button type="button" aria-pressed={!focusId && overview === "inner"} onClick={() => { setOverview("inner"); resetView(); }}>Inner planets</button>
            <button type="button" aria-pressed={!focusId && overview === "system"} onClick={() => { setOverview("system"); resetView(); }}>All planets</button>
            <button type="button" onClick={() => focusBody("sun")}><Sun size={13} /> Focus Sun</button>
          </nav>
          <p>Planets are enlarged for browsing and orbit clearances are padded. AU readouts remain scientific; locators are navigation aids.</p>
        </section>}
        {assetFailures.length > 0 && <div className="asset-warning" role="status">
          Texture fallback active: {assetFailures.join(", ")}. Navigation still works. <button type="button" onClick={() => window.location.reload()}>Reload to retry</button>
        </div>}

        <aside className="left-stack">
          <section className="hud-card telemetry-card">
            <div className="card-heading">
              <div>
                <span className="micro-label">OBJECT TELEMETRY</span>
                <span className="card-heading-sub">SELECTED TARGET / {selectedBody.code}</span>
              </div>
              <div className="connection-state"><span /> TRACKING</div>
            </div>
            <div className="selected-title-row">
              <div>
                <h1>{selectedBody.name}</h1>
                <span className="selected-type">{selectedBody.type}</span>
              </div>
              <span
                className="body-color-orb"
                style={{ background: `radial-gradient(circle at 35% 30%, ${selectedBody.accent}, ${selectedBody.color})` }}
              />
            </div>
            <p className="body-description">{selectedBody.description}</p>
            <div className="telemetry-grid">
              <Telemetry label="DISTANCE FROM SOL" value={selectedBody.id === "sun" ? "0 AU" : formatDistance(selectedBody.distanceAU)} />
              <Telemetry label="ORBITAL PERIOD" value={selectedBody.orbitalPeriod ? formatDays(selectedBody.orbitalPeriod) : "—"} />
              <Telemetry label="EQUATORIAL RADIUS" value={`${selectedBody.radiusKm.toLocaleString()} km`} />
              <Telemetry label="NATURAL SATELLITES" value={String(selectedBody.moons)} />
            </div>
            <div className="body-data-line">
              <span><span className="data-dot cyan" /> {selectedBody.atmosphere ?? "No atmosphere"}</span>
              <span><span className="data-dot amber" /> {selectedBody.temperature}</span>
            </div>
            <div className="fact-list">
              {selectedBody.facts.map((fact) => (
                <div key={fact} className="fact-row"><ChevronRight size={13} /><span>{fact}</span></div>
              ))}
            </div>
            <div className="card-actions">
              <button className="primary-button" type="button" onClick={() => focusBody(selectedId)}>
                <Crosshair size={15} /> FOCUS TARGET
              </button>
              <button className="secondary-button" type="button" onClick={resetView}>
                <Rotate3d size={15} /> RESET VIEW
              </button>
            </div>
            {isExplorable(selectedId) && (
              <div className="explore-actions">
                <button type="button" className="explore-button" onClick={() => openExplorationMode(selectedId)}>
                  <Globe2 size={15} /> EXPLORE {selectedBody.name.toUpperCase()} IN DETAIL <ChevronRight size={14} />
                </button>
                {selectedId === "earth" && <button type="button" className="world-map-button" onClick={openCountryAtlas}>
                  <Map size={14} /> COUNTRIES & WORLD MAP <Maximize2 size={13} />
                </button>}
              </div>
            )}
          </section>

          <div className="interaction-hint">
            <MousePointer2 size={14} />
            <span>Drag to orbit <i /> Scroll to zoom <i /> Click any body to inspect <i /> Focus Jupiter, Saturn, or Neptune for moons</span>
          </div>
        </aside>

        {explorationMode !== "system" && <div className="exploration-toolbar" aria-label="Close-up controls">
          <div><span className="micro-label">{PLANET_EXPLORATION[explorationMode].domain === "atmosphere" ? "ATMOSPHERIC REFERENCE" : "SURFACE EXPLORATION"}</span>
            <strong>{surfaceTarget?.bodyId === explorationMode ? surfaceTarget.name : BODY_BY_ID[explorationMode].name}</strong>
            <small>{surfaceTarget ? coordinatesLabel(surfaceTarget.lat, surfaceTarget.lon) : "Select a feature in the field guide or on the globe"}</small>
          </div>
          <div className="exploration-toolbar-actions">
            <button type="button" onClick={() => focusBody(explorationMode)}><Globe2 size={13} /> Whole planet</button>
            {explorationMode === "earth" && <button type="button" onClick={openCountryAtlas}><Map size={13} /> Country atlas</button>}
          </div>
          <small>Inspection pauses time. Scroll to zoom; drag to orbit. {playing ? "Time resumed." : "Resume from simulation controls."}</small>
        </div>}

        <aside className={`right-stack ${explorationMode !== "system" ? "is-exploring" : ""}`}>
          {explorationMode !== "system" && (
            <PlanetExplorerPanel
              planetId={explorationMode}
              selectedFeatureId={surfaceTarget?.bodyId === explorationMode ? surfaceTarget.id : null}
              onFeatureSelect={onFeatureSelect}
              onOpenEarthAtlas={openCountryAtlas}
              onClose={() => openExplorationMode("system")}
            />
          )}
          <details className="simulation-details" open={explorationMode === "system"}>
          <summary><Settings2 size={14} /> SIMULATION & VIEW CONTROLS</summary>
          <section className="hud-card control-card">
            <div className="card-heading">
              <div>
                <span className="micro-label">OBSERVATORY CONTROL</span>
                <span className="card-heading-sub">REAL-TIME SIMULATION LAYER</span>
              </div>
              <Settings2 size={17} className="muted-icon" />
            </div>

            <div className="mode-switcher" role="tablist" aria-label="Exploration mode">
              <ModeButton active={explorationMode === "system"} icon={<Sun size={14} />} label="SYSTEM" onClick={() => toggleMode("system")} />
              <ModeButton active={explorationMode === "earth"} icon={<Globe2 size={14} />} label="EARTH" onClick={() => toggleMode("earth")} />
              <ModeButton active={explorationMode === "mars"} icon={<Map size={14} />} label="MARS" onClick={() => toggleMode("mars")} />
            </div>
            <label className="planet-mode-picker">EXPLORE A WORLD
              <select aria-label="Choose planet to explore" value={explorationMode} onChange={(event) => openExplorationMode(event.target.value as ExplorationMode)}>
                <option value="system">Solar system overview</option>
                {PLANETS.map((planet) => <option key={planet.id} value={planet.id}>{planet.name}</option>)}
              </select>
            </label>

            <div className="scale-mode-control single-view-control">
              <div className="scale-mode-heading"><span><Maximize2 size={13} /> DISPLAY MODEL</span><b>INTERACTIVE</b></div>
              <p>One navigation view: enlarged bodies, separated orbital display and scientific AU telemetry. No separate physical-scale mode is exposed.</p>
            </div>

            <div className="time-controller">
              <div className="control-label-row">
                <span><Clock3 size={14} /> TEMPORAL FLOW</span>
                <b>{timeScale} d/s</b>
              </div>
              <div className="time-slider-row">
                <button
                  type="button"
                  className="play-button"
                  aria-label={playing ? "Pause simulation" : "Play simulation"}
                  onClick={() => setPlaying((value) => !value)}
                >
                  {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                </button>
                <div className="speed-buttons">
                  {TIME_OPTIONS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={timeScale === value ? "is-active" : ""}
                      onClick={() => setTimeScale(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="temporal-progress"><span style={{ width: `${Math.min(100, (simTime % 365.25) / 365.25 * 100)}%` }} /></div>
              <input
                className="timeline-range"
                type="range"
                min="0"
                max="365.25"
                step="0.25"
                value={simTime % 365.25}
                onChange={(event) => seekToEarthDay(Number(event.target.value))}
                aria-label="Seek through the simulated Earth year"
              />
              <div className="temporal-caption"><span>SIM DAY {Math.floor(simTime).toLocaleString()}</span><span>EARTH YEAR {(simTime / 365.25).toFixed(2)}</span></div>
            </div>

            <div className="toggle-list">
              <ToggleRow label="Orbital paths" icon={<Navigation size={14} />} checked={showOrbits} onChange={setShowOrbits} />
              <ToggleRow label="Object labels" icon={<Info size={14} />} checked={showLabels} onChange={setShowLabels} />
              <ToggleRow label="Atmospheres + clouds" icon={<Sparkles size={14} />} checked={showAtmosphere} onChange={setShowAtmosphere} />
              <ToggleRow label="Motion trails" icon={<Activity size={14} />} checked={showTrails} onChange={setShowTrails} />
              <ToggleRow label="Asteroids + outer bodies" icon={<Database size={14} />} checked={showSmallBodies} onChange={setShowSmallBodies} />
              {explorationMode !== "system" && <ToggleRow label="Inspection fill light" icon={<Sun size={14} />} checked={inspectionLighting} onChange={setInspectionLighting} />}
            </div>
            <div className="moon-catalogue">
              <div className="moon-catalogue-label"><Moon size={13} /> MAJOR MOON SYSTEMS</div>
              <div className="moon-buttons">
                {MAJOR_MOONS.map((moon) => (
                  <button
                    key={moon.id}
                    type="button"
                    className={selectedId === moon.id ? "is-active" : ""}
                    onClick={() => selectBody(moon.id)}
                    title={`${moon.name} · ${moon.parent}`}
                  >
                    {moon.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-footer"><span><Eye size={13} /> {showLabels ? "LABELS VISIBLE" : "LABELS HIDDEN"}</span><span><Zap size={13} /> GPU OPTIMIZED</span></div>
          </section>
          </details>
        </aside>

        {worldMapOpen && (
          <EarthAtlas
            initialCountry={selectedCountry}
            onLocate={onLocateCountry}
            onClose={() => setWorldMapOpen(false)}
          />
        )}

        <div className="bottom-rail-wrap">
          <div className="bottom-rail-header">
            <span className="micro-label">CELESTIAL CATALOGUE</span>
            <span className="catalogue-note"><span className="live-dot" /> 8 PLANETS / 1 STAR / ASTEROIDS / DWARF WORLDS / COMETS</span>
          </div>
          <div className="planet-rail">
            {LOCATOR_BODIES.map((planet) => (
              <button
                type="button"
                key={planet.id}
                className={`planet-chip ${selectedId === planet.id ? "is-selected" : ""}`}
                onClick={() => selectBody(planet.id)}
              >
                <span className="planet-chip-orb" style={{ background: `radial-gradient(circle at 32% 28%, ${planet.accent}, ${planet.color})` }} />
                <span className="planet-chip-copy"><b>{planet.name}</b><small>{planet.id === "sun" ? "G2V STAR" : `${planet.distanceAU.toFixed(3)} AU`}</small></span>
                <ChevronRight size={14} className="chip-arrow" />
              </button>
              ))}
          </div>
          <div className="minor-rail">
            {(["asteroid-belt", "ceres", "vesta", "pallas", "pluto", "eris", "kuiper-belt", "halley"] as PlanetId[]).map((id) => {
              const body = BODY_BY_ID[id];
              return (
                <button
                  type="button"
                  key={id}
                  className={`minor-chip ${selectedId === id ? "is-selected" : ""}`}
                  onClick={() => selectBody(id)}
                >
                  <span className="minor-chip-orb" style={{ background: `radial-gradient(circle at 32% 28%, ${body.accent}, ${body.color})` }} />
                  <span className="minor-chip-copy"><b>{body.name}</b><small>{body.distanceAU === 0 ? "FIELD" : `${body.distanceAU.toFixed(1)} AU`}</small></span>
                  <ChevronRight size={12} className="chip-arrow" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div className="telemetry-cell">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`mode-button ${active ? "is-active" : ""}`} onClick={onClick} role="tab" aria-selected={active}>
      {icon}<span>{label}</span>
    </button>
  );
}

function ToggleRow({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-label">{icon}{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-switch" aria-hidden="true"><span /></span>
    </label>
  );
}

import { geoBounds, geoCentroid, geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { feature as topoFeature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

export const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
export const COUNTRY_METADATA_URL = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
export const ATLAS_WIDTH = 1200;
export const ATLAS_HEIGHT = 670;
export const MIN_ATLAS_ZOOM = 1;
export const MAX_ATLAS_ZOOM = 24;

export type CountryFeature = Feature<Polygon | MultiPolygon, { name?: string }>;
export type CountryPoint = { lat: number; lon: number; source: "metadata" | "geometry" };
export type CountryMetadata = {
  id: string;
  name: string;
  officialName?: string;
  alpha2?: string;
  alpha3?: string;
  numericCode?: string;
  capitals: string[];
  region?: string;
  subregion?: string;
  languages: string[];
  areaKm2?: number;
  point: CountryPoint | null;
  aliases: string[];
};
export type AtlasCountry = CountryMetadata & {
  features: CountryFeature[];
  hasMetadata: boolean;
  searchText: string;
};
export type AtlasTransform = { x: number; y: number; k: number };
export type AtlasMarker = { id: string; name: string; x: number; y: number; priority: number; pointOnly: boolean };
export type AtlasShape = { key: string; countryId: string; name: string; path: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const texts = (value: unknown): string[] =>
  Array.isArray(value) ? value.flatMap((entry) => text(entry) ? [text(entry)!] : []) : [];

export function normalizeLongitude(lon: number): number {
  if (!Number.isFinite(lon)) return 0;
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

/** West > east is a short interval across the antimeridian, not most of Earth. */
export function longitudeSpan(west: number, east: number): number {
  if (!Number.isFinite(west) || !Number.isFinite(east)) return 0;
  if (Math.abs(east - west) >= 360) return 360;
  return ((east - west) % 360 + 360) % 360;
}

export function numericCountryId(value: unknown): string | undefined {
  const id = typeof value === "number" ? String(value) : text(value);
  return id && /^\d{1,3}$/.test(id) && Number(id) > 0 ? id.padStart(3, "0") : undefined;
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function metadataPoint(value: unknown): CountryPoint | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [lat, lon] = value;
  return typeof lat === "number" && typeof lon === "number" &&
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90
    ? { lat, lon: normalizeLongitude(lon), source: "metadata" } : null;
}

/** Only copy fields present in the source. Missing facts stay missing. */
export function parseCountryMetadata(input: unknown): CountryMetadata[] {
  if (!Array.isArray(input)) throw new Error("Country metadata has an unexpected format.");
  const countries: CountryMetadata[] = [];
  for (const entry of input) {
    if (!isRecord(entry) || !isRecord(entry.name)) continue;
    const name = text(entry.name.common);
    if (!name) continue;
    const alpha2 = text(entry.cca2);
    const alpha3 = text(entry.cca3);
    const numericCode = numericCountryId(entry.ccn3);
    const officialName = text(entry.name.official);
    const aliases = [name, officialName, alpha2, alpha3, numericCode, ...texts(entry.altSpellings)];
    for (const names of [entry.translations, entry.name.native]) {
      if (isRecord(names)) for (const translated of Object.values(names)) {
        if (isRecord(translated)) aliases.push(text(translated.common), text(translated.official));
      }
    }
    countries.push({
      id: alpha3 || `metadata:${numericCode || normalizeSearch(name)}`,
      name, officialName, alpha2, alpha3, numericCode,
      capitals: texts(entry.capital),
      region: text(entry.region), subregion: text(entry.subregion),
      languages: isRecord(entry.languages) ? texts(Object.values(entry.languages)) : [],
      areaKm2: typeof entry.area === "number" && Number.isFinite(entry.area) && entry.area >= 0 ? entry.area : undefined,
      point: metadataPoint(entry.latlng),
      aliases: [...new Set(aliases.filter((alias): alias is string => Boolean(alias)))],
    });
  }
  if (!countries.length) throw new Error("The metadata source returned no country records.");
  return countries;
}

export function decodeWorldAtlas(input: unknown): CountryFeature[] {
  if (!isRecord(input) || input.type !== "Topology" || !Array.isArray(input.arcs) ||
    !isRecord(input.objects) || !isRecord(input.objects.countries) ||
    input.objects.countries.type !== "GeometryCollection") {
    throw new Error("The boundary source returned an unexpected map format.");
  }
  const topology = input as unknown as Topology<{ countries: GeometryCollection<{ name?: string }> }>;
  const collection = topoFeature(topology, topology.objects.countries);
  const features = collection.features.filter((entry): entry is CountryFeature =>
    entry.geometry?.type === "Polygon" || entry.geometry?.type === "MultiPolygon");
  if (!features.length) throw new Error("The boundary source returned no country polygons.");
  return features;
}

/** Numeric ISO codes first; exact source aliases only when a numeric join is unavailable. */
export function joinAtlasCountries(metadata: readonly CountryMetadata[], features: readonly CountryFeature[]): AtlasCountry[] {
  const countries: AtlasCountry[] = metadata.map((country) => ({
    ...country, aliases: [...country.aliases], features: [], hasMetadata: true, searchText: "",
  }));
  const byNumeric = new Map(countries.filter((c) => c.numericCode).map((c) => [c.numericCode!, c]));
  const byName = new Map<string, AtlasCountry>();
  for (const country of countries) for (const alias of country.aliases) {
    byName.set(normalizeSearch(alias), country);
  }
  for (const feature of features) {
    const numericCode = numericCountryId(feature.id);
    const sourceName = text(feature.properties?.name);
    let country = (numericCode ? byNumeric.get(numericCode) : undefined) ||
      (sourceName ? byName.get(normalizeSearch(sourceName)) : undefined);
    if (!country) {
      const name = sourceName || (numericCode ? `Map entry ${numericCode}` : "Unnamed map entry");
      country = {
        id: `map:${numericCode || normalizeSearch(name)}`,
        name, numericCode, capitals: [], languages: [], aliases: [name], point: null,
        features: [], hasMetadata: false, searchText: "",
      };
      countries.push(country);
      if (numericCode) byNumeric.set(numericCode, country);
      if (sourceName) byName.set(normalizeSearch(sourceName), country);
    }
    country.features.push(feature);
    if (sourceName && !country.aliases.includes(sourceName)) country.aliases.push(sourceName);
  }
  for (const country of countries) {
    if (!country.point && country.features.length) {
      const [lon, lat] = geoCentroid({ type: "FeatureCollection", features: country.features });
      if (Number.isFinite(lon) && Number.isFinite(lat)) country.point = { lat, lon: normalizeLongitude(lon), source: "geometry" };
    }
    country.searchText = normalizeSearch([
      ...country.aliases, country.numericCode, country.alpha2, country.alpha3,
      ...country.capitals, country.region, country.subregion,
    ].filter(Boolean).join(" "));
  }
  return countries.sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function findAtlasCountry(countries: readonly AtlasCountry[], value: string | null | undefined): AtlasCountry | undefined {
  if (!value) return undefined;
  // Keep a boundary-only selection when its metadata arrives later or succeeds on retry.
  const sourceKey = value.startsWith("map:") ? value.slice(4) : value;
  const query = normalizeSearch(sourceKey);
  const numeric = numericCountryId(sourceKey);
  return countries.find((country) => country.id === value ||
    (numeric && country.numericCode === numeric) || country.aliases.some((alias) => normalizeSearch(alias) === query));
}

export function searchAtlasCountries(countries: readonly AtlasCountry[], query: string): AtlasCountry[] {
  const normalized = numericCountryId(query) || normalizeSearch(query);
  if (!normalized) return [...countries];
  const tokens = normalized.split(/\s+/);
  const rank = (country: AtlasCountry) => {
    if ([country.name, country.alpha2, country.alpha3, country.numericCode]
      .some((value) => value && normalizeSearch(value) === normalized)) return 0;
    return normalizeSearch(country.name).startsWith(normalized) ? 1 : 2;
  };
  return countries.filter((country) => tokens.every((token) => country.searchText.includes(token)))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "en"));
}

export function clampAtlasZoom(zoom: number): number {
  return Number.isFinite(zoom) ? Math.min(MAX_ATLAS_ZOOM, Math.max(MIN_ATLAS_ZOOM, zoom)) : MIN_ATLAS_ZOOM;
}

export function clampAtlasTransform(transform: AtlasTransform, width = ATLAS_WIDTH, height = ATLAS_HEIGHT): AtlasTransform {
  const k = clampAtlasZoom(transform.k);
  return {
    k,
    x: Math.min(0, Math.max(width * (1 - k), Number.isFinite(transform.x) ? transform.x : 0)),
    y: Math.min(0, Math.max(height * (1 - k), Number.isFinite(transform.y) ? transform.y : 0)),
  };
}

/** Keep the geographic point under the cursor fixed while zooming. */
export function zoomAtlasAt(transform: AtlasTransform, zoom: number, point: [number, number]): AtlasTransform {
  const k = clampAtlasZoom(zoom);
  const ratio = k / clampAtlasZoom(transform.k);
  return clampAtlasTransform({ k, x: point[0] + (transform.x - point[0]) * ratio, y: point[1] + (transform.y - point[1]) * ratio });
}

export function createAtlasProjection() {
  return geoEqualEarth().precision(0.2)
    .fitExtent([[30, 38], [ATLAS_WIDTH - 30, ATLAS_HEIGHT - 38]], { type: "Sphere" });
}

/** Spherical clipping in d3-geo preserves antimeridian splits and polygon holes. */
export function projectAtlasCountries(countries: readonly AtlasCountry[]) {
  const projection = createAtlasProjection();
  const path = geoPath(projection).digits(2);
  const shapes: AtlasShape[] = [];
  const markers: AtlasMarker[] = [];
  const focus = new Map<string, AtlasTransform>();
  for (const country of countries) {
    for (const [index, feature] of country.features.entries()) {
      shapes.push({ key: `${country.id}:${index}`, countryId: country.id, name: country.name, path: path(feature) || "" });
    }
    if (!country.point) continue;
    const point = projection([country.point.lon, country.point.lat]);
    if (!point || !point.every(Number.isFinite)) continue;
    const collection = { type: "FeatureCollection" as const, features: country.features };
    let width = 15;
    let height = 15;
    if (country.features.length) {
      const [[x0, y0], [x1, y1]] = path.bounds(collection);
      const [[west, south], [east, north]] = geoBounds(collection);
      // A Fiji-style split polygon has a misleading world-wide projected box.
      const crossesDateline = west > east;
      width = crossesDateline ? Math.max(15, longitudeSpan(west, east) / 360 * ATLAS_WIDTH) : x1 - x0;
      height = crossesDateline ? Math.max(15, (north - south) / 180 * ATLAS_HEIGHT) : y1 - y0;
    }
    const k = Math.min(16, Math.max(1.5, Math.min(ATLAS_WIDTH * 0.56 / Math.max(15, width), ATLAS_HEIGHT * 0.56 / Math.max(15, height))));
    focus.set(country.id, clampAtlasTransform({ k, x: ATLAS_WIDTH / 2 - point[0] * k, y: ATLAS_HEIGHT / 2 - point[1] * k }));
    markers.push({ id: country.id, name: country.name, x: point[0], y: point[1], priority: width * height, pointOnly: country.features.length === 0 });
  }
  return { shapes, markers, focus, sphere: path({ type: "Sphere" }) || "", graticule: path(geoGraticule10()) || "" };
}

export function formatAtlasCoordinates(point: Pick<CountryPoint, "lat" | "lon">): string {
  const lon = normalizeLongitude(point.lon);
  return `${Math.abs(point.lat).toFixed(2)}° ${point.lat < 0 ? "S" : "N"} · ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? "W" : "E"}`;
}

export const atlasLabelText = (name: string) => name.length > 30 ? `${name.slice(0, 29)}…` : name;

/** Greedy screen-space labels; every marker and every indexed country remains available. */
export function visibleAtlasLabels(markers: readonly AtlasMarker[], view: AtlasTransform, selectedId?: string): Set<string> {
  const visible = new Set<string>();
  const occupied: [number, number, number, number][] = [];
  const ordered = [...markers].sort((a, b) =>
    Number(b.id === selectedId) - Number(a.id === selectedId) || b.priority - a.priority);
  for (const marker of ordered) {
    const selected = marker.id === selectedId;
    if (!selected && view.k < 10 && marker.priority * view.k ** 2 < 1800) continue;
    const x = marker.x * view.k + view.x;
    const y = marker.y * view.k + view.y;
    if (x < 0 || y < 0 || x > ATLAS_WIDTH || y > ATLAS_HEIGHT) continue;
    const box: [number, number, number, number] = [x + 7, y - 18, x + 13 + atlasLabelText(marker.name).length * 6.15, y - 1];
    if (!selected && (box[2] > ATLAS_WIDTH || occupied.some(([x0, y0, x1, y1]) => box[0] < x1 && box[2] > x0 && box[1] < y1 && box[3] > y0))) continue;
    occupied.push(box);
    visible.add(marker.id);
  }
  return visible;
}

async function fetchAtlasJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error("The source timed out. Please retry.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Shared only after this lazy module is loaded. Successful requests survive close/reopen;
// rejected requests are evicted separately, so retrying one source preserves the other.
let geometryRequest: Promise<CountryFeature[]> | undefined;
let metadataRequest: Promise<CountryMetadata[]> | undefined;

export function loadAtlasGeometry(): Promise<CountryFeature[]> {
  return geometryRequest ??= fetchAtlasJson(WORLD_ATLAS_URL).then(decodeWorldAtlas).catch((error: unknown) => {
    geometryRequest = undefined;
    throw error;
  });
}

export function loadAtlasMetadata(): Promise<CountryMetadata[]> {
  return metadataRequest ??= fetchAtlasJson(COUNTRY_METADATA_URL).then(parseCountryMetadata).catch((error: unknown) => {
    metadataRequest = undefined;
    throw error;
  });
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { geoPath } from "d3-geo";
import {
  ATLAS_HEIGHT, ATLAS_WIDTH, COUNTRY_METADATA_URL, MAX_ATLAS_ZOOM, WORLD_ATLAS_URL,
  clampAtlasTransform, clampAtlasZoom, createAtlasProjection, decodeWorldAtlas,
  findAtlasCountry, formatAtlasCoordinates, joinAtlasCountries, loadAtlasGeometry,
  loadAtlasMetadata, longitudeSpan, normalizeLongitude, normalizeSearch, numericCountryId,
  parseCountryMetadata, projectAtlasCountries, searchAtlasCountries, visibleAtlasLabels, zoomAtlasAt,
  type AtlasMarker, type CountryFeature,
} from "./earth-atlas";

const polygon = (name: string, id?: string | number): CountryFeature => ({
  type: "Feature", id, properties: { name }, geometry: { type: "Polygon", coordinates: [
    [[10, -10], [10, 10], [30, 10], [30, -10], [10, -10]],
  ] },
});

const rawMetadata = [
  { name: { common: "Australia", official: "Commonwealth of Australia" }, cca2: "AU", cca3: "AUS", ccn3: "036", capital: ["Canberra"], region: "Oceania", subregion: "Australia and New Zealand", latlng: [-27, 133], area: 7692024, languages: { eng: "English" } },
  { name: { common: "Vatican City", official: "Vatican City State", native: { ita: { common: "Città del Vaticano" } } }, cca2: "VA", cca3: "VAT", ccn3: "336", capital: ["Vatican City"], region: "Europe", latlng: [41.9, 12.45], area: 0.44 },
  { name: { common: "Ivory Coast", official: "Republic of Côte d’Ivoire" }, cca2: "CI", cca3: "CIV", ccn3: "384", capital: ["Yamoussoukro"], region: "Africa", latlng: [8, -5], altSpellings: ["Côte d'Ivoire"] },
  { name: { common: "Kosovo" }, cca2: "XK", cca3: "UNK", ccn3: "", capital: ["Pristina"], latlng: [42.66, 21.16] },
  { name: { common: "Tokelau" }, cca2: "TK", cca3: "TKL", ccn3: "772", capital: [], latlng: [-9, -172] },
];

const topology = {
  type: "Topology", objects: { countries: { type: "GeometryCollection", geometries: [
    { type: "Polygon", id: "036", properties: { name: "Australia" }, arcs: [[0]] },
  ] } }, arcs: [[[10, -10], [10, 10], [30, 10], [30, -10], [10, -10]]],
};

test("longitude normalization keeps west negative and handles dateline intervals", () => {
  assert.equal(normalizeLongitude(-74), -74);
  assert.equal(normalizeLongitude(286), -74);
  assert.equal(normalizeLongitude(-181), 179);
  assert.equal(normalizeLongitude(180), -180);
  assert.equal(longitudeSpan(177, -178), 5);
  assert.equal(longitudeSpan(-180, 180), 360);
  assert.equal(formatAtlasCoordinates({ lat: -9, lon: -172 }), "9.00° S · 172.00° W");
});

test("numeric identifiers preserve leading zeroes without joining missing IDs", () => {
  assert.equal(numericCountryId(36), "036");
  assert.equal(numericCountryId("004"), "004");
  for (const id of ["", "-99", undefined, NaN, "UNK", "0360", 0]) assert.equal(numericCountryId(id), undefined);
});

test("source parsing keeps missing details unknown and rejects invalid data", () => {
  const parsed = parseCountryMetadata(rawMetadata);
  assert.equal(parsed[1].areaKm2, 0.44);
  assert.equal(parsed[2].point?.lon, -5);
  assert.deepEqual(parsed[4].capitals, []);
  assert.equal(parsed[4].region, undefined);
  assert.deepEqual(parsed[0].languages, ["English"]);
  assert.equal(parseCountryMetadata([{ name: { common: "Test" }, latlng: [99, 12], area: -1 }])[0].point, null);
  assert.throws(() => parseCountryMetadata({}), /unexpected format/);
  assert.throws(() => parseCountryMetadata([]), /no country records/);
  assert.throws(() => decodeWorldAtlas({ type: "FeatureCollection" }), /unexpected map format/);
  assert.equal(decodeWorldAtlas(topology)[0].id, "036");
});

test("numeric joins combine multi-feature countries and preserve microstates and map-only entries", () => {
  const metadata = parseCountryMetadata(rawMetadata);
  const countries = joinAtlasCountries(metadata, [
    polygon("Australia", 36), polygon("Ashmore and Cartier Is.", "036"),
    polygon("Kosovo"), polygon("N. Cyprus"), polygon("Somaliland", "-99"),
  ]);
  assert.equal(countries.length, 7);
  assert.equal(countries.find((country) => country.id === "AUS")?.features.length, 2);
  assert.equal(countries.find((country) => country.id === "UNK")?.features.length, 1);
  const vatican = findAtlasCountry(countries, "VA")!;
  assert.equal(vatican.features.length, 0);
  assert.equal(vatican.point?.source, "metadata");
  assert.equal(vatican.point?.lat, 41.9);
  assert.equal(findAtlasCountry(countries, "36")?.id, "AUS");
  assert.equal(findAtlasCountry(countries, "map:036")?.id, "AUS", "selection survives metadata loading later");
  assert.equal(findAtlasCountry(countries, "map:kosovo")?.id, "UNK");
  assert.equal(findAtlasCountry(countries, "N. Cyprus")?.hasMetadata, false);
  assert.equal(findAtlasCountry(countries, "Somaliland")?.point?.source, "geometry");
  assert.equal(metadata[0].aliases.includes("Ashmore and Cartier Is."), false, "join does not mutate metadata cache");
  const projected = projectAtlasCountries(countries);
  assert.equal(projected.markers.length, countries.length);
  assert.equal(projected.markers.find((marker) => marker.id === "VAT")?.pointOnly, true);
});

test("search supports accented, native, capital, ISO and territory names", () => {
  const countries = joinAtlasCountries(parseCountryMetadata(rawMetadata), []);
  assert.equal(normalizeSearch("Côte d’Ivoire"), "cote divoire");
  for (const query of ["cote d'ivoire", "Yamoussoukro", "CIV", "384", "ci"]) {
    assert.equal(searchAtlasCountries(countries, query)[0]?.id, "CIV");
  }
  assert.equal(searchAtlasCountries(countries, "citta del vaticano")[0]?.id, "VAT");
  assert.equal(searchAtlasCountries(countries, "tokelau")[0]?.id, "TKL");
  assert.equal(searchAtlasCountries(countries, "36")[0]?.id, "AUS");
  assert.equal(searchAtlasCountries(joinAtlasCountries([], [polygon("Australia", 36)]), "036")[0]?.id, "map:036");
  assert.equal(searchAtlasCountries(countries, "no such country").length, 0);
  assert.equal(searchAtlasCountries(countries, "").length, countries.length);
});

test("zoom clamps are finite, constrain pan, and preserve the cursor anchor", () => {
  assert.equal(clampAtlasZoom(-100), 1);
  assert.equal(clampAtlasZoom(1e6), MAX_ATLAS_ZOOM);
  assert.equal(clampAtlasZoom(NaN), 1);
  assert.deepEqual(clampAtlasTransform({ x: 900, y: -1e6, k: 2 }), { x: 0, y: -ATLAS_HEIGHT, k: 2 });
  assert.deepEqual(clampAtlasTransform({ x: -100, y: 400, k: 1 }), { x: 0, y: 0, k: 1 });
  const current = { x: -300, y: -180, k: 2 };
  const cursor: [number, number] = [400, 300];
  const next = zoomAtlasAt(current, 4, cursor);
  assert.equal((cursor[0] - current.x) / current.k, (cursor[0] - next.x) / next.k);
  assert.equal((cursor[1] - current.y) / current.k, (cursor[1] - next.y) / next.k);
  assert.ok(next.x >= ATLAS_WIDTH * (1 - next.k));
});

test("antimeridian polygons are clipped into short edge paths, never a world-spanning diagonal", () => {
  const dateline: CountryFeature = { type: "Feature", properties: { name: "Dateline test" }, geometry: {
    type: "Polygon", coordinates: [[[179, -10], [179, 10], [-179, 10], [-179, -10], [179, -10]]],
  } };
  const countries = joinAtlasCountries([], [dateline]);
  assert.ok(Math.abs(countries[0].point!.lon) > 170, "centroid remains at the dateline");
  const projected = projectAtlasCountries(countries);
  const path = projected.shapes[0].path;
  assert.ok(!/NaN|Infinity/.test(path));
  const pieces = path.split("M").filter(Boolean);
  assert.equal(pieces.length, 2);
  for (const piece of pieces) {
    const numbers = (piece.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const xs = numbers.filter((_, index) => index % 2 === 0);
    assert.ok(Math.max(...xs) - Math.min(...xs) < ATLAS_WIDTH * .1);
  }
  assert.ok(projected.focus.get(countries[0].id)!.k > 4, "split bounds do not force a whole-world zoom");
});

test("polygon interior rings remain holes in the projected geometry", () => {
  const outer = [[-10, -10], [-10, 10], [10, 10], [10, -10], [-10, -10]];
  const hole = [[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]];
  const feature: CountryFeature = { type: "Feature", properties: { name: "Hole test" }, geometry: { type: "Polygon", coordinates: [outer, hole] } };
  const path = geoPath(createAtlasProjection());
  const outerArea = path.area({ ...feature, geometry: { type: "Polygon", coordinates: [outer] } });
  assert.ok(path.area(feature) < outerArea * .9);
  assert.equal(projectAtlasCountries(joinAtlasCountries([], [feature])).shapes[0].path.match(/M/g)?.length, 2);
});

test("declutter gives selection priority and reveals tiny-country labels at high zoom", () => {
  const markers: AtlasMarker[] = [
    { id: "BIG", name: "Large place", x: 20, y: 20, priority: 10000, pointOnly: false },
    { id: "TINY", name: "Small place", x: 20, y: 20, priority: 1, pointOnly: true },
  ];
  const world = { x: 0, y: 0, k: 1 };
  assert.deepEqual([...visibleAtlasLabels(markers, world)], ["BIG"]);
  assert.deepEqual([...visibleAtlasLabels(markers, world, "TINY")], ["TINY"]);
  assert.ok(visibleAtlasLabels([markers[1]], { ...world, k: 10 }).has("TINY"));
});

test("independent source failures can retry while successful requests stay cached", async (context) => {
  const calls = new Map<string, number>();
  context.mock.method(globalThis, "fetch", async (url: string) => {
    const attempt = (calls.get(url) || 0) + 1;
    calls.set(url, attempt);
    if (attempt === 1) return new Response("unavailable", { status: 503 });
    if (url === WORLD_ATLAS_URL && attempt === 2) throw new Error("Boundary network failure");
    return Response.json(url === WORLD_ATLAS_URL ? topology : rawMetadata);
  });
  const failed = await Promise.allSettled([loadAtlasGeometry(), loadAtlasMetadata()]);
  assert.deepEqual(failed.map((result) => result.status), ["rejected", "rejected"]);
  const metadataRequest = loadAtlasMetadata();
  assert.strictEqual(metadataRequest, loadAtlasMetadata(), "pending metadata is shared");
  assert.equal((await metadataRequest).length, rawMetadata.length);
  await assert.rejects(loadAtlasGeometry(), /Boundary network failure/);
  assert.strictEqual(loadAtlasMetadata(), metadataRequest, "a boundary failure preserves metadata");
  const geometryRequest = loadAtlasGeometry();
  assert.strictEqual(geometryRequest, loadAtlasGeometry());
  assert.equal((await geometryRequest).length, 1);
  assert.strictEqual(loadAtlasGeometry(), geometryRequest, "successful boundaries are cached");
  assert.equal(calls.get(WORLD_ATLAS_URL), 3);
  assert.equal(calls.get(COUNTRY_METADATA_URL), 2);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FEATURE_KIND_LABELS, PLANET_EXPLORATION, filterPlanetFeatures,
  type ExplorablePlanet,
} from "./planet-exploration";

const planets: ExplorablePlanet[] = [
  "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune",
];

function assertScientificUrl(value: string) {
  const url = new URL(value);
  assert.equal(url.protocol, "https:", `${value} must use HTTPS`);
  assert.equal(url.username, "");
  assert.equal(url.password, "");
  assert.ok(["nasa.gov", "usgs.gov", "esa.int"].some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
  ), `${value} must link to the cited scientific institution`);
}

test("the guide covers exactly the eight major planets", () => {
  assert.deepEqual(Object.keys(PLANET_EXPLORATION).sort(), [...planets].sort());
});

for (const planet of planets) {
  test(`${planet}: usable features, valid coordinates and scientific provenance`, () => {
    const guide = PLANET_EXPLORATION[planet];
    assert.ok(guide.features.length >= (guide.domain === "surface" ? 4 : 3));
    assert.equal(new Set(guide.features.map((feature) => feature.id)).size, guide.features.length);
    assert.equal(new Set(guide.features.map((feature) => feature.name)).size, guide.features.length);
    assert.ok(guide.summary.trim());
    assert.ok(guide.interior.trim());
    assert.ok(guide.viewDescription.trim());
    assert.ok(guide.coordinateNote.trim());
    assert.ok(guide.environment.length >= 3);
    assert.ok(guide.missions.length >= 2);
    assert.ok(guide.sources.length >= 2);
    assert.ok(guide.limitations.length >= 1);
    assert.match(guide.accent, /^#[0-9a-f]{6}$/i);

    for (const feature of guide.features) {
      assert.match(feature.id, new RegExp(`^${planet}-[a-z0-9-]+$`));
      assert.ok(feature.name.trim());
      assert.ok(feature.description.trim());
      assert.ok(FEATURE_KIND_LABELS[feature.kind]);
      assert.ok(Number.isFinite(feature.lat) && feature.lat >= -90 && feature.lat <= 90, feature.id);
      assert.ok(Number.isFinite(feature.lon) && feature.lon >= -180 && feature.lon <= 180, feature.id);
      assertScientificUrl(feature.sourceUrl);
    }
    for (const fact of guide.environment) {
      assert.ok(fact.label.trim());
      assert.ok(fact.value.trim());
    }
    for (const mission of guide.missions) {
      assert.ok(mission.name.trim());
      assert.ok(mission.agency.trim());
      assert.match(mission.date, /\b(?:19|20)\d{2}\b/, `${mission.name} needs a dated milestone`);
      assert.ok(mission.description.trim());
      assertScientificUrl(mission.sourceUrl);
      assert.equal("status" in mission, false, "the guide must not imply live mission status");
    }
    for (const source of guide.sources) {
      assert.ok(source.label.trim());
      assertScientificUrl(source.url);
    }
  });
}

test("feature IDs cannot collide when the scene switches worlds", () => {
  const ids = Object.values(PLANET_EXPLORATION).flatMap((guide) => guide.features.map((feature) => feature.id));
  assert.equal(new Set(ids).size, ids.length);
});

test("gas and ice giants only contain explicitly approximate atmospheric pins", () => {
  for (const planet of ["jupiter", "saturn", "uranus", "neptune"] as const) {
    const guide = PLANET_EXPLORATION[planet];
    assert.equal(guide.domain, "atmosphere");
    assert.match(guide.viewDescription, /no solid surface/i);
    assert.match(guide.coordinateNote, /longitudes are illustrative/i);
    for (const feature of guide.features) {
      assert.equal(feature.approximate, true, feature.id);
      assert.ok(["storm", "cloud-band", "polar-region"].includes(feature.kind), feature.id);
      assert.match(feature.description, /approximate/i, feature.id);
      assert.match(feature.description, /illustrative longitude/i, feature.id);
    }
  }
});

test("cloud-obscured and sparsely imaged worlds communicate their mapping limits", () => {
  assert.match(PLANET_EXPLORATION.venus.viewDescription, /radar/i);
  assert.match(PLANET_EXPLORATION.venus.viewDescription, /opaque clouds/i);
  for (const planet of ["uranus", "neptune"] as const) {
    assert.match(PLANET_EXPLORATION[planet].viewDescription, /imagery is limited/i);
  }
  const darkSpot = PLANET_EXPLORATION.neptune.features.find((feature) => feature.id === "neptune-dark-spot")!;
  assert.match(darkSpot.name, /1989/);
  assert.match(darkSpot.description, /disappeared/);
});

test("east-positive coordinates preserve known hemispheres and catalogue conversions", () => {
  const byId = (planet: ExplorablePlanet, id: string) => PLANET_EXPLORATION[planet].features.find((feature) => feature.id === id)!;
  assert.ok(byId("earth", "earth-london").lon < 0, "London is just west of Greenwich");
  assert.ok(byId("earth", "earth-tokyo").lon > 130, "Tokyo is in the eastern hemisphere");
  assert.ok(byId("earth", "earth-amazon").lat < 0 && byId("earth", "earth-amazon").lon < 0);
  assert.ok(byId("earth", "earth-antarctica").lat < -60);
  // USGS lists Mercury in west-positive degrees: 198.02 W → 161.98 E.
  assert.ok(Math.abs(byId("mercury", "mercury-caloris").lon - (360 - 198.02)) < 1e-8);
  assert.equal(byId("mercury", "mercury-discovery").lon, -37.24);
  // Planetary 0–360 E maps must wrap into the scene's [-180, 180] convention.
  assert.ok(Math.abs(byId("mars", "mars-olympus").lon - (226.2 - 360)) < 1e-8);
  assert.ok(Math.abs(byId("venus", "venus-maat").lon - (194.6 - 360)) < 1e-8);
  assert.ok(byId("mars", "mars-jezero").lat > 0 && byId("mars", "mars-jezero").lon > 0);
  assert.ok(byId("mars", "mars-gale").lat < 0 && byId("mars", "mars-gale").lon > 0);
});

test("search handles whitespace, mixed case, accents and scientific descriptions", () => {
  assert.deepEqual(filterPlanetFeatures(PLANET_EXPLORATION.earth.features, "  lOnDoN ").map((feature) => feature.id), ["earth-london"]);
  assert.deepEqual(filterPlanetFeatures(PLANET_EXPLORATION.mars.features, "pÉrsEvÉrAnCe").map((feature) => feature.id), ["mars-jezero"]);
  assert.deepEqual(filterPlanetFeatures(PLANET_EXPLORATION.mars.features, "  ancient   delta ").map((feature) => feature.id), ["mars-jezero"]);
  assert.equal(filterPlanetFeatures(PLANET_EXPLORATION.earth.features, "unfindable-example").length, 0);
});

test("category filtering intersects with search and never mutates source data", () => {
  const features = PLANET_EXPLORATION.mars.features;
  const originalIds = features.map((feature) => feature.id);
  const landingSites = filterPlanetFeatures(features, "", "landing-site");
  assert.equal(landingSites.length, 3);
  assert.ok(landingSites.every((feature) => feature.kind === "landing-site"));
  assert.equal(filterPlanetFeatures(features, "Olympus", "landing-site").length, 0);
  assert.deepEqual(filterPlanetFeatures(features, "   ").map((feature) => feature.id), originalIds);
  assert.deepEqual(features.map((feature) => feature.id), originalIds);
});

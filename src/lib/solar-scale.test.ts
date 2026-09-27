import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import {
  AU_SCALE, SCENE_UNITS_PER_KM, SUN_CORONA_MULTIPLIER, bodyRadius, orbitRadius,
  overviewFrame, cameraClipping, projectedDiameter, visibleSceneBounds, layoutLocatorLabels,
  LOCATOR_LABEL_HEIGHT, LOCATOR_LABEL_WIDTH, type ScaleMode, type OverviewMode,
} from "./solar-scale";

const bodies = [
  { name: "Mercury", au: 0.387, radiusKm: 2439.7 },
  { name: "Venus", au: 0.723, radiusKm: 6051.8 },
  { name: "Earth", au: 1, radiusKm: 6371 },
  { name: "Mars", au: 1.524, radiusKm: 3389.5 },
  { name: "Jupiter", au: 5.203, radiusKm: 69911 },
  { name: "Saturn", au: 9.537, radiusKm: 58232 },
  { name: "Uranus", au: 19.191, radiusKm: 25362 },
  { name: "Neptune", au: 30.069, radiusKm: 24622 },
];

test("interactive Mercury and Venus clear the entire enlarged solar corona", () => {
  const solarEnvelope = bodyRadius(695700, "exploration") * SUN_CORONA_MULTIPLIER;
  for (const body of bodies) {
    const bodyEnvelope = bodyRadius(body.radiusKm, "exploration") * 1.12;
    assert.ok(orbitRadius(body.au, "exploration") - bodyEnvelope > solarEnvelope + 1, body.name);
  }
});

test("enlarged planetary discs never intersect each other at any orbital phase", () => {
  for (let i = 1; i < bodies.length; i++) {
    const a = bodies[i - 1];
    const b = bodies[i];
    const clearance = orbitRadius(b.au, "exploration") - orbitRadius(a.au, "exploration");
    const extent = (body: typeof bodies[number]) => bodyRadius(body.radiusKm, "exploration") *
      (body.name === "Saturn" ? 2.62 : body.name === "Uranus" ? 2.06 : 1.12);
    const envelope = extent(a) + extent(b);
    assert.ok(clearance > envelope, `${a.name} / ${b.name}`);
  }
});

test("physical size and AU ratios are unchanged; padding is display-only", () => {
  assert.equal(orbitRadius(0, "exploration"), 0);
  for (const body of bodies) {
    assert.equal(orbitRadius(body.au, "physical"), body.au * AU_SCALE);
    assert.equal(bodyRadius(body.radiusKm, "physical"), body.radiusKm * SCENE_UNITS_PER_KM);
  }
  const sunAngle = 2 * Math.atan(bodyRadius(695700, "physical") / orbitRadius(1, "physical")) * 180 / Math.PI;
  assert.ok(sunAngle > 0.53 && sunAngle < 0.54);
});

test("both overview presets fit every phase within the unobstructed desktop viewport", () => {
  for (const mode of ["physical", "exploration"] as ScaleMode[])
    for (const view of ["inner", "system"] as OverviewMode[])
      for (const [width, height] of [[1160, 720], [1440, 900], [1920, 1080], [2560, 1080]]) {
        const frame = overviewFrame(mode, view, width, height);
        const bounds = visibleSceneBounds(width, height);
        const clip = cameraClipping(frame.distance);
        const camera = new PerspectiveCamera(42, width / height, clip.near, clip.far);
        camera.position.set(...frame.position);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        assert.ok(frame.distance < 6000);
        for (let sample = 0; sample < 180; sample++) {
          const angle = sample * Math.PI * 2 / 180;
          const p = new Vector3(Math.cos(angle) * frame.extent, 0, Math.sin(angle) * frame.extent).project(camera);
          const x = (p.x + 1) * width / 2;
          const y = (1 - p.y) * height / 2;
          assert.ok(x >= bounds.left && x <= bounds.right, `${mode}/${view} horizontal fit`);
          assert.ok(y >= bounds.top && y <= bounds.bottom, `${mode}/${view} vertical fit`);
          assert.ok(p.z > -1 && p.z < 1);
        }
      }
});

test("overview depth values do not collapse to the far plane", () => {
  const clip = cameraClipping(425);
  const camera = new PerspectiveCamera(42, 16 / 9, clip.near, clip.far);
  camera.updateMatrixWorld();
  const depthValues = [10, 100, 425, 1000].map((distance) => {
    const z = new Vector3(0, 0, -distance).project(camera).z;
    const quantized = Math.round((z + 1) / 2 * (2 ** 24 - 1));
    assert.ok(quantized < 2 ** 24 - 1);
    return quantized;
  });
  assert.equal(new Set(depthValues).size, 4);
});

test("close-up clipping stays in front of the surface through physical and display scales", () => {
  for (const mode of ["physical", "exploration"] as ScaleMode[]) for (const body of bodies) {
    const r = bodyRadius(body.radiusKm, mode);
    for (const factor of [1.025, 2.65, 4.5, 20]) {
      const distance = r * factor;
      const clip = cameraClipping(distance, r);
      assert.ok(clip.near > 0 && clip.near < distance - r);
      assert.ok(clip.far > distance);
    }
  }
});

test("physical overview locators reveal subpixel Sun and Earth, then yield to close-up geometry", () => {
  for (const radiusKm of [695700, 6371]) {
    const r = bodyRadius(radiusKm, "physical");
    assert.ok(projectedDiameter(r, 1000, 900) < 1);
    assert.ok(projectedDiameter(r, 4.5 * r, 900) > 18);
  }
});

test("nine clustered locator labels stay separate and inside the usable viewport", () => {
  for (const [width, height] of [[1160, 720], [1440, 900], [1920, 1080]]) {
    const points = Array.from({ length: 9 }, (_, i) => ({ id: String(i), x: width / 2 + i * .2, y: height / 2 }));
    const labels = layoutLocatorLabels(points, width, height);
    const bounds = visibleSceneBounds(width, height);
    for (const [i, a] of labels.entries()) {
      assert.ok(a.labelX >= bounds.left && a.labelX + LOCATOR_LABEL_WIDTH <= bounds.right);
      assert.ok(a.labelY >= bounds.top && a.labelY + LOCATOR_LABEL_HEIGHT <= bounds.bottom);
      for (const b of labels.slice(i + 1)) assert.ok(
        a.labelX + LOCATOR_LABEL_WIDTH <= b.labelX || b.labelX + LOCATOR_LABEL_WIDTH <= a.labelX ||
        a.labelY + LOCATOR_LABEL_HEIGHT <= b.labelY || b.labelY + LOCATOR_LABEL_HEIGHT <= a.labelY,
        `${a.id} overlaps ${b.id}`,
      );
    }
  }
});

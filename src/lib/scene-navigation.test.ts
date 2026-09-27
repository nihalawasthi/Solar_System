import { test } from "node:test";
import assert from "node:assert/strict";
import { Quaternion, Vector3 } from "three";
import { surfacePoint, surfaceCoordinates, coordinatesLabel, flightProgress, closeupDistances, followSurfaceFrame } from "./scene-navigation";

test("globe coordinates round-trip east, west, hemispheres and antimeridian", () => {
  for (const [lat, lon] of [[19.076, 72.878], [40.7, -74], [-33.8, 151.2], [0, 179.99], [-1, -179.99], [89.99, -50]]) {
    const p = surfacePoint(lat, lon, 0.000349);
    const actual = surfaceCoordinates(...p);
    assert.ok(Math.abs(actual.lat - lat) < 1e-6);
    assert.ok(Math.abs(actual.lon - lon) < 1e-6);
  }
});
test("longitude zero follows the middle of the equirectangular texture", () => {
  assert.deepEqual(surfacePoint(0, 0), [1, 0, -0]);
  assert.equal(coordinatesLabel(-33.8, -74), "33.80° S · 74.00° W");
});
test("flights complete for physical and enlarged scale without absolute epsilon", () => {
  assert.equal(flightProgress(0), 0);
  assert.equal(flightProgress(1.5), 1);
  assert.equal(flightProgress(200), 1);
  assert.ok(flightProgress(0.5) > 0 && flightProgress(0.5) < 1);
  for (const radius of [0.000349, 0.62, 5.4]) {
    const config = closeupDistances(radius, true);
    assert.ok(config.near < config.min);
    assert.ok(config.distance > radius);
    assert.ok(Math.abs(config.distance / radius - 2.65) < 1e-8);
  }
});

test("surface tracking rotates camera offsets with the planet rather than diving underground", () => {
  for (const radius of [0.000349, 0.62]) for (const angle of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const oldOrigin = new Vector3(radius * 0.98, 0, 0);
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle);
    const nextOrigin = oldOrigin.clone().applyQuaternion(rotation);
    const camera = new Vector3(radius * 2.65, 0, 0);
    followSurfaceFrame(camera, oldOrigin, nextOrigin, rotation);
    assert.ok(Math.abs(camera.length() / radius - 2.65) < 1e-8);
    assert.ok(camera.clone().sub(nextOrigin).dot(nextOrigin) > 0, "pin faces the camera");
    const userPan = new Vector3(0, radius * 0.1, 0);
    const panned = oldOrigin.clone().add(userPan);
    followSurfaceFrame(panned, oldOrigin, nextOrigin, rotation);
    assert.ok(Math.abs(panned.distanceTo(nextOrigin) / radius - 0.1) < 1e-8);
  }
});

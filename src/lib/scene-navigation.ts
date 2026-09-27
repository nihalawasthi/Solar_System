import type { Quaternion, Vector3 } from "three";

/** Shared coordinates for Three's default equirectangular SphereGeometry. */
export type GeographicTarget = { name: string; lat: number; lon: number };

export function surfacePoint(lat: number, lon: number, radius = 1): [number, number, number] {
  const latitude = lat * Math.PI / 180;
  const longitude = lon * Math.PI / 180;
  return [radius * Math.cos(latitude) * Math.cos(longitude), radius * Math.sin(latitude), -radius * Math.cos(latitude) * Math.sin(longitude)];
}

export function surfaceCoordinates(x: number, y: number, z: number) {
  const length = Math.hypot(x, y, z);
  if (!length) return { lat: 0, lon: 0 };
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, y / length))) * 180 / Math.PI,
    lon: Math.atan2(-z, x) * 180 / Math.PI,
  };
}

export function coordinatesLabel(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"} · ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? "W" : "E"}`;
}

/** Exponential easing in a fixed duration, independent of scene scale. */
export function flightProgress(elapsed: number, duration = 1.5) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  return t * t * (3 - 2 * t);
}

export function closeupDistances(radius: number, surface = false) {
  const safeRadius = Math.max(radius, 1e-9);
  return { min: safeRadius * (surface ? 0.07 : 1.22), near: safeRadius * 0.008, distance: safeRadius * (surface ? 2.65 : 4.5) };
}

/** Move a mutable camera/controls point with a surface without discarding user offsets. */
export function followSurfaceFrame(position: Vector3, previousOrigin: Vector3, nextOrigin: Vector3, rotationDelta: Quaternion) {
  return position.sub(previousOrigin).applyQuaternion(rotationDelta).add(nextOrigin);
}

export type ScaleMode = "physical" | "exploration";
export type OverviewMode = "inner" | "system";
export const AU_SCALE = 8.2;
export const KM_PER_AU = 149_597_870.7;
export const SCENE_UNITS_PER_KM = AU_SCALE / KM_PER_AU;
export const SUN_CORONA_MULTIPLIER = 1.34;
// Display-only padding around the enlarged Sun. Physical distances never use it.
export const INTERACTIVE_ORBIT_PADDING = 6;

export function bodyRadius(radiusKm: number, mode: ScaleMode): number {
  if (mode === "physical") return radiusKm * SCENE_UNITS_PER_KM;
  if (radiusKm > 500_000) return 5.4;
  return Math.max(0.28, Math.pow(radiusKm / 6_371, 0.52) * 0.52);
}

export function orbitRadius(distanceAU: number, mode: ScaleMode): number {
  if (distanceAU <= 0) return 0;
  return distanceAU * AU_SCALE + (mode === "exploration" ? INTERACTIVE_ORBIT_PADDING : 0);
}

/** Match the desktop HUD, with padding for labels above/below the scene. */
export function visibleSceneBounds(width: number, height: number) {
  const left = Math.min(width * 0.32, width <= 1300 ? 312 : 405);
  const right = width - Math.min(width * 0.29, 357);
  const top = Math.min(178, height * 0.25);
  const bottom = height - Math.min(155, height * 0.23);
  return { left, right, top, bottom };
}

/** Fit a sphere enclosing every orbital phase, not just the current positions. */
export function overviewFrame(mode: ScaleMode, view: OverviewMode, width: number, height: number, fov = 42) {
  const bounds = visibleSceneBounds(width, height);
  const halfWidth = Math.max(50, Math.min(width / 2 - bounds.left, bounds.right - width / 2));
  const halfHeight = Math.max(50, Math.min(height / 2 - bounds.top, bounds.bottom - height / 2));
  const tangent = Math.tan(fov * Math.PI / 360);
  const halfAngle = Math.atan(tangent * Math.min(halfWidth, halfHeight) * 2 / height);
  const extent = orbitRadius(view === "inner" ? 1.524 : 30.069, mode) + (view === "inner" ? 1.5 : 9);
  const distance = extent / Math.sin(halfAngle) * 1.12;
  // 40° above the ecliptic; radial fit is valid at any orientation.
  const elevation = 40 * Math.PI / 180;
  return { extent, distance, position: [0, Math.sin(elevation) * distance, Math.cos(elevation) * distance] as [number, number, number] };
}

/** Keep depth precision at overview distances without clipping close-up surfaces. */
export function cameraClipping(distance: number, bodyRadius = 0) {
  const clearance = Math.max(1e-10, distance - bodyRadius * 1.02);
  const near = Math.max(1e-10, Math.min(distance * 0.01, clearance * 0.25));
  return { near, far: Math.max(2000, distance * 2 + 1400) };
}

export function projectedDiameter(radius: number, distance: number, height: number, fov = 42) {
  return radius * height / (Math.max(distance, 1e-12) * Math.tan(fov * Math.PI / 360));
}

export type LocatorPoint = { id: string; x: number; y: number };
export type LocatorLabel = LocatorPoint & { labelX: number; labelY: number };
export const LOCATOR_LABEL_WIDTH = 104;
export const LOCATOR_LABEL_HEIGHT = 26;

/** Screen-space leaders separate Mercury/Venus/Earth when true-scale dots cluster. */
export function layoutLocatorLabels(points: readonly LocatorPoint[], width: number, height: number): LocatorLabel[] {
  const bounds = visibleSceneBounds(width, height);
  const placed: LocatorLabel[] = [];
  const overlap = (x: number, y: number) => placed.some((other) =>
    x < other.labelX + LOCATOR_LABEL_WIDTH + 5 && x + LOCATOR_LABEL_WIDTH + 5 > other.labelX &&
    y < other.labelY + LOCATOR_LABEL_HEIGHT + 5 && y + LOCATOR_LABEL_HEIGHT + 5 > other.labelY);
  for (const point of points) {
    let labelX = point.x + 13;
    let labelY = point.y - 13;
    let found = false;
    for (let row = 0; row < 18 && !found; row++) {
      const shift = row === 0 ? 0 : Math.ceil(row / 2) * 33 * (row % 2 ? -1 : 1);
      for (const dx of [13, -LOCATOR_LABEL_WIDTH - 13, LOCATOR_LABEL_WIDTH + 26, -2 * LOCATOR_LABEL_WIDTH - 26]) {
        const x = Math.max(bounds.left, Math.min(bounds.right - LOCATOR_LABEL_WIDTH, point.x + dx));
        const y = Math.max(bounds.top, Math.min(bounds.bottom - LOCATOR_LABEL_HEIGHT, point.y - 13 + shift));
        if (!overlap(x, y)) { labelX = x; labelY = y; found = true; break; }
      }
    }
    placed.push({ ...point, labelX, labelY });
  }
  return placed;
}

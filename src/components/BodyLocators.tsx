"use client";

import { memo, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, PerspectiveCamera, Vector3 } from "three";
import { bodyRadius, layoutLocatorLabels, projectedDiameter, LOCATOR_LABEL_WIDTH, type LocatorPoint, type ScaleMode } from "@/lib/solar-scale";

export type LocatorBody = { id: string; name: string; radiusKm: number; accent: string };
type LayerRef = RefObject<HTMLDivElement | null>;

/** Render ordinary, keyboard-accessible DOM outside the WebGL canvas. */
export const BodyLocators = memo(function BodyLocators({ layerRef, bodies, showLabels, onFocus }: {
  layerRef: LayerRef; bodies: readonly LocatorBody[]; showLabels: boolean; onFocus: (id: string) => void;
}) {
  return <div ref={layerRef} className="body-locators" aria-label="Object locator markers">
    {bodies.map((body) => <div key={body.id} data-locator={body.id} className="body-locator" style={{ "--locator-color": body.accent } as CSSProperties}>
      <svg className="locator-leader" width="1" height="1" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0" /></svg>
      <button type="button" className="locator-dot" aria-label={`Focus ${body.name}`} title={`${body.name} · locator, not physical size`} onClick={() => onFocus(body.id)} />
      <button type="button" className="locator-name" hidden={!showLabels} tabIndex={-1} onClick={() => onFocus(body.id)}>
        {body.name}<span>↗</span>
      </button>
    </div>)}
  </div>;
});

/** Only 9 projections + DOM transforms; no per-frame React state or huge hit spheres. */
export function LocatorUpdater({ layerRef, bodies, bodyRefs, scaleMode, showLabels }: {
  layerRef: LayerRef; bodies: readonly LocatorBody[];
  bodyRefs: RefObject<Record<string, Object3D | null>>; scaleMode: ScaleMode; showLabels: boolean;
}) {
  const scratch = useMemo(() => ({ position: new Vector3(), screen: new Vector3(), direction: new Vector3(), offset: new Vector3() }), []);
  const nodes = useRef(new Map<string, { row: HTMLDivElement; label: HTMLButtonElement; line: SVGLineElement; leader: SVGSVGElement }>());
  const mountedLayer = useRef<HTMLDivElement | null>(null);

  useFrame(({ camera, size }) => {
    const layer = layerRef.current;
    if (!layer || !(camera instanceof PerspectiveCamera)) return;
    if (mountedLayer.current !== layer) {
      nodes.current.clear();
      layer.querySelectorAll<HTMLDivElement>("[data-locator]").forEach((row) => {
        nodes.current.set(row.dataset.locator!, { row, label: row.querySelector<HTMLButtonElement>(".locator-name")!, line: row.querySelector("line")!, leader: row.querySelector("svg")! });
      });
      mountedLayer.current = layer;
    }
    camera.getWorldDirection(scratch.direction);
    const visible: LocatorPoint[] = [];
    for (const body of bodies) {
      const node = nodes.current.get(body.id);
      const object = bodyRefs.current[body.id];
      if (!node) continue;
      if (!object) { node.row.style.display = "none"; continue; }
      object.getWorldPosition(scratch.position);
      const depth = scratch.offset.subVectors(scratch.position, camera.position).dot(scratch.direction);
      scratch.screen.copy(scratch.position).project(camera);
      const { x, y, z } = scratch.screen;
      const visiblePoint = depth > camera.near && z >= -1 && z <= 1 && Math.abs(x) < 0.99 && Math.abs(y) < 0.99;
      // Locator markers disappear when the actual disc is large enough to inspect.
      if (!visiblePoint || projectedDiameter(bodyRadius(body.radiusKm, scaleMode), depth, size.height, camera.fov) >= 18) {
        node.row.style.display = "none";
        continue;
      }
      visible.push({ id: body.id, x: (x + 1) * size.width / 2, y: (1 - y) * size.height / 2 });
      node.row.style.display = "block";
    }
    for (const point of layoutLocatorLabels(visible, size.width, size.height)) {
      const node = nodes.current.get(point.id)!;
      node.row.style.transform = `translate(${point.x}px,${point.y}px)`;
      node.label.style.transform = `translate(${point.labelX - point.x}px,${point.labelY - point.y}px)`;
      node.leader.style.display = showLabels ? "block" : "none";
      node.line.setAttribute("x2", String(point.labelX - point.x + (point.labelX < point.x ? LOCATOR_LABEL_WIDTH : 0)));
      node.line.setAttribute("y2", String(point.labelY - point.y + 13));
    }
  });
  return null;
}

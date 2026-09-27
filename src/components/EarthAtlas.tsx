"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronRight, Compass, Globe2, MapPin, Minus, Plus, RotateCcw, Search, X } from "lucide-react";
import {
  ATLAS_HEIGHT, ATLAS_WIDTH, MAX_ATLAS_ZOOM, atlasLabelText, clampAtlasTransform,
  findAtlasCountry, formatAtlasCoordinates, joinAtlasCountries, loadAtlasGeometry,
  loadAtlasMetadata, normalizeSearch, projectAtlasCountries, searchAtlasCountries, visibleAtlasLabels, zoomAtlasAt,
  type AtlasCountry, type AtlasMarker, type AtlasShape, type AtlasTransform,
  type CountryFeature, type CountryMetadata,
} from "@/lib/earth-atlas";
import styles from "./EarthAtlas.module.css";

export type EarthAtlasProps = {
  initialCountry?: string | null;
  onClose: () => void;
  onLocate: (target: { name: string; lat: number; lon: number }) => void;
};

type Resource<T> = { status: "loading"; data?: undefined; error?: undefined } |
  { status: "ready"; data: T; error?: undefined } | { status: "error"; data?: undefined; error: string };
const EMPTY_FEATURES: CountryFeature[] = [];
const EMPTY_METADATA: CountryMetadata[] = [];
const HOME_VIEW: AtlasTransform = { x: 0, y: 0, k: 1 };
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "The source could not be reached.";

const CountryShapes = memo(function CountryShapes({ shapes }: { shapes: AtlasShape[] }) {
  return <g className={styles.countries} aria-hidden="true">{shapes.map((shape) => (
    <path key={shape.key} d={shape.path} data-country-id={shape.countryId} vectorEffect="non-scaling-stroke">
      <title>{shape.name}</title>
    </path>
  ))}</g>;
});

const CountryMarkers = memo(function CountryMarkers({ markers }: { markers: AtlasMarker[] }) {
  return <g aria-hidden="true">{markers.map((marker) => (
    <g key={marker.id} className={styles.marker} data-atlas-marker={marker.id}
      data-country-id={marker.id} data-point-only={marker.pointOnly || undefined}
      transform={`translate(${marker.x},${marker.y})`}>
      <title>{marker.name}{marker.pointOnly ? " — point marker; no separate boundary in this map" : ""}</title>
      <circle className={styles.markerHit} r="7" />
      <circle className={styles.markerDot} r="2.5" />
      <text x="8" y="-7" className={styles.countryLabel} style={{ display: "none" }}>{atlasLabelText(marker.name)}</text>
    </g>
  ))}</g>;
});

type MapController = { zoomBy: (factor: number) => void; reset: () => void; focus: (id: string) => void; paint: () => void };
type ProjectedAtlas = ReturnType<typeof projectAtlasCountries>;

function AtlasMap({ geometry, selectedId, selectionVersion, onSelect }: {
  geometry: ProjectedAtlas; selectedId?: string; selectionVersion: number; onSelect: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<HTMLOutputElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const minusRef = useRef<HTMLButtonElement>(null);
  const controller = useRef<MapController | null>(null);
  const view = useRef<AtlasTransform>({ ...HOME_VIEW });
  const selection = useRef(selectedId);
  const hintId = useId();

  useEffect(() => {
    const svg = svgRef.current;
    const group = groupRef.current;
    if (!svg || !group) return;
    let frame = 0;
    let target = view.current;
    let smooth = false;
    let lastTime = 0;
    let previousZoom = -1;
    let drag: { pointer: number; x: number; y: number; start: AtlasTransform; distance: number; countryId?: string } | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const markerNodes = new Map(Array.from(svg.querySelectorAll<SVGGElement>("[data-atlas-marker]")).map((node) => [node.dataset.atlasMarker!, node]));
    const paint = () => {
      const current = view.current;
      group.setAttribute("transform", `translate(${current.x},${current.y}) scale(${current.k})`);
      const labels = visibleAtlasLabels(geometry.markers, current, selection.current);
      for (const marker of geometry.markers) {
        const node = markerNodes.get(marker.id);
        if (!node) continue;
        if (previousZoom !== current.k) node.setAttribute("transform", `translate(${marker.x},${marker.y}) scale(${1 / current.k})`);
        node.dataset.selected = String(marker.id === selection.current);
        const label = node.querySelector("text");
        if (label) label.style.display = labels.has(marker.id) ? "" : "none";
      }
      previousZoom = current.k;
      if (zoomRef.current) zoomRef.current.textContent = `${current.k.toFixed(1)}×`;
      if (plusRef.current) plusRef.current.disabled = current.k >= MAX_ATLAS_ZOOM - 0.01;
      if (minusRef.current) minusRef.current.disabled = current.k <= 1.01;
    };
    const tick = (time: number) => {
      frame = 0;
      const current = view.current;
      const amount = smooth ? 1 - Math.exp(-Math.min(64, time - (lastTime || time - 16)) / 45) : 1;
      lastTime = time;
      const close = Math.abs(current.k - target.k) < 0.001 && Math.abs(current.x - target.x) < 0.15 && Math.abs(current.y - target.y) < 0.15;
      view.current = close ? target : {
        x: current.x + (target.x - current.x) * amount,
        y: current.y + (target.y - current.y) * amount,
        k: current.k + (target.k - current.k) * amount,
      };
      paint();
      if (!close && smooth) frame = requestAnimationFrame(tick);
    };
    const move = (next: AtlasTransform, animate = true) => {
      target = clampAtlasTransform(next);
      smooth = animate && !reducedMotion.matches;
      if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
    };
    const localPoint = (event: { clientX: number; clientY: number }): [number, number] => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return [ATLAS_WIDTH / 2, ATLAS_HEIGHT / 2];
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      return [point.x, point.y];
    };
    const zoomBy = (factor: number) => move(zoomAtlasAt(target, target.k * factor, [ATLAS_WIDTH / 2, ATLAS_HEIGHT / 2]));
    const reset = () => move({ ...HOME_VIEW });
    controller.current = { zoomBy, reset, paint, focus: (id) => {
      const destination = geometry.focus.get(id);
      if (destination) move(destination);
    } };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? ATLAS_HEIGHT : 1);
      move(zoomAtlasAt(target, target.k * Math.exp(-Math.max(-180, Math.min(180, delta)) * 0.0025), localPoint(event)));
    };
    const pointerDown = (event: PointerEvent) => {
      event.stopPropagation();
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      target = view.current;
      const [x, y] = localPoint(event);
      const countryId = (event.target as Element).closest<SVGElement>("[data-country-id]")?.dataset.countryId;
      drag = { pointer: event.pointerId, x, y, start: view.current, distance: 0, countryId };
      svg.setPointerCapture(event.pointerId);
      svg.dataset.dragging = "true";
      svg.focus({ preventScroll: true });
    };
    const pointerMove = (event: PointerEvent) => {
      event.stopPropagation();
      if (!drag || drag.pointer !== event.pointerId) return;
      const [x, y] = localPoint(event);
      const dx = x - drag.x;
      const dy = y - drag.y;
      drag.distance = Math.max(drag.distance, Math.hypot(dx, dy));
      if (drag.distance > 4) move({ ...drag.start, x: drag.start.x + dx, y: drag.start.y + dy }, false);
    };
    const pointerUp = (event: PointerEvent) => {
      event.stopPropagation();
      if (!drag || drag.pointer !== event.pointerId) return;
      const completed = drag;
      drag = null;
      svg.dataset.dragging = "false";
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      if (event.type === "pointerup" && completed.distance <= 4 && completed.countryId) onSelect(completed.countryId);
    };
    const keyDown = (event: globalThis.KeyboardEvent) => {
      const handled = ["+", "=", "-", "_", "Home", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key);
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "+" || event.key === "=") zoomBy(1.5);
      else if (event.key === "-" || event.key === "_") zoomBy(1 / 1.5);
      else if (event.key === "Home" || event.key === "0") reset();
      else move({ ...target,
        x: target.x + (event.key === "ArrowLeft" ? 75 : event.key === "ArrowRight" ? -75 : 0),
        y: target.y + (event.key === "ArrowUp" ? 75 : event.key === "ArrowDown" ? -75 : 0),
      });
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    svg.addEventListener("pointerdown", pointerDown);
    svg.addEventListener("pointermove", pointerMove);
    svg.addEventListener("pointerup", pointerUp);
    svg.addEventListener("pointercancel", pointerUp);
    svg.addEventListener("lostpointercapture", pointerUp);
    svg.addEventListener("keydown", keyDown);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      controller.current = null;
      svg.removeEventListener("wheel", wheel);
      svg.removeEventListener("pointerdown", pointerDown);
      svg.removeEventListener("pointermove", pointerMove);
      svg.removeEventListener("pointerup", pointerUp);
      svg.removeEventListener("pointercancel", pointerUp);
      svg.removeEventListener("lostpointercapture", pointerUp);
      svg.removeEventListener("keydown", keyDown);
    };
  }, [geometry, onSelect]);

  useEffect(() => {
    selection.current = selectedId;
    controller.current?.paint();
    if (selectedId) controller.current?.focus(selectedId);
  }, [selectedId, selectionVersion, geometry]);

  return <>
    <svg ref={svgRef} className={styles.mapSvg} viewBox={`0 0 ${ATLAS_WIDTH} ${ATLAS_HEIGHT}`}
      role="group" aria-label="Interactive Earth country map" aria-describedby={hintId} tabIndex={0}>
      <title>Earth atlas, Equal Earth projection</title>
      <desc>Use the country index to find every dataset entry, including small territories. On the map, use arrows to pan, plus and minus to zoom, and Home to reset.</desc>
      <g ref={groupRef}>
        <path className={styles.ocean} d={geometry.sphere} vectorEffect="non-scaling-stroke" />
        <path className={styles.graticule} d={geometry.graticule} vectorEffect="non-scaling-stroke" />
        <CountryShapes shapes={geometry.shapes} />
        <g className={styles.selectedShapes} aria-hidden="true">{geometry.shapes.filter((shape) => shape.countryId === selectedId).map((shape) => (
          <path key={shape.key} d={shape.path} vectorEffect="non-scaling-stroke" />
        ))}</g>
        <CountryMarkers markers={geometry.markers} />
      </g>
    </svg>
    <div className={styles.mapBadge}><span /> EQUAL EARTH <i /> 1:50 million source</div>
    <div className={styles.mapControls} aria-label="Map navigation">
      <button ref={plusRef} type="button" aria-label="Zoom in" title="Zoom in (+)" onClick={() => controller.current?.zoomBy(1.5)}><Plus size={18} /></button>
      <output ref={zoomRef} aria-label="Map zoom">1.0×</output>
      <button ref={minusRef} type="button" aria-label="Zoom out" title="Zoom out (−)" onClick={() => controller.current?.zoomBy(1 / 1.5)}><Minus size={18} /></button>
      <span />
      <button type="button" aria-label="Reset world view" title="Reset world view (Home)" onClick={() => controller.current?.reset()}><RotateCcw size={17} /></button>
    </div>
    <p className={styles.mapHint} id={hintId}>Scroll to zoom · Drag to pan · Click a country <span>· Arrows / + − / Home</span></p>
  </>;
}

function CountryDetails({ country, onLocate }: { country?: AtlasCountry; onLocate: EarthAtlasProps["onLocate"] }) {
  if (!country) return <section className={`${styles.details} ${styles.emptyDetails}`} aria-label="Country details">
    <Compass size={25} />
    <div><h2>A whole world to explore</h2><p>Select a boundary, a point, or any entry in the index.</p></div>
  </section>;
  return <section className={styles.details} aria-label="Selected country details">
    <div className={styles.detailEyebrow}><MapPin size={13} /> SELECTED ENTRY <span>{country.alpha3 || country.numericCode || "MAP"}</span></div>
    <h2>{country.name}</h2>
    {country.officialName && country.officialName !== country.name && <p className={styles.officialName}>{country.officialName}</p>}
    <dl className={styles.facts}>
      <div><dt>Capital{country.capitals.length > 1 ? "s" : ""}</dt><dd>{country.capitals.join(" · ") || "Not provided by source"}</dd></div>
      <div><dt>Region</dt><dd>{country.region || "Not provided by source"}{country.subregion && <small>{country.subregion}</small>}</dd></div>
      <div><dt>Area (source)</dt><dd>{country.areaKm2 === undefined ? "Not provided" : `${country.areaKm2.toLocaleString("en")} km²`}</dd></div>
      <div><dt>Languages</dt><dd>{country.languages.length ? country.languages.join(", ") : "Not provided"}</dd></div>
    </dl>
    <p className={styles.coordinate}>{country.point ? formatAtlasCoordinates(country.point) : "No representative coordinate available"}</p>
    <p className={styles.detailNote}>
      {country.features.length ? "Boundary shown in the map dataset." : "Point marker: no separate polygon in this boundary dataset."}{" "}
      {country.point?.source === "geometry" ? "Marker is a computed geographic centroid." : country.point ? "Marker is the source’s representative country coordinate, not a capital location." : ""}
      {!country.hasMetadata && " This map-only entry has no matching metadata record."}
    </p>
    <button type="button" className={styles.flyButton} disabled={!country.point} onClick={() => {
      if (country.point) onLocate({ name: country.name, lat: country.point.lat, lon: country.point.lon });
    }}><Globe2 size={16} /> Fly to globe <ArrowUpRight size={16} /></button>
  </section>;
}

export default function EarthAtlas({ initialCountry = null, onClose, onLocate }: EarthAtlasProps) {
  const [boundary, setBoundary] = useState<Resource<CountryFeature[]>>({ status: "loading" });
  const [metadata, setMetadata] = useState<Resource<CountryMetadata[]>>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(initialCountry);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const alive = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const titleId = useId();
  const listId = useId();
  const searchId = useId();
  const sourceNoteId = useId();

  useEffect(() => {
    alive.current = true;
    loadAtlasGeometry().then((data) => { if (alive.current) setBoundary({ status: "ready", data }); })
      .catch((error: unknown) => { if (alive.current) setBoundary({ status: "error", error: errorMessage(error) }); });
    loadAtlasMetadata().then((data) => { if (alive.current) setMetadata({ status: "ready", data }); })
      .catch((error: unknown) => { if (alive.current) setMetadata({ status: "error", error: errorMessage(error) }); });
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement;
    if (!dialog.open) dialog.showModal();
    searchRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const countries = useMemo(() => joinAtlasCountries(metadata.data || EMPTY_METADATA, boundary.data || EMPTY_FEATURES), [metadata.data, boundary.data]);
  const geometry = useMemo(() => projectAtlasCountries(countries), [countries]);
  const filtered = useMemo(() => searchAtlasCountries(countries, query), [countries, query]);
  const selected = useMemo(() => findAtlasCountry(countries, selectedKey), [countries, selectedKey]);
  const tabbableKey = filtered.some((country) => country.id === focusKey) ? focusKey
    : filtered.some((country) => country.id === selected?.id) ? selected?.id : filtered[0]?.id;
  const selectCountry = useCallback((id: string) => {
    setSelectedKey(id);
    setSelectionVersion((version) => version + 1);
  }, []);
  const retryBoundary = () => {
    setBoundary({ status: "loading" });
    loadAtlasGeometry().then((data) => { if (alive.current) setBoundary({ status: "ready", data }); })
      .catch((error: unknown) => { if (alive.current) setBoundary({ status: "error", error: errorMessage(error) }); });
  };
  const retryMetadata = () => {
    setMetadata({ status: "loading" });
    loadAtlasMetadata().then((data) => { if (alive.current) setMetadata({ status: "ready", data }); })
      .catch((error: unknown) => { if (alive.current) setMetadata({ status: "error", error: errorMessage(error) }); });
  };
  const focusCountryButton = (index: number) => {
    const button = listRef.current?.querySelectorAll<HTMLButtonElement>("button")[index];
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: "nearest" });
  };
  const listKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") || []);
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const next = event.key === "ArrowDown" ? Math.min(buttons.length - 1, index + 1) :
      event.key === "ArrowUp" ? Math.max(0, index - 1) : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); focusCountryButton(next); }
  };
  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) || []).filter((node) => node.getClientRects().length > 0);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  };
  const locate = (target: Parameters<EarthAtlasProps["onLocate"]>[0]) => { onLocate(target); onClose(); };

  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={dialogRef} className={styles.atlas} aria-modal="true" aria-labelledby={titleId}
    aria-describedby={sourceNoteId} onKeyDown={trapFocus}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}
    onPointerUp={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()}
    onWheel={(event) => event.stopPropagation()}>
    <header className={styles.header}>
      <div className={styles.brandIcon}><Globe2 size={23} /></div>
      <div className={styles.heading}><p>HELIOCENTRIC / EARTH</p><h1 id={titleId}>World atlas <span>COUNTRIES & TERRITORIES</span></h1></div>
      <div className={styles.headerCount}><strong>{countries.length || "—"}</strong><span>indexed entries</span></div>
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close Earth atlas"><X size={19} /><span>Close</span><kbd>Esc</kbd></button>
    </header>
    <div className={styles.body}>
      <aside className={styles.sidebar} aria-label="Country and territory index">
        <div className={styles.indexHeading}><h2>Explore the world</h2><span>A—Z</span></div>
        <label htmlFor={searchId} className={styles.searchLabel}>Search country, territory, capital or code</label>
        <div className={styles.searchBox}><Search size={16} /><input ref={searchRef} id={searchId} type="search" value={query}
          placeholder="Find a country…" aria-controls={listId} autoComplete="off" spellCheck={false}
          onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === "ArrowDown" && filtered.length) { event.preventDefault(); focusCountryButton(0); }
            if (event.key === "Enter" && filtered.length) { event.preventDefault(); selectCountry(filtered[0].id); }
          }} />{query && <button type="button" aria-label="Clear country search" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X size={14} /></button>}</div>
        <nav className={styles.alphabet} aria-label="Jump to country initial">{ALPHABET.map((letter) => {
          const first = filtered.findIndex((country) => normalizeSearch(country.name).startsWith(letter.toLowerCase()));
          return <button key={letter} type="button" disabled={first < 0} aria-label={`Jump to ${letter}`} onClick={() => focusCountryButton(first)}>{letter}</button>;
        })}</nav>
        <p className={styles.resultsCount} aria-live="polite">{filtered.length} {query ? "matching" : "available"} entries <span>{metadata.status === "loading" || boundary.status === "loading" ? "Loading sources…" : "↑ ↓ to browse"}</span></p>
        <ul ref={listRef} id={listId} className={styles.countryList} onKeyDown={listKeyDown} aria-label="Countries and territories">
          {filtered.map((country) => <li key={country.id}><button type="button" aria-pressed={selected?.id === country.id}
            tabIndex={tabbableKey === country.id ? 0 : -1} onFocus={() => setFocusKey(country.id)}
            className={selected?.id === country.id ? styles.activeCountry : undefined} onClick={() => selectCountry(country.id)}>
            <span className={styles.countryCode}>{country.alpha2 || country.numericCode || "•"}</span>
            <span className={styles.countryName}><strong>{country.name}</strong><small>{country.subregion || country.region || "Boundary dataset entry"}</small></span>
            {country.features.length === 0 ? <span className={styles.pointOnly} title="Point marker; no separate polygon">●</span> : <ChevronRight size={13} />}
          </button></li>)}
        </ul>
        {!filtered.length && <div className={styles.noResults}>{countries.length ? <><Search size={22} /><p>No matching entry.<br />Try a country name, capital or ISO code.</p></> : <><Globe2 size={26} /><p>{boundary.status === "loading" || metadata.status === "loading" ? "Loading the atlas sources…" : "No dataset loaded. Retry the sources above the map."}</p></>}</div>}
        <div className={styles.indexFooter}><span>●</span> Point markers include small territories.<br />Labels declutter as you zoom; the index stays complete.</div>
      </aside>
      <main className={styles.mapPane}>
        <p className={styles.visuallyHidden} role="status">{selected ? `${selected.name} selected. Country details and Fly to globe follow the map controls.` : "Select a country or territory from the index or map."}</p>
        <div className={styles.sourceStatus} aria-live="polite">
          {boundary.status === "loading" && <p><span className={styles.loadingDot} /> Loading boundary geometry…</p>}
          {metadata.status === "loading" && <p><span className={styles.loadingDot} /> Loading country details…</p>}
          {boundary.status === "error" && <div className={styles.errorNotice}><p><strong>Boundaries unavailable.</strong> {boundary.error} {metadata.status === "ready" && "Country point markers remain available."}</p><button type="button" onClick={retryBoundary}>Retry boundaries</button></div>}
          {metadata.status === "error" && <div className={styles.errorNotice}><p><strong>Country details unavailable.</strong> {metadata.error} {boundary.status === "ready" && "Only boundary dataset entries are indexed."}</p><button type="button" onClick={retryMetadata}>Retry details</button></div>}
        </div>
        <AtlasMap geometry={geometry} selectedId={selected?.id} selectionVersion={selectionVersion} onSelect={selectCountry} />
        <CountryDetails country={selected} onLocate={locate} />
      </main>
    </div>
    <footer className={styles.footer}>
      <p id={sourceNoteId}>Static reference data. Disputed boundaries and names reflect the sources, not a sovereignty judgment.</p>
      <p><a href="https://github.com/topojson/world-atlas" target="_blank" rel="noreferrer">Natural Earth / world-atlas</a> <span>·</span> <a href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">mledoze/countries (ODbL)</a></p>
      <p className={styles.sourceCounts}>{boundary.data?.length ?? "—"} boundary features · {metadata.data?.length ?? "—"} metadata records</p>
    </footer>
  </dialog>, document.body);
}

"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowUpRight, BookOpen, Check, ChevronDown, ChevronRight, CircleDot,
  CloudSun, Crosshair, Flag, Globe2, Info, Layers, Map, MapPin,
  Mountain, Orbit, Satellite, Search, Snowflake, Waves, Wind, X,
} from "lucide-react";
import {
  FEATURE_KIND_LABELS, PLANET_EXPLORATION, filterPlanetFeatures,
  type ExplorablePlanet, type PlanetFeature, type PlanetFeatureKind,
} from "@/lib/planet-exploration";
import styles from "./PlanetExplorerPanel.module.css";

export type PlanetExplorerPanelProps = {
  planetId: ExplorablePlanet;
  selectedFeatureId: string | null;
  onFeatureSelect: (feature: PlanetFeature) => void;
  onOpenEarthAtlas: () => void;
  onClose: () => void;
};

const WORLD_ICONS = {
  mercury: CircleDot, venus: CloudSun, earth: Globe2, mars: Mountain,
  jupiter: Wind, saturn: Orbit, uranus: Snowflake, neptune: Waves,
};

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.sourceLink} href={href} target="_blank" rel="noopener noreferrer">
      {children}<ArrowUpRight size={12} aria-hidden="true" />
      <span className={styles.srOnly}> (opens in a new tab)</span>
    </a>
  );
}

function coordinates(feature: PlanetFeature): string {
  const precision = feature.approximate ? 0 : 2;
  const lat = `${Math.abs(feature.lat).toFixed(precision)}°${feature.lat === 0 ? "" : feature.lat > 0 ? " N" : " S"}`;
  const lon = `${Math.abs(feature.lon).toFixed(precision)}°${feature.lon === 0 ? "" : feature.lon > 0 ? " E" : " W"}`;
  return `${lat} · ${lon}`;
}

/** The keyed content resets local search/disclosures when the selected world changes. */
export default function PlanetExplorerPanel(props: PlanetExplorerPanelProps) {
  return <ExplorerContent key={props.planetId} {...props} />;
}

function ExplorerContent({
  planetId, selectedFeatureId, onFeatureSelect, onOpenEarthAtlas, onClose,
}: PlanetExplorerPanelProps) {
  const guide = PLANET_EXPLORATION[planetId];
  const WorldIcon = WORLD_ICONS[planetId];
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlanetFeatureKind | "all">("all");
  const uid = useId();
  const selected = guide.features.find((feature) => feature.id === selectedFeatureId) ?? null;
  const features = filterPlanetFeatures(guide.features, query, kind);
  const kinds = Array.from(new Set(guide.features.map((feature) => feature.kind)));
  const atmospheric = guide.domain === "atmosphere";
  const selectedHidden = selected && !features.some((feature) => feature.id === selected.id);

  const clearFilters = () => {
    setQuery("");
    setKind("all");
  };

  return (
    <section
      className={styles.panel}
      style={{ "--world-accent": guide.accent } as CSSProperties}
      aria-labelledby={`${uid}-title`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.eyebrow}><BookOpen size={12} aria-hidden="true" /> Planet field guide</span>
          <button type="button" className={styles.close} aria-label={`Close ${guide.name} explorer`} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.titleRow}>
          <span className={styles.worldIcon}><WorldIcon size={27} strokeWidth={1.3} aria-hidden="true" /></span>
          <div><h2 id={`${uid}-title`}>{guide.name}</h2><p>{guide.subtitle}</p></div>
        </div>
        <div className={styles.badges}>
          <span>{guide.viewLabel}</span><span className={styles.staticBadge}>Curated · static</span>
        </div>
      </header>

      <div className={styles.body}>
        {planetId === "earth" && (
          <button type="button" className={styles.atlasButton} onClick={onOpenEarthAtlas}>
            <Map size={23} strokeWidth={1.5} aria-hidden="true" />
            <span><strong>Open country atlas</strong><small>Search countries & territories · zoom the map</small></span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        )}
        <p className={styles.intro}>{guide.summary}</p>
        <div className={styles.context}>
          {atmospheric ? <Wind size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />}
          <p>{guide.viewDescription}</p>
        </div>

        <section className={styles.featureSection} aria-labelledby={`${uid}-features`}>
          <div className={styles.sectionHeading}>
            <h3 id={`${uid}-features`}>{atmospheric ? "Atmospheric highlights" : "Places to explore"}</h3>
            <span>{guide.features.length} pins</span>
          </div>
          <label className={styles.search}>
            <Search size={15} aria-hidden="true" />
            <span className={styles.srOnly}>Search {guide.name} features</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, features, science…" />
          </label>
          <fieldset className={styles.filters}>
            <legend className={styles.srOnly}>Filter {guide.name} features by category</legend>
            <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")}>All</button>
            {kinds.map((value) => (
              <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{FEATURE_KIND_LABELS[value]}</button>
            ))}
          </fieldset>
          <p className={styles.resultCount} role="status">{features.length} of {guide.features.length} highlights{query || kind !== "all" ? " match your filters" : " · select a pin to explore"}</p>
          <p className={styles.srOnly} role="status">{selected ? `Selected: ${selected.name}. Details follow the feature list.` : "No feature selected."}</p>

          {features.length > 0 ? (
            <ul className={styles.featureList}>
              {features.map((feature) => {
                const isSelected = feature.id === selectedFeatureId;
                const FeatureIcon = feature.kind === "landing-site" ? Flag : atmospheric ? Wind : MapPin;
                return (
                  <li key={feature.id}>
                    <button type="button" className={styles.featureButton} aria-pressed={isSelected} onClick={() => onFeatureSelect(feature)}>
                      <span className={styles.pinIcon}><FeatureIcon size={15} aria-hidden="true" /></span>
                      <span className={styles.featureCopy}>
                        <strong>{feature.name}</strong>
                        <small>{FEATURE_KIND_LABELS[feature.kind]}{feature.approximate ? " · Approximate" : ""}</small>
                      </span>
                      {isSelected ? <Check size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.empty}>
              <Search size={20} aria-hidden="true" />
              <strong>No matching highlights</strong>
              <p>Try a place name or a scientific term, or reset the filters.</p>
              <button type="button" onClick={clearFilters}>Reset filters</button>
            </div>
          )}

          {selected ? (
            <article className={styles.featureDetail} aria-labelledby={`${uid}-selected`}>
              <span className={styles.eyebrow}><Crosshair size={12} aria-hidden="true" /> Selected reference</span>
              <h4 id={`${uid}-selected`}>{selected.name}</h4>
              <p>{selected.description}</p>
              <div className={styles.coordinates}><MapPin size={12} aria-hidden="true" /> {selected.approximate ? "≈ " : ""}{coordinates(selected)}</div>
              {selected.approximate && <p className={styles.approximate}>{atmospheric ? "Approximate latitude · illustrative longitude" : "Approximate regional reference point"}</p>}
              <div className={styles.detailActions}>
                <button type="button" onClick={() => onFeatureSelect(selected)}><Crosshair size={12} aria-hidden="true" /> Center reference</button>
                <SourceLink href={selected.sourceUrl}>Source / background</SourceLink>
              </div>
              {selectedHidden && <button type="button" className={styles.clearSelectedFilter} onClick={clearFilters}>Selected pin is filtered out · show all</button>}
            </article>
          ) : <p className={styles.selectionHint}>Select a highlight above or a globe marker for its story and coordinates.</p>}
          <p className={styles.coordinateNote}>{guide.coordinateNote}</p>
        </section>

        <ScienceSections planetId={planetId} />
      </div>
      <footer className={styles.footer}><BookOpen size={11} aria-hidden="true" /> Scientific context · historical milestones</footer>
    </section>
  );
}

function ScienceSections({ planetId }: { planetId: ExplorablePlanet }) {
  const guide = PLANET_EXPLORATION[planetId];
  return (
    <div className={styles.scienceSections}>
      <details className={styles.disclosure} open>
        <summary>
          <Layers size={16} aria-hidden="true" />
          <span><strong>Environment & interior</strong><small>Understand this world</small></span>
          <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
        </summary>
        <div className={styles.disclosureBody}>
          <dl className={styles.factGrid}>
            {guide.environment.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>
          <h4 className={styles.interiorHeading}>Beneath the {guide.domain === "surface" ? "surface" : "clouds"}</h4>
          <p className={styles.scienceText}>{guide.interior}</p>
          <SourceLink href={guide.sources[0].url}>NASA science background</SourceLink>
        </div>
      </details>

      <details className={styles.disclosure}>
        <summary>
          <Satellite size={16} aria-hidden="true" />
          <span><strong>Exploration milestones</strong><small>{guide.missions.length} missions & observing programs</small></span>
          <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
        </summary>
        <div className={styles.disclosureBody}>
          <p className={styles.milestoneNote}>Dates identify historical milestones, not live mission status.</p>
          <ol className={styles.missionList}>
            {guide.missions.map((mission) => (
              <li key={mission.name}>
                <span className={styles.missionDate}>{mission.date}</span>
                <h4>{mission.name}</h4>
                <span className={styles.agency}>{mission.agency}</span>
                <p>{mission.description}</p>
                <SourceLink href={mission.sourceUrl}>Mission background</SourceLink>
              </li>
            ))}
          </ol>
        </div>
      </details>

      <details className={styles.disclosure}>
        <summary>
          <BookOpen size={16} aria-hidden="true" />
          <span><strong>Sources & mapping limits</strong><small>How to read this guide</small></span>
          <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
        </summary>
        <div className={styles.disclosureBody}>
          <ul className={styles.limits}>{guide.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul>
          <ul className={styles.sources}>{guide.sources.map((source) => <li key={source.url}><SourceLink href={source.url}>{source.label}</SourceLink></li>)}</ul>
          <p className={styles.milestoneNote}>Educational summaries and rounded reference coordinates. Source links open external scientific references; this guide does not fetch live data.</p>
        </div>
      </details>
    </div>
  );
}

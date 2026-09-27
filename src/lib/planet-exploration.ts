/** Curated, static science guide. Coordinates locate references, not live conditions.
 * All longitudes are east-positive in [-180, 180]. Mercury's USGS west-positive
 * coordinates are converted here; named features use rounded catalogue centers.
 * Giant-planet latitudes are approximate and longitudes are illustrative anchors.
 * Earth geodetic and planetary catalogue latitudes are displayed on a sphere;
 * these pins are educational references, not survey/navigation coordinates.
 */
export type ExplorablePlanet =
  | "mercury" | "venus" | "earth" | "mars"
  | "jupiter" | "saturn" | "uranus" | "neptune";

export type PlanetFeatureKind =
  | "basin" | "crater" | "mountain" | "volcano" | "canyon"
  | "region" | "city" | "landing-site" | "storm" | "cloud-band" | "polar-region";

export type PlanetFeature = {
  id: string;
  name: string;
  kind: PlanetFeatureKind;
  lat: number;
  lon: number;
  description: string;
  sourceUrl: string;
  approximate?: boolean;
};

export type PlanetExploration = {
  name: string;
  subtitle: string;
  category: "rocky" | "gas-giant" | "ice-giant";
  domain: "surface" | "atmosphere";
  accent: string;
  summary: string;
  viewLabel: string;
  viewDescription: string;
  coordinateNote: string;
  environment: { label: string; value: string }[];
  interior: string;
  missions: {
    name: string;
    agency: string;
    date: string;
    description: string;
    sourceUrl: string;
  }[];
  sources: { label: string; url: string }[];
  limitations: string[];
  features: PlanetFeature[];
};

export const FEATURE_KIND_LABELS: Record<PlanetFeatureKind, string> = {
  basin: "Impact basin", crater: "Crater", mountain: "Mountains",
  volcano: "Volcano", canyon: "Canyon / scarp", region: "Natural region",
  city: "City", "landing-site": "Landing site", storm: "Storm",
  "cloud-band": "Clouds / winds", "polar-region": "Polar atmosphere",
};

const SCIENCE = "https://science.nasa.gov";
const GAZETTEER = "https://planetarynames.wr.usgs.gov";
const VOYAGER = `${SCIENCE}/mission/voyager/voyager-2/`;
const GIANT_COORDINATES =
  "Latitudes are approximate atmospheric reference regions. Longitudes are illustrative, not measured storm positions. Clouds drift and change; these are not fixed ground locations.";
const ROCKY_COORDINATES =
  "Pins use rounded named-feature centers or historical landing coordinates. Broad features extend far beyond a pin. Longitude is east-positive; negative values are west.";

export const PLANET_EXPLORATION: Record<ExplorablePlanet, PlanetExploration> = {
  mercury: {
    name: "Mercury", subtitle: "A record written in rock", category: "rocky",
    domain: "surface", accent: "#c5b7a8",
    summary: "Impact basins, bright crater rays and enormous scarps preserve the history of the smallest planet. A long solar day exposes its surface to extreme heating and cooling.",
    viewLabel: "Rocky surface",
    viewDescription: "Explore named terrain mapped by spacecraft. Mercury has a tenuous exosphere rather than a weather-bearing atmosphere.",
    coordinateNote: ROCKY_COORDINATES,
    environment: [
      { label: "Day / night extremes", value: "About 430 °C / −180 °C" },
      { label: "Air", value: "Extremely thin exosphere" },
      { label: "Sunrise to sunrise", value: "176 Earth days" },
      { label: "Polar cold traps", value: "Water ice in permanently shadowed craters" },
    ],
    interior: "A very large metal-rich core occupies roughly 85% of Mercury's radius. The thin rocky mantle and crust have contracted as the interior cooled, forming long thrust-fault scarps. Its weak global magnetic field indicates a partly liquid, electrically conducting interior.",
    missions: [
      { name: "Mariner 10", agency: "NASA", date: "Mercury flybys · 1974–1975", description: "Returned the first close-up views and discovered Mercury's magnetic field.", sourceUrl: `${SCIENCE}/mercury/exploration/` },
      { name: "MESSENGER", agency: "NASA", date: "Mercury orbit · 2011–2015", description: "Mapped the planet globally and investigated its composition, magnetic field and polar ice.", sourceUrl: `${SCIENCE}/mission/messenger/` },
      { name: "BepiColombo", agency: "ESA / JAXA", date: "Launched · 20 Oct 2018", description: "A joint two-orbiter mission designed to study Mercury's surface, interior and magnetic environment.", sourceUrl: "https://www.esa.int/Science_Exploration/Space_Science/BepiColombo" },
    ],
    sources: [
      { label: "NASA · Mercury science", url: `${SCIENCE}/mercury/facts/` },
      { label: "IAU / USGS · named terrain", url: `${GAZETTEER}/Page/MERCURY/target` },
    ],
    limitations: ["This is a global globe with curated pins, not a high-resolution terrain model.", "Catalogue centers are reference points; no lander imagery or ground-level navigation is provided."],
    features: [
      { id: "mercury-caloris", name: "Caloris Planitia", kind: "basin", lat: 31.65, lon: 161.98, description: "The plains within a giant impact basin record both an ancient collision and later volcanic infilling. The pin marks the USGS catalogue center of the named plain, not the entire basin rim.", sourceUrl: `${GAZETTEER}/Feature/979` },
      { id: "mercury-hokusai", name: "Hokusai", kind: "crater", lat: 57.84, lon: 16.65, description: "A roughly 114-km impact crater with a striking system of bright ejecta rays. Rays are freshly excavated material that gradually darkens through space weathering.", sourceUrl: `${GAZETTEER}/Feature/14644` },
      { id: "mercury-rachmaninoff", name: "Rachmaninoff", kind: "crater", lat: 27.66, lon: 57.37, description: "This roughly 305-km impact structure contains a prominent inner ring and smooth interior plains, exposing the interplay between impacts and volcanic resurfacing.", sourceUrl: `${GAZETTEER}/Feature/14653` },
      { id: "mercury-discovery", name: "Discovery Rupes", kind: "canyon", lat: -54.7, lon: -37.24, description: "A long, lobate scarp created by crustal compression. Scarps like this provide evidence that Mercury's rocky exterior shortened as the planet cooled and contracted.", sourceUrl: `${GAZETTEER}/Feature/1548` },
    ],
  },
  venus: {
    name: "Venus", subtitle: "Beneath the opaque clouds", category: "rocky",
    domain: "surface", accent: "#f4c781",
    summary: "Behind a bright cloud deck lies a volcanic landscape of broad plains, fractured highlands and towering mountains. Radar is our window through the clouds.",
    viewLabel: "Radar-mapped terrain",
    viewDescription: "These pins refer to the solid surface beneath opaque clouds. Venusian surface maps primarily use radar, not visible-light views through the atmosphere; globe colors are illustrative.",
    coordinateNote: ROCKY_COORDINATES,
    environment: [
      { label: "Surface temperature", value: "About 465 °C" },
      { label: "Surface pressure", value: "About 92 times Earth's sea-level pressure" },
      { label: "Atmosphere", value: "Mostly CO₂; sulfuric-acid clouds" },
      { label: "Rotation", value: "243 Earth days, retrograde" },
    ],
    interior: "Venus likely has an iron-rich core, rocky mantle and crust, broadly like Earth. Its thermal history and the state of its core remain uncertain. Volcanism and deformation have reshaped the surface, without Earth's familiar global system of moving tectonic plates.",
    missions: [
      { name: "Venera 9", agency: "Soviet Union", date: "Landed · 22 Oct 1975", description: "Returned the first photographs from the surface of another planet; landers survived only briefly in the heat and pressure.", sourceUrl: `${SCIENCE}/venus/exploration/` },
      { name: "Magellan", agency: "NASA", date: "Venus orbit · 1990–1994", description: "Used synthetic-aperture radar to map nearly all of the surface through the opaque atmosphere.", sourceUrl: `${SCIENCE}/mission/magellan/` },
      { name: "Venus Express", agency: "ESA", date: "Venus orbit · 2006–2014", description: "Studied atmospheric circulation, cloud chemistry and the escape of gases to space.", sourceUrl: "https://www.esa.int/Science_Exploration/Space_Science/Venus_Express" },
    ],
    sources: [
      { label: "NASA · Venus science", url: `${SCIENCE}/venus/facts/` },
      { label: "IAU / USGS · radar map index", url: `${GAZETTEER}/Page/venus1to5m_Radar` },
    ],
    limitations: ["Radar brightness records scattering and surface properties; it is not natural-color photography.", "Pins are named terrain centers, not current eruption reports. Global surface imaging is far less detailed than Earth's."],
    features: [
      { id: "venus-maxwell", name: "Maxwell Montes", kind: "mountain", lat: 65.2, lon: 3.3, description: "Venus's highest mountain massif rises in the Ishtar Terra highlands. Its folded, radar-bright terrain records intense crustal deformation; the pin locates the mountain range rather than a surveyed summit.", sourceUrl: `${GAZETTEER}/Feature/3766` },
      { id: "venus-maat", name: "Maat Mons", kind: "volcano", lat: 0.5, lon: -165.4, description: "A large volcanic edifice near the equator. Magellan radar observations of the surrounding volcanic region have been important in studying evidence of recent geological activity on Venus.", sourceUrl: `${GAZETTEER}/Feature/3550` },
      { id: "venus-aphrodite", name: "Aphrodite Terra", kind: "region", lat: -5.8, lon: 104.8, description: "A vast equatorial highland complex containing heavily deformed terrain. Ridges and intersecting fractures in its tessera regions preserve clues to the planet's crustal history.", sourceUrl: `${GAZETTEER}/Feature/317` },
      { id: "venus-artemis", name: "Artemis Chasma", kind: "canyon", lat: -41.2, lon: 138.5, description: "A large, curved trough associated with the Artemis tectonic structure. Its extensive fractures and topography are studied for clues to mantle motion and deformation of Venus's lithosphere.", sourceUrl: `${GAZETTEER}/Feature/400` },
    ],
  },
  earth: {
    name: "Earth", subtitle: "One connected, living world", category: "rocky",
    domain: "surface", accent: "#79e4d6",
    summary: "Oceans, land, atmosphere and life form an interconnected system. Explore a few geographic landmarks here, then open the country atlas to investigate the world in detail.",
    viewLabel: "Land, ocean & cities",
    viewDescription: "Static geographic reference pins complement the country atlas. Natural-region pins are representative points, not borders or exact regional centers.",
    coordinateNote: "Latitude is north-positive and longitude is east-positive. Cities use rounded central coordinates; large natural regions use approximate reference points. These are not live satellite observations.",
    environment: [
      { label: "Ocean coverage", value: "About 71% of the surface" },
      { label: "Dry air near sea level", value: "About 78% N₂ and 21% O₂" },
      { label: "Axial tilt", value: "About 23.4°; drives the seasons" },
      { label: "Surface system", value: "Liquid water, ice, rock and a biosphere" },
    ],
    interior: "A solid iron-rich inner core sits inside a liquid outer core that generates the magnetic field. Above it, a mostly solid mantle deforms slowly over geological time. Moving lithospheric plates build mountains, recycle crust and shape ocean basins.",
    missions: [
      { name: "Landsat 1", agency: "NASA / USGS program", date: "Launched · 23 Jul 1972", description: "Began a long-running record of land-cover observations that lets researchers compare change over decades.", sourceUrl: `${SCIENCE}/mission/landsat-1/` },
      { name: "Terra", agency: "NASA", date: "Launched · 18 Dec 1999", description: "Designed to measure connections among land, atmosphere, oceans, snow and ice.", sourceUrl: `${SCIENCE}/mission/terra/` },
      { name: "Sentinel-6 Michael Freilich", agency: "NASA / ESA / EUMETSAT / NOAA", date: "Launched · 21 Nov 2020", description: "Carries precision radar altimetry to extend the satellite record of sea-surface height.", sourceUrl: `${SCIENCE}/mission/sentinel-6/` },
    ],
    sources: [
      { label: "NASA · Earth science", url: `${SCIENCE}/earth/facts/` },
      { label: "NASA · Earth Observatory", url: `${SCIENCE}/earth/earth-observatory/` },
      { label: "USGS · plate tectonics", url: "https://pubs.usgs.gov/gip/dynamic/dynamic.html" },
    ],
    limitations: ["The atlas uses a generalized country / territory dataset; boundaries and tiny islands have dataset-dependent detail.", "This globe does not include street-level maps, live weather, traffic or real-time conditions. Regional pins are an editorial selection."],
    features: [
      { id: "earth-amazon", name: "Amazon Basin", kind: "region", lat: -3, lon: -60, approximate: true, description: "A representative point near the central Amazon in South America. Forests, rivers and seasonal floodplains exchange enormous amounts of water and carbon with the atmosphere; the basin spans several countries.", sourceUrl: `${SCIENCE}/earth/explore/freshwater/` },
      { id: "earth-sahara", name: "Sahara", kind: "region", lat: 23, lon: 13, approximate: true, description: "A representative point in the vast North African desert. Sand seas occupy only part of a landscape that also includes rocky plateaus, mountains and dry valleys. Airborne Saharan dust can cross the Atlantic.", sourceUrl: `${SCIENCE}/earth/earth-observatory/` },
      { id: "earth-everest", name: "Mount Everest · Himalaya", kind: "mountain", lat: 27.9881, lon: 86.925, description: "Earth's highest summit above mean sea level lies on the Nepal–China border. The Himalayan range grew as the Indian plate collided with Eurasia, a process that continues to deform the region.", sourceUrl: "https://pubs.usgs.gov/gip/dynamic/himalaya.html" },
      { id: "earth-antarctica", name: "Antarctic ice sheet", kind: "region", lat: -82, lon: 0, approximate: true, description: "A representative inland point on Antarctica. Ice covers a rocky continent and stores most of Earth's freshwater ice. Satellites measure changes in ice elevation, flow and mass over time.", sourceUrl: `${SCIENCE}/earth/explore/snow-and-ice/` },
      { id: "earth-london", name: "London", kind: "city", lat: 51.5074, lon: -0.1278, description: "A geographic reference for the city on the River Thames in southeastern England. London lies close to the Greenwich prime meridian, the zero-longitude reference used by this atlas.", sourceUrl: `${SCIENCE}/earth/earth-observatory/` },
      { id: "earth-tokyo", name: "Tokyo", kind: "city", lat: 35.6762, lon: 139.6503, description: "A geographic reference for Japan's capital on the Pacific side of Honshu. The surrounding urban region occupies the Kanto Plain beside Tokyo Bay; this pin is a city-center reference, not an urban boundary.", sourceUrl: `${SCIENCE}/earth/earth-observatory/` },
    ],
  },
  mars: {
    name: "Mars", subtitle: "Follow the evidence of ancient water", category: "rocky",
    domain: "surface", accent: "#f5a27d",
    summary: "Giant volcanoes, deep canyons and ancient lake deposits make Mars a geological archive. Robotic landing sites connect the global view to discoveries made on the ground.",
    viewLabel: "Terrain & landing sites",
    viewDescription: "Named landforms and historical landing locations are static reference pins. A rover's landing pin does not track its later route or current position.",
    coordinateNote: ROCKY_COORDINATES,
    environment: [
      { label: "Atmosphere", value: "Thin and mostly carbon dioxide" },
      { label: "Surface pressure", value: "Less than 1% of Earth's, on average" },
      { label: "Solar day", value: "About 24 h 39 min" },
      { label: "Water", value: "Polar and subsurface ice; ancient river evidence" },
    ],
    interior: "Mars has an iron-rich core, silicate mantle and rocky crust. InSight's seismic measurements have helped constrain those layers. Magnetized ancient crust survives, but the planet does not have an Earth-like global magnetic field today.",
    missions: [
      { name: "Viking 1 & 2", agency: "NASA", date: "Landings · Jul / Sep 1976", description: "Orbiters and landers studied the atmosphere and surface; their biology experiments did not establish evidence of life.", sourceUrl: `${SCIENCE}/planetary-science/programs/mars-exploration/mission-timeline/` },
      { name: "Curiosity", agency: "NASA", date: "Landed · 6 Aug 2012 UTC", description: "Investigated sedimentary rocks in Gale crater and evidence of ancient environments that could have supported microbial life.", sourceUrl: `${SCIENCE}/mission/msl-curiosity/` },
      { name: "Perseverance", agency: "NASA", date: "Landed · 18 Feb 2021", description: "Explored the Jezero lake-and-delta system and collected samples to investigate ancient habitability.", sourceUrl: `${SCIENCE}/mission/mars-2020-perseverance/` },
    ],
    sources: [
      { label: "NASA · Mars science", url: `${SCIENCE}/mars/facts/` },
      { label: "IAU / USGS · terrain catalogue", url: `${GAZETTEER}/Page/MARS/target` },
      { label: "NASA · InSight science", url: `${SCIENCE}/mission/insight/` },
    ],
    limitations: ["Orbital textures are global context, not rover panoramas or street-level terrain.", "Landing pins and mission dates are historical. No rover tracking, live telemetry or present-day surface weather is shown."],
    features: [
      { id: "mars-olympus", name: "Olympus Mons", kind: "volcano", lat: 18.65, lon: -133.8, description: "An enormous shield volcano built by repeated lava flows. Its broad flanks and summit caldera complex illustrate volcanism on a planet without Earth's moving plate system.", sourceUrl: `${GAZETTEER}/Feature/4453` },
      { id: "mars-valles", name: "Valles Marineris", kind: "canyon", lat: -14.01, lon: -58.59, description: "A canyon system stretching thousands of kilometers. Crustal extension, landslides and erosion shaped its troughs; it is not simply a river-cut canyon like Earth's Grand Canyon.", sourceUrl: `${GAZETTEER}/Feature/6288` },
      { id: "mars-hellas", name: "Hellas Planitia", kind: "basin", lat: -42.43, lon: 70.5, description: "The deep plain within one of Mars's largest impact basins. Its low elevation affects atmospheric pressure and makes the basin an important setting for studies of frost, dust and ancient geology.", sourceUrl: `${GAZETTEER}/Feature/2432` },
      { id: "mars-jezero", name: "Jezero · Perseverance landing", kind: "landing-site", lat: 18.4447, lon: 77.4508, description: "The historical 18 February 2021 landing point inside Jezero crater. Ancient rivers deposited a delta here, making its rocks valuable for investigating past environments. This is not the rover's current location.", sourceUrl: `${SCIENCE}/mission/mars-2020-perseverance/` },
      { id: "mars-gale", name: "Gale · Curiosity landing", kind: "landing-site", lat: -4.5895, lon: 137.4417, description: "The historical August 2012 landing point, known as Bradbury Landing. Sediments in Gale crater and around Mount Sharp record changing lake and groundwater environments. This pin does not follow the rover.", sourceUrl: `${SCIENCE}/mission/msl-curiosity/` },
      { id: "mars-viking", name: "Chryse · Viking 1 landing", kind: "landing-site", lat: 22.48, lon: -47.97, description: "Viking 1 landed on the Chryse Planitia plains on 20 July 1976. Its images and measurements established a long-term surface weather and soil record; the pin uses rounded historical coordinates.", sourceUrl: `${SCIENCE}/planetary-science/programs/mars-exploration/mission-timeline/` },
    ],
  },
  jupiter: {
    name: "Jupiter", subtitle: "Weather on a planetary scale", category: "gas-giant",
    domain: "atmosphere", accent: "#f2c5a0",
    summary: "Alternating jets, deep cloud bands and giant vortices wrap a world dominated by hydrogen and helium. Its visible patterns are weather, not terrain.",
    viewLabel: "Atmospheric reference regions",
    viewDescription: "Jupiter has no solid surface to land on. Explore approximate cloud latitudes; the globe is an illustrative atmospheric view, not a current storm map.",
    coordinateNote: GIANT_COORDINATES,
    environment: [
      { label: "Atmosphere", value: "Mostly hydrogen and helium" },
      { label: "Rotation", value: "About 9.9 hours; clouds rotate differentially" },
      { label: "Cloud structure", value: "Ammonia, ammonium hydrosulfide and water layers" },
      { label: "Magnetic environment", value: "Powerful field and intense radiation belts" },
    ],
    interior: "Pressure transforms hydrogen into a dense fluid and, deeper down, an electrically conducting metallic state. Juno's measurements favor a diluted, extended core region rather than a simple sharply bounded solid core. The interior is inferred from gravity, magnetism and atmospheric measurements.",
    missions: [
      { name: "Voyager 1 & 2", agency: "NASA", date: "Jupiter flybys · 1979", description: "Resolved atmospheric motion, revealed the faint ring and transformed our view of the Galilean moons.", sourceUrl: VOYAGER },
      { name: "Galileo", agency: "NASA", date: "Jupiter orbit · 1995–2003", description: "Studied the system and delivered an atmospheric probe in December 1995; the probe did not land on a surface.", sourceUrl: `${SCIENCE}/mission/galileo/` },
      { name: "Juno", agency: "NASA", date: "Orbit insertion · 5 Jul 2016 UTC", description: "Measured Jupiter's gravity and magnetic field and imaged its complex polar cyclones.", sourceUrl: `${SCIENCE}/mission/juno/` },
    ],
    sources: [
      { label: "NASA · Jupiter atmosphere & interior", url: `${SCIENCE}/jupiter/facts/` },
      { label: "NASA / JPL · Juno atmospheric results", url: "https://www.jpl.nasa.gov/news/nasas-juno-science-results-offer-first-3d-view-of-jupiter-atmosphere/" },
    ],
    limitations: ["Every atmospheric pin is approximate. Illustrative longitude is not a System I, II or III ephemeris.", "Storms change size, shape and position. The Great Red Spot pin need not coincide with a spot in the static texture."],
    features: [
      { id: "jupiter-red-spot", name: "Great Red Spot", kind: "storm", lat: -22, lon: 0, approximate: true, description: "A long-lived anticyclonic storm near 22° south. Its size, color and longitude evolve. This approximate latitude with illustrative longitude is an educational anchor, not a measured current storm position.", sourceUrl: `${SCIENCE}/jupiter/facts/` },
      { id: "jupiter-equatorial", name: "Equatorial Zone", kind: "cloud-band", lat: 0, lon: 90, approximate: true, description: "A bright cloud zone encircling the equator, bordered by faster-moving jets and darker belts. This approximate cloud-region pin uses illustrative longitude; the zone extends around the planet.", sourceUrl: `${SCIENCE}/jupiter/facts/` },
      { id: "jupiter-north-cyclones", name: "Northern polar cyclones", kind: "polar-region", lat: 85, lon: -90, approximate: true, description: "Juno revealed a central polar cyclone surrounded by an organized group of cyclones. This approximate high-latitude reference uses illustrative longitude; it does not locate an individual storm.", sourceUrl: "https://www.jpl.nasa.gov/images/all-eight-northern-circumpolar-cyclones-in-2020/" },
      { id: "jupiter-south-belt", name: "South Equatorial Belt", kind: "cloud-band", lat: -16, lon: -150, approximate: true, description: "A dark atmospheric band with complex convection and changes in cloud appearance. The approximate latitude samples the belt; illustrative longitude does not identify a permanent landmark.", sourceUrl: `${SCIENCE}/jupiter/facts/` },
    ],
  },
  saturn: {
    name: "Saturn", subtitle: "Rings outside, restless weather within", category: "gas-giant",
    domain: "atmosphere", accent: "#ead393",
    summary: "A hydrogen-rich atmosphere hides beneath subtle bands of haze. Polar vortices and planet-spanning storms reveal a far more dynamic world than the soft golden color suggests.",
    viewLabel: "Clouds & polar circulation",
    viewDescription: "Saturn has no solid surface to land on. Pins sample atmospheric regions; the rings orbit outside the globe and are not a ground location.",
    coordinateNote: GIANT_COORDINATES,
    environment: [
      { label: "Atmosphere", value: "Mostly hydrogen and helium" },
      { label: "Equatorial winds", value: "Can reach roughly 500 m/s" },
      { label: "Season length", value: "Roughly 7 Earth years" },
      { label: "Main rings", value: "Countless orbiting icy particles" },
    ],
    interior: "Below the clouds, hydrogen becomes a high-pressure fluid and eventually metallic. Gravity and ring-wave measurements help constrain a heavy-element-rich central region mixed with surrounding material. Saturn releases internal heat as well as absorbing sunlight.",
    missions: [
      { name: "Pioneer 11", agency: "NASA", date: "Saturn flyby · 1 Sep 1979", description: "Made the first close encounter with Saturn, measuring its magnetic environment and examining the rings.", sourceUrl: `${SCIENCE}/saturn/exploration/` },
      { name: "Voyager 1 & 2", agency: "NASA", date: "Saturn flybys · 1980 / 1981", description: "Revealed detailed ring structure and the unusual north-polar hexagonal jet.", sourceUrl: VOYAGER },
      { name: "Cassini–Huygens", agency: "NASA / ESA / ASI", date: "Saturn orbit · 2004–2017", description: "Studied seasonal weather and the rings. Huygens landed on the moon Titan in 2005, not on Saturn.", sourceUrl: `${SCIENCE}/mission/cassini/` },
    ],
    sources: [
      { label: "NASA · Saturn science", url: `${SCIENCE}/saturn/facts/` },
      { label: "NASA · the polar hexagon", url: `${SCIENCE}/mission/cassini/science/saturn/hexagon-in-motion/` },
    ],
    limitations: ["Atmospheric coordinates are approximate; longitudes are illustrative rather than fixed cloud positions.", "The 2010 storm is a historical example. Static texture colors and clouds are not current observations."],
    features: [
      { id: "saturn-hexagon", name: "North-polar hexagon", kind: "cloud-band", lat: 78, lon: 0, approximate: true, description: "A six-sided jet-stream pattern encircling the north pole near 78° north. It is a wave in moving air, not a solid structure. Approximate latitude and illustrative longitude mark a segment of the jet.", sourceUrl: `${SCIENCE}/mission/cassini/science/saturn/hexagon-in-motion/` },
      { id: "saturn-polar-vortex", name: "North-polar vortex", kind: "polar-region", lat: 89, lon: -90, approximate: true, description: "A tight, hurricane-like atmospheric vortex lies inside the hexagon. Unlike an Earth hurricane it is not fed by an ocean surface. This is an approximate polar reference with illustrative longitude.", sourceUrl: `${SCIENCE}/mission/cassini/science/saturn/hexagon-in-motion/` },
      { id: "saturn-equatorial", name: "Equatorial jet", kind: "cloud-band", lat: 0, lon: 90, approximate: true, description: "Fast eastward winds sweep the broad equatorial atmosphere. Clouds at different latitudes move at different speeds. The approximate regional pin uses illustrative longitude, not a tracked cloud.", sourceUrl: `${SCIENCE}/saturn/facts/` },
      { id: "saturn-2010-storm", name: "Great storm · 2010–2011", kind: "storm", lat: 35, lon: -120, approximate: true, description: "Cassini observed a huge northern-hemisphere storm that spread around the planet in 2010–2011. The approximate latitude and illustrative longitude recall that historical event, not a storm that remains there today.", sourceUrl: "https://apod.nasa.gov/apod/ap251005.html" },
    ],
  },
  uranus: {
    name: "Uranus", subtitle: "An ice giant turned on its side", category: "ice-giant",
    domain: "atmosphere", accent: "#a1e6ea",
    summary: "A nearly sideways spin axis creates extreme seasons. Its quiet-looking visible disk conceals changing clouds and a seasonal polar cap revealed more clearly at infrared wavelengths.",
    viewLabel: "Seasonal atmospheric regions",
    viewDescription: "Uranus has no solid surface to land on. Close-up imagery is limited to Voyager 2's 1986 flyby; telescope observations add atmospheric context, not detailed surface mapping.",
    coordinateNote: GIANT_COORDINATES,
    environment: [
      { label: "Atmosphere", value: "Hydrogen, helium and methane" },
      { label: "Axial tilt", value: "About 98°; extreme seasonal illumination" },
      { label: "Orbital period", value: "About 84 Earth years" },
      { label: "Visible color", value: "Methane absorption and atmospheric haze" },
    ],
    interior: "The term ice giant describes a composition enriched in water, ammonia and methane relative to Jupiter and Saturn. Deep inside, these materials are hot, dense fluids under extreme pressure, not a frozen landscape. Interior layering and composition remain poorly constrained.",
    missions: [
      { name: "Voyager 2", agency: "NASA", date: "Uranus flyby · 24 Jan 1986", description: "The only spacecraft flyby supplied close-up images and measurements of the tilted magnetic field, rings and moons.", sourceUrl: VOYAGER },
      { name: "James Webb Space Telescope", agency: "NASA / ESA / CSA", date: "Uranus imagery released · Dec 2023", description: "Remote infrared observations resolved the polar cloud cap, nearby storms and faint rings; Webb did not travel to Uranus.", sourceUrl: `${SCIENCE}/missions/webb/nasas-webb-rings-in-holidays-with-ringed-planet-uranus/` },
    ],
    sources: [
      { label: "NASA · Uranus science", url: `${SCIENCE}/uranus/facts/` },
      { label: "NASA · Webb's 2023 Uranus observations", url: `${SCIENCE}/missions/webb/nasas-webb-rings-in-holidays-with-ringed-planet-uranus/` },
    ],
    limitations: ["Limited close-up imagery cannot support an Earth-like geographic atlas of Uranus.", "The polar cap is atmospheric, not ground ice. Pins are approximate regions with illustrative longitudes; cloud patterns vary with time and wavelength."],
    features: [
      { id: "uranus-polar-cap", name: "Northern polar cloud cap", kind: "polar-region", lat: 75, lon: 0, approximate: true, description: "A seasonally bright atmospheric cap seen clearly in infrared observations. Its appearance changes as the pole's illumination changes. This approximate regional anchor uses illustrative longitude; it is not an ice-covered surface.", sourceUrl: `${SCIENCE}/missions/webb/nasas-webb-rings-in-holidays-with-ringed-planet-uranus/` },
      { id: "uranus-cap-edge", name: "Polar-cap edge clouds", kind: "cloud-band", lat: 55, lon: 90, approximate: true, description: "Webb's 2023 images revealed bright storms near and below the polar cap's lower-latitude edge. The approximate latitude is a schematic sampling region, with illustrative longitude, not a catalogued permanent storm.", sourceUrl: `${SCIENCE}/missions/webb/nasas-webb-rings-in-holidays-with-ringed-planet-uranus/` },
      { id: "uranus-equatorial", name: "Equatorial wind region", kind: "cloud-band", lat: 0, lon: -90, approximate: true, description: "Atmospheric winds near the equator blow opposite to the planet's rotation, unlike the prograde flow at higher latitudes. Approximate latitude and illustrative longitude locate a broad wind regime, not terrain.", sourceUrl: `${SCIENCE}/uranus/facts/` },
    ],
  },
  neptune: {
    name: "Neptune", subtitle: "A distant world in motion", category: "ice-giant",
    domain: "atmosphere", accent: "#9ab6ff",
    summary: "Fast winds, bright methane-ice clouds and transient dark vortices animate the most distant planet. Historical flyby images capture moments in a changing atmosphere.",
    viewLabel: "Atmosphere & historical storms",
    viewDescription: "Neptune has no solid surface to land on. Close-up imagery is limited to Voyager 2's 1989 flyby; later telescope observations reveal changing cloud patterns.",
    coordinateNote: GIANT_COORDINATES,
    environment: [
      { label: "Atmosphere", value: "Hydrogen, helium and methane" },
      { label: "Observed winds", value: "Can exceed 2,000 km/h" },
      { label: "Orbital period", value: "About 165 Earth years" },
      { label: "Sunlight", value: "Roughly 1/900 of Earth's intensity" },
    ],
    interior: "A hydrogen-helium atmosphere transitions into a deep, hot, dense interior enriched in water, methane and ammonia above heavier material. The exact composition and layering are uncertain. Neptune's internal heat helps power atmospheric activity far from the Sun.",
    missions: [
      { name: "Voyager 2", agency: "NASA", date: "Neptune flyby · 25 Aug 1989", description: "The only close spacecraft encounter revealed cloud structures, rings and the moon Triton's unusual landscape.", sourceUrl: VOYAGER },
      { name: "Hubble Space Telescope", agency: "NASA / ESA", date: "Neptune observations · 1994", description: "Found that Voyager's Great Dark Spot had disappeared, demonstrating why an atmospheric feature is not a fixed geographic landmark.", sourceUrl: `${SCIENCE}/neptune/exploration/` },
    ],
    sources: [
      { label: "NASA · Neptune science", url: `${SCIENCE}/neptune/facts/` },
      { label: "NASA · Voyager 2 encounter history", url: VOYAGER },
    ],
    limitations: ["Limited imagery cannot provide a detailed surface atlas. Neptune has no accessible solid ground.", "1989 features are historical. All cloud pins use approximate latitudes and illustrative longitudes; enhanced texture colors are not a calibrated natural-color or live view."],
    features: [
      { id: "neptune-dark-spot", name: "Great Dark Spot · 1989", kind: "storm", lat: -22, lon: 0, approximate: true, description: "Voyager 2 imaged a large dark vortex in the southern atmosphere in 1989. It had disappeared by Hubble's 1994 observations. This approximate historical latitude and illustrative longitude do not represent a present-day storm.", sourceUrl: `${SCIENCE}/neptune/facts/` },
      { id: "neptune-scooter", name: "Scooter cloud · 1989", kind: "cloud-band", lat: -42, lon: 90, approximate: true, description: "A bright, fast-moving cloud feature nicknamed Scooter was observed during Voyager 2's encounter. Its approximate historical latitude is shown with illustrative longitude; the cloud is not a permanent landmark.", sourceUrl: VOYAGER },
      { id: "neptune-equatorial", name: "Equatorial wind region", kind: "cloud-band", lat: 0, lon: -120, approximate: true, description: "A reference region for the planet's strong atmospheric circulation and moving methane clouds. Approximate latitude and illustrative longitude sample a broad atmospheric zone rather than a named surface feature.", sourceUrl: `${SCIENCE}/neptune/facts/` },
    ],
  },
};

/** Search names, readable feature categories and scientific descriptions. */
export function filterPlanetFeatures(
  features: readonly PlanetFeature[],
  query: string,
  kind: PlanetFeatureKind | "all" = "all",
): PlanetFeature[] {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return features.filter((feature) => {
    if (kind !== "all" && feature.kind !== kind) return false;
    const searchable = normalize(`${feature.name} ${feature.kind} ${FEATURE_KIND_LABELS[feature.kind]} ${feature.description}`);
    return terms.every((term) => searchable.includes(term));
  });
}

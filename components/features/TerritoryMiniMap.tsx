/**
 * A territory's shape as plain inline SVG — no Leaflet, no tiles, no client JS.
 *
 * The feed renders one of these per run card, so the Leaflet-based maps used on /map and
 * /empire are the wrong tool entirely here: each one mounts a map instance, pulls the leaflet
 * bundle, and fetches OSM tiles. What a feed card needs is the *silhouette* of the ground
 * someone took, at 120px, instantly, in a server component.
 *
 * Coordinates come from the Post's territorySnapshot (already display-simplified at ingest —
 * see simplifyForDisplay in lib/geo.ts), so this is pure projection and path building.
 */

export type PolygonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

/** [minLng, minLat, maxLng, maxLat] */
export type Bbox = [number, number, number, number];

function ringsOf(geometry: PolygonGeometry): number[][][] {
  return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
}

/**
 * Equirectangular projection with a cos(lat) correction on longitude, so a shape doesn't
 * look horizontally stretched away from the equator. Fitted to the viewBox with the aspect
 * ratio preserved (letterboxed), because a squashed territory is a different territory.
 */
function toPath(geometry: PolygonGeometry, bbox: Bbox, width: number, height: number, pad: number): string {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lngScale = Math.cos(midLat) || 1;

  const spanX = Math.max((maxLng - minLng) * lngScale, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  // Centre the fitted shape in whichever axis has slack.
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  const project = ([lng, lat]: number[]): [number, number] => [
    offsetX + (lng - minLng) * lngScale * scale,
    // SVG y grows downward; latitude grows upward.
    height - offsetY - (lat - minLat) * scale,
  ];

  return ringsOf(geometry)
    .map((ring) => {
      if (ring.length < 3) return "";
      const [first, ...rest] = ring.map(project);
      return `M${first[0].toFixed(1)} ${first[1].toFixed(1)}` + rest.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("") + "Z";
    })
    .filter(Boolean)
    .join(" ");
}

export function TerritoryMiniMap({
  geometry,
  bbox,
  color,
  width = 132,
  height = 92,
  className,
}: {
  geometry: PolygonGeometry;
  bbox: Bbox;
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  let path = "";
  try {
    path = toPath(geometry, bbox, width, height, 6);
  } catch {
    // A malformed stored shape costs this card its thumbnail, nothing more.
  }
  if (!path) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="Shape of the claimed territory"
    >
      {/* Faint grid so a small shape still reads as ground rather than a floating blob. */}
      <defs>
        <pattern id="ichor-minimap-grid" width="11" height="11" patternUnits="userSpaceOnUse">
          <path d="M11 0 L0 0 0 11" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.12" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#ichor-minimap-grid)" className="text-white" />
      <path d={path} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

export type TerritoryShape = {
  id: string;
  geometry: PolygonGeometry;
  bbox: Bbox;
  color: string;
  /** Fading land is drawn washed out — upkeep made visible. See lib/territoryUpkeep.ts. */
  fading?: boolean;
};

/**
 * Every shape a runner holds, on one canvas, fitted to their combined extent — an empire at
 * a glance. Used on the profile, where the point isn't navigation (that's what /map is for)
 * but identity: your territory as a portrait, the thing worth screenshotting.
 */
export function TerritoryCollage({
  shapes,
  width = 560,
  height = 320,
  className,
}: {
  shapes: TerritoryShape[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (shapes.length === 0) return null;

  const union: Bbox = [
    Math.min(...shapes.map((s) => s.bbox[0])),
    Math.min(...shapes.map((s) => s.bbox[1])),
    Math.max(...shapes.map((s) => s.bbox[2])),
    Math.max(...shapes.map((s) => s.bbox[3])),
  ];

  const paths = shapes
    .map((s) => {
      try {
        return { ...s, d: toPath(s.geometry, union, width, height, 10) };
      } catch {
        return { ...s, d: "" };
      }
    })
    .filter((s) => s.d);
  if (paths.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${shapes.length} territories held`}
    >
      <defs>
        <pattern id="ichor-collage-grid" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M18 0 L0 0 0 18" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#ichor-collage-grid)" className="text-white" />
      {paths.map((s) => (
        <path
          key={s.id}
          d={s.d}
          fill={s.color}
          fillOpacity={s.fading ? 0.12 : 0.35}
          stroke={s.color}
          strokeWidth={s.fading ? 1 : 2}
          strokeOpacity={s.fading ? 0.5 : 1}
          strokeDasharray={s.fading ? "4 4" : undefined}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

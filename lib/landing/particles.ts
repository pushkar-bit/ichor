// Client-only: samples particle positions from real brand imagery (the logo
// mark, the kangaroo brand frame) plus a procedural running-human pictogram,
// normalized into matching world-space point clouds so they can be morphed
// 1:1 by a shader.

export type Point = { x: number; y: number; z: number };

const TARGET_SIZE = 1.7; // world units, longest dimension of a normalized cloud

function normalizeAndResample(
  raw: { x: number; y: number; brightness: number }[],
  count: number,
  targetSize: number = TARGET_SIZE
): Point[] {
  if (raw.length === 0) {
    return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of raw) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = targetSize / Math.max(w, h);

  // Shuffle so index i doesn't correlate with scan order (nicer chaos mid-morph).
  const shuffled = raw.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const base = shuffled[i % shuffled.length];
    const pad = shuffled.length < count ? 0.015 : 0;
    const jitterX = pad ? (Math.random() - 0.5) * pad : 0;
    const jitterY = pad ? (Math.random() - 0.5) * pad : 0;
    const brightness = base.brightness / 255;
    out.push({
      x: (base.x - cx) * scale + jitterX,
      y: -(base.y - cy) * scale + jitterY, // flip: canvas y-down -> world y-up
      z: (brightness - 0.5) * 0.5,
    });
  }
  return out;
}

function sampleCanvasBright(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number,
  stride: number
): { x: number; y: number; brightness: number }[] {
  const { data } = ctx.getImageData(0, 0, width, height);
  const candidates: { x: number; y: number; brightness: number }[] = [];
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum > threshold) {
        candidates.push({ x, y, brightness: Math.min(255, lum) });
      }
    }
  }
  return candidates;
}

/** Loads a brand image and samples its bright (foreground) pixels into a point cloud. */
async function sampleImageCloud(
  src: string,
  count: number,
  threshold: number,
  stride: number,
  targetSize: number = TARGET_SIZE
): Promise<Point[]> {
  const img = new Image();
  img.src = src;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const candidates = sampleCanvasBright(
    ctx,
    canvas.width,
    canvas.height,
    threshold,
    stride
  );
  return normalizeAndResample(candidates, count, targetSize);
}

/** The real ICHOR mark, sampled from brand art (not hand-drawn). */
export function sampleLogoCloud(count: number): Promise<Point[]> {
  return sampleImageCloud("/images/logo-mark-source.jpg", count, 95, 2, TARGET_SIZE);
}

/** The kangaroo brand frame, sized up and thresholded low for a bold, solid silhouette. */
export function sampleKangarooCloud(count: number): Promise<Point[]> {
  return sampleImageCloud(
    "/images/kangaroo-source.jpg",
    count,
    50,
    3,
    TARGET_SIZE * 1.32
  );
}

/**
 * The kangaroo mid-leap — legs tucked, tail extended for balance, body
 * pitched forward — sampled from an actual rendered jump rather than the
 * standing pose. Blended in during the airborne part of each hop so the
 * animal's pose actually changes through the jump instead of the standing
 * silhouette just translating up and down.
 */
export function sampleKangarooLeapCloud(count: number): Promise<Point[]> {
  return sampleImageCloud(
    "/images/kangaroo-leap-source.jpg",
    count,
    68,
    3,
    TARGET_SIZE * 1.32
  );
}

/**
 * A procedural running pictogram (head, leaning torso, legs, swinging arms).
 * The video's runner frame has a busy on-location background that can't be
 * cleanly isolated by luminance, so this is drawn rather than sampled from
 * a photo — same bold-stroke approach as the shoe cursor glyph.
 *
 * `mirrored` produces the opposite half of the running stride — every limb
 * reflected around the hip's x so whichever leg/arm was driving forward is
 * now trailing back and vice versa, while the torso/head lean (the body's
 * constant forward-facing orientation) stays put. Crossfading between the
 * two during the run phase is what makes the legs actually cycle instead
 * of one frozen pose just bobbing up and down.
 */
export function sampleHumanCloud(
  count: number,
  mirrored = false
): Point[] {
  const size = 420;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const HIP_X = 178;
  const mx = (x: number) => (mirrored ? HIP_X * 2 - x : x);

  const seg = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number
  ) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(mx(x1), y1);
    ctx.lineTo(mx(x2), y2);
    ctx.stroke();
  };

  // Torso (leaning forward into the stride) — not mirrored, the body keeps
  // facing/leaning the same direction throughout; only limbs alternate.
  ctx.lineWidth = 40;
  ctx.beginPath();
  ctx.moveTo(228, 92);
  ctx.lineTo(178, 195);
  ctx.stroke();
  // Back leg: extended behind, pushing off
  seg(178, 195, 100, 235, 34);
  seg(100, 235, 62, 322, 28);
  // Front leg: knee driving up and forward
  seg(178, 195, 258, 208, 34);
  seg(258, 208, 234, 305, 30);
  // Back arm: swung back and up
  seg(214, 108, 258, 122, 22);
  seg(258, 122, 284, 92, 18);
  // Front arm: swung forward and down, bent at elbow
  seg(202, 108, 152, 132, 22);
  seg(152, 132, 112, 178, 18);
  // Head
  ctx.beginPath();
  ctx.arc(232, 60, 32, 0, Math.PI * 2);
  ctx.fill();

  const candidates = sampleCanvasBright(ctx, size, size, 128, 2);
  return normalizeAndResample(candidates, count, TARGET_SIZE * 1.3);
}

export function pointsToFloat32(points: Point[]): Float32Array {
  const arr = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    arr[i * 3] = points[i].x;
    arr[i * 3 + 1] = points[i].y;
    arr[i * 3 + 2] = points[i].z;
  }
  return arr;
}

/** A scattered sphere cloud used as the "genesis" starting state. */
export function sampleScatterCloud(count: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const radius = 2.6 + Math.random() * 1.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    out.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi) * 0.6,
    });
  }
  return out;
}

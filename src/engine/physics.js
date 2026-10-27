// Pure geometry helpers. No game state lives here.

const DEG = Math.PI / 180;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Velocity for a speed and an angle measured from straight up (negative = left). */
export function velocityFromVertical(speed, angleDeg, upward = true) {
  const a = angleDeg * DEG;
  return { vx: Math.sin(a) * speed, vy: (upward ? -1 : 1) * Math.cos(a) * speed };
}

/** Angle of a velocity from vertical, in degrees, 0..90. */
export function angleFromVertical(vx, vy) {
  return Math.atan2(Math.abs(vx), Math.abs(vy)) / DEG;
}

/**
 * Keeps a velocity at the given speed and no flatter than maxDeg from vertical,
 * so the ball can never get stuck bouncing almost sideways forever.
 */
export function limitAngle(vx, vy, speed, maxDeg) {
  const ang = Math.min(angleFromVertical(vx, vy), maxDeg);
  const sx = vx < 0 ? -1 : 1;
  const sy = vy < 0 ? -1 : 1;
  return { vx: sx * Math.sin(ang * DEG) * speed, vy: sy * Math.cos(ang * DEG) * speed };
}

/** Rotates a velocity by deg degrees. */
export function rotate(vx, vy, deg) {
  const a = deg * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { vx: vx * c - vy * s, vy: vx * s + vy * c };
}

/**
 * Circle vs axis-aligned rectangle. Returns null when apart, otherwise the side
 * the circle should bounce on: 'x' (left/right face), 'y' (top/bottom face) or
 * 'corner' (both), plus how deep it went on each axis.
 */
export function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  if (dx * dx + dy * dy > r * r) return null;
  const ox = Math.min(cx + r - rx, rx + rw - (cx - r));
  const oy = Math.min(cy + r - ry, ry + rh - (cy - r));
  const CORNER_TOLERANCE = 0.75;
  let axis;
  if (Math.abs(ox - oy) <= CORNER_TOLERANCE) axis = 'corner';
  else axis = ox < oy ? 'x' : 'y';
  return { axis, ox, oy };
}

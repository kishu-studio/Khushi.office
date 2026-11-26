// Mutable state shared between the scroll system and the 3D frame loop.
// Nothing here triggers a React re-render: useFrame reads it every frame.
export const scroll = {
  progress: 0,        // 0..1 for the current mode's scroll space
  velocity: 0,
}

export const pointer = { x: 0, y: 0 } // -1..1, for a subtle camera parallax

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
// Map p in [a,b] to 0..1 with smoothstep easing
export const span = (p, a, b) => {
  const t = clamp01((p - a) / (b - a))
  return t * t * (3 - 2 * t)
}

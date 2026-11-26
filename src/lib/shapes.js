import * as THREE from 'three'

// 2D shapes used to build the villa's signature forms (arches, rounded slabs, rings).

const EXTRUDE = { bevelEnabled: false, curveSegments: 28 }

export function extrude(shape, depth, opts = {}) {
  const g = new THREE.ExtrudeGeometry(shape, { ...EXTRUDE, depth, ...opts })
  g.computeVertexNormals()
  return g
}

// Arch opening path: straight sides, semicircle on top. Bottom at y0.
export function archPath(cx, y0, w, h, PathType = THREE.Path) {
  const r = w / 2
  const p = new PathType()
  p.moveTo(cx - r, y0)
  p.lineTo(cx + r, y0)
  p.lineTo(cx + r, y0 + h - r)
  p.absarc(cx, y0 + h - r, r, 0, Math.PI, false)
  p.lineTo(cx - r, y0)
  return p
}

export function archShape(w, h) {
  return archPath(0, 0, w, h, THREE.Shape)
}

// An arch-shaped frame standing on the ground: outer arch minus inner arch, open at the bottom.
export function archFrameShape(outerW, outerH, innerW, innerH) {
  const R = outerW / 2
  const r = innerW / 2
  const s = new THREE.Shape()
  s.moveTo(-R, 0)
  s.lineTo(-R, outerH - R)
  s.absarc(0, outerH - R, R, Math.PI, 0, true)
  s.lineTo(R, 0)
  s.lineTo(r, 0)
  s.lineTo(r, innerH - r)
  s.absarc(0, innerH - r, r, 0, Math.PI, false)
  s.lineTo(-r, 0)
  s.lineTo(-R, 0)
  return s
}

// Thin arch outline (for layered arch panels on the dining wall).
export function archRingShape(w, h, t) {
  const s = archShape(w, h)
  const hole = archPath(0, t, w - 2 * t, h - 2 * t)
  s.holes.push(hole)
  return s
}

export function roundedRectShape(w, h, r, PathType = THREE.Shape, cx = 0, cy = 0) {
  const x = cx - w / 2
  const y = cy - h / 2
  const s = new PathType()
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

// Capsule ring: the tall rounded "pipe" frames on the villa's side wall.
export function capsuleRingShape(w, h, t) {
  const s = roundedRectShape(w, h, w / 2 - 0.001)
  s.holes.push(roundedRectShape(w - 2 * t, h - 2 * t, (w - 2 * t) / 2 - 0.001, THREE.Path))
  return s
}

export function ringShape(R, r) {
  const s = new THREE.Shape()
  s.absarc(0, 0, R, 0, Math.PI * 2, false)
  const h = new THREE.Path()
  h.absarc(0, 0, r, 0, Math.PI * 2, true)
  s.holes.push(h)
  return s
}

// Rectangular wall panel with arbitrary holes (each a THREE.Path).
export function panelWithHoles(w, h, holes) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(w / 2, 0)
  s.lineTo(w / 2, h)
  s.lineTo(-w / 2, h)
  s.lineTo(-w / 2, 0)
  holes.forEach((p) => s.holes.push(p))
  return s
}

export function rectPath(x0, y0, x1, y1) {
  const p = new THREE.Path()
  p.moveTo(x0, y0)
  p.lineTo(x1, y0)
  p.lineTo(x1, y1)
  p.lineTo(x0, y1)
  p.lineTo(x0, y0)
  return p
}

export function circlePath(cx, cy, r) {
  const p = new THREE.Path()
  p.absarc(cx, cy, r, 0, Math.PI * 2, true)
  return p
}

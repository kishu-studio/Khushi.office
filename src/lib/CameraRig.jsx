import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { easing } from 'maath'
import { scroll, pointer } from './store.js'

// Scroll-driven camera: keyframes {t, pos, look} are joined by Catmull-Rom splines.
// Scroll progress never touches React state; the camera is damped toward the spline point
// every frame, so the motion stays smooth whatever the scroll wheel does.
// dolly: [from, to] progress range where, on tall screens, the camera backs off along its view
// line so a wide subject (the monitor) still fits side to side.
export default function CameraRig({ keys, fov = 50, damping = 0.35, parallax = 0.06, dolly = null }) {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(...keys[0].look))
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpLook = useMemo(() => new THREE.Vector3(), [])

  const curves = useMemo(() => ({
    pos: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal', 0.4),
    look: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal', 0.4),
    ts: keys.map((k) => k.t),
  }), [keys])

  // Snap to the first frame when the scene mounts.
  useMemo(() => {
    const u = toU(scroll.progress, curves.ts)
    camera.fov = fitFov(fov, camera.aspect)
    camera.position.copy(curves.pos.getPoint(u))
    look.current.copy(curves.look.getPoint(u))
    if (dolly) backOff(camera.position, look.current, fov, camera, dolly)
    camera.updateProjectionMatrix()
    camera.lookAt(look.current)
  }, [curves]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    // On tall (phone) screens keep roughly the same side-to-side view as on a laptop.
    const f = fitFov(fov, camera.aspect)
    if (Math.abs(camera.fov - f) > 0.01) {
      camera.fov = f
      camera.updateProjectionMatrix()
    }
    const u = toU(scroll.progress, curves.ts)
    curves.pos.getPoint(u, tmpPos)
    curves.look.getPoint(u, tmpLook)
    if (dolly) backOff(tmpPos, tmpLook, fov, camera, dolly)
    tmpPos.x += pointer.x * parallax
    tmpPos.y += pointer.y * parallax * 0.5
    easing.damp3(camera.position, tmpPos, damping, dt)
    easing.damp3(look.current, tmpLook, damping, dt)
    camera.lookAt(look.current)
  })
  return null
}

// Map progress p (0..1) to the spline parameter u so each keyframe is reached at its own t.
function toU(p, ts) {
  const n = ts.length
  if (p <= ts[0]) return 0
  if (p >= ts[n - 1]) return 1
  let i = 0
  while (i < n - 2 && p > ts[i + 1]) i++
  const f = (p - ts[i]) / (ts[i + 1] - ts[i])
  return (i + f) / (n - 1)
}

// Vertical FOV that keeps at least the horizontal view of a 16:10 screen.
function fitFov(fov, aspect) {
  const ref = 1.6
  if (aspect >= ref) return fov
  const h = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * ref)
  return Math.min(80, (2 * Math.atan(Math.tan(h / 2) / aspect) * 180) / Math.PI)
}

// Push pos away from look so the horizontal view matches a 16:10 screen, faded in over dolly.
function backOff(pos, look, fov, camera, [a, b]) {
  if (camera.aspect >= 1.6) return
  const x = Math.min(1, Math.max(0, (scroll.progress - a) / (b - a)))
  const w = x * x * (3 - 2 * x)
  if (!w) return
  const want = Math.tan((fov * Math.PI) / 360) * 1.6
  const have = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect
  const k = 1 + (want / have - 1) * w
  pos.sub(look).multiplyScalar(k).add(look)
}

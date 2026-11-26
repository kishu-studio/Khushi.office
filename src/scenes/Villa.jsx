import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import CameraRig from '../lib/CameraRig.jsx'
import StaticMerge from '../lib/StaticMerge.jsx'
import { scroll, span } from '../lib/store.js'
import {
  extrude, archPath, archShape, archFrameShape, archRingShape, roundedRectShape,
  capsuleRingShape, ringShape, panelWithHoles, rectPath,
} from '../lib/shapes.js'
import { fluted, marble, darkMarble, wood, stucco, mirrorGrid, shag } from '../lib/textures.js'
import { pbr } from '../lib/pbr.js'

// One villa from two projects: the Dharmikbhai bungalow is the shell, the Maninagar apartment
// is the ground floor inside it. Units are metres. Front of the house faces +z (the street).
//   ground: y = 0 · plinth / interior floor: y = 0.45 · building x -5..5, z -8..2
//   compound wall at z ≈ 6, car gate centred at x = 3, pedestrian gate at x = -0.7

export const VILLA_KEYS = [
  { t: 0.0, pos: [2.4, 3.0, 21.5], look: [0.4, 5.6, 0] },
  { t: 0.09, pos: [2.9, 1.8, 11], look: [3.0, 2.0, 2] },
  { t: 0.17, pos: [3.0, 1.75, 7.6], look: [3.0, 1.8, 0] },
  { t: 0.25, pos: [0.2, 1.75, 4.6], look: [-3.0, 2.0, 2.0] },
  { t: 0.32, pos: [-3.0, 1.9, 3.2], look: [-3.0, 1.9, 0] },
  { t: 0.38, pos: [-3.0, 2.05, 1.1], look: [-4.6, 1.9, -1.2] },
  { t: 0.46, pos: [-1.3, 2.1, 0.9], look: [-4.6, 1.7, -1.5] },
  { t: 0.54, pos: [-0.7, 2.0, -0.7], look: [-3.6, 1.2, -2.6] },
  { t: 0.62, pos: [0.6, 2.05, 1.0], look: [4.6, 1.9, -0.6] },
  { t: 0.7, pos: [1.7, 2.0, 0.85], look: [3.3, 2.25, -0.9] },
  { t: 0.79, pos: [2.9, 2.05, -1.9], look: [3.0, 1.4, -7.2] },
  { t: 0.86, pos: [0.6, 2.05, -2.9], look: [-0.1, 1.8, -5.5] },
  { t: 0.93, pos: [-0.1, 2.05, -4.6], look: [-4.5, 1.3, -5.9] },
  { t: 1.0, pos: [-1.4, 2.0, -5.3], look: [-4.6, 1.4, -5.8] },
]

const C = {
  facade: '#b8966f',
  facadeLight: '#c8ae8c',
  wall: '#cdc3b6',
  bronze: '#4b3b2e',
  gold: '#c58a3e',
  white: '#f1eee9',
  greige: '#e3dcd2',
  led: '#ffd49a',
}

export default function Villa() {
  const mats = useMaterials()
  return (
    <>
      <CameraRig keys={VILLA_KEYS} fov={55} damping={0.38} parallax={0.05} />
      <fog attach="fog" args={['#cfdbe6', 40, 120]} />
      <Lights />
      <color attach="background" args={['#cfdbe6']} />
      {/* the sky loads on its own so the house never waits for it */}
      <Suspense fallback={null}>
        <Environment files="hdri/kloofendal_43d_clear_puresky_1k.hdr" background environmentIntensity={0.45} />
      </Suspense>
      <StaticMerge onStats={(s) => (window.__merge = s)}>
        <Ground mats={mats} />
        <CompoundWall mats={mats} />
        <Building mats={mats} />
        <Landscape />
        <Interior mats={mats} />
      </StaticMerge>
      <Gates mats={mats} />
      <StaticShadows />
    </>
  )
}

function StaticShadows() {
  const { gl } = useThree()
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    const t = setTimeout(() => (gl.shadowMap.needsUpdate = true), 800)
    return () => clearTimeout(t)
  }, [gl])
  return null
}

function useMaterials() {
  return useMemo(() => {
    const facadeTex = stucco(C.facade, 5, 'facade')
    facadeTex.repeat.set(3, 3)
    const wallTex = stucco(C.wall, 8, 'cwall')
    wallTex.repeat.set(4, 1)
    const floorTex = marble('#ece9e4', 'rgba(130,125,118,0.22)', 4, 'floor')
    floorTex.repeat.set(3, 3)
    return {
      facade: pbr('clay_plaster', { size: 2.5, color: C.facade, diffuse: false, normal: 0.7 }),
      facadeLight: pbr('clay_plaster', { size: 2.5, color: C.facadeLight, diffuse: false, normal: 0.7 }),
      wall: pbr('clay_plaster', { size: 2.5, color: C.wall, diffuse: false, normal: 0.7 }),
      bronze: new THREE.MeshStandardMaterial({ color: C.bronze, roughness: 0.45, metalness: 0.6 }),
      gold: new THREE.MeshStandardMaterial({ color: C.gold, roughness: 0.3, metalness: 0.85 }),
      glass: new THREE.MeshStandardMaterial({ color: '#a9bcc4', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.32 }),
      curtain: new THREE.MeshStandardMaterial({ color: '#f6f1e8', roughness: 1, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
      white: pbr('beige_wall_001', { size: 2, color: C.white, normal: 0.5, diffuse: false }),
      greige: new THREE.MeshStandardMaterial({ color: C.greige, roughness: 0.8 }),
      floor: pbr('marble_01', { size: 1.6, roughness: 0.35, normal: 0.3 }),
      led: new THREE.MeshBasicMaterial({ color: C.led, toneMapped: false }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2521', roughness: 0.5 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#4f6d3f', roughness: 0.85, flatShading: true }),
      leaf2: new THREE.MeshStandardMaterial({ color: '#6c8a4e', roughness: 0.85, flatShading: true }),
      trunk: new THREE.MeshStandardMaterial({ color: '#7a6a58', roughness: 0.9 }),
    }
  }, [])
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#f3f1ec', '#8a7a68', 0.55]} />
      <directionalLight
        position={[-12, 18, 14]}
        intensity={2.6}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={60}
      />
      {/* interior: warm lamps, no shadows */}
      <pointLight position={[-2.5, 3.0, -1.2]} intensity={9} distance={8} decay={2} color="#ffe2b8" />
      <pointLight position={[2.9, 2.9, -0.5]} intensity={8} distance={7} decay={2} color="#ffe2b8" />
      <pointLight position={[2.9, 2.9, -5.6]} intensity={7} distance={7} decay={2} color="#fff0dc" />
      <pointLight position={[-2.2, 2.9, -5.8]} intensity={7} distance={7} decay={2} color="#ffe6c4" />
    </>
  )
}

/* ─────────────────────────── outside ─────────────────────────── */

function Ground({ mats }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#6f8752" roughness={1} />
      </mesh>
      {/* wet road */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 12.2]} receiveShadow>
        <planeGeometry args={[80, 12]} />
        <meshStandardMaterial color="#3a3e42" roughness={0.18} metalness={0.35} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 11.2]}>
        <planeGeometry args={[80, 0.12]} />
        <meshStandardMaterial color="#e9e7e2" roughness={0.6} />
      </mesh>
      {/* courtyard paving */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, -1.6]} receiveShadow>
        <planeGeometry args={[18, 15]} />
        <meshStandardMaterial color="#b9b2a6" roughness={0.75} />
      </mesh>
      {/* kerb in front of the wall */}
      <mesh position={[0, 0.06, 6.35]} receiveShadow castShadow material={mats.wall}>
        <boxGeometry args={[18.4, 0.12, 0.5]} />
      </mesh>
    </group>
  )
}

function CompoundWall({ mats }) {
  const geos = useMemo(() => {
    // Left run: high at the corner, dips in one soft wave, rises to the pedestrian gate.
    const left = new THREE.Shape()
    left.moveTo(-9, 0)
    left.lineTo(-9, 2.2)
    left.bezierCurveTo(-7.2, 2.2, -6.2, 1.05, -4.4, 1.05)
    left.bezierCurveTo(-2.9, 1.05, -2.3, 2.6, -1.6, 2.6)
    left.lineTo(0.4, 2.6)
    left.lineTo(0.4, 0)
    left.lineTo(-0.15, 0)
    left.lineTo(-0.15, 1.65)
    left.absarc(-0.7, 1.65, 0.55, 0, Math.PI, false)
    left.lineTo(-1.25, 0)
    left.lineTo(-9, 0)
    const right = new THREE.Shape()
    right.moveTo(5.6, 0)
    right.lineTo(5.6, 2.5)
    right.bezierCurveTo(6.8, 2.5, 7.6, 1.8, 9, 1.8)
    right.lineTo(9, 0)
    right.lineTo(5.6, 0)
    return {
      left: extrude(left, 0.3),
      right: extrude(right, 0.3),
      frame: extrude(archFrameShape(5.2, 4.3, 4.2, 3.6), 0.45),
    }
  }, [])
  return (
    <group position={[0, 0, 5.85]}>
      <mesh geometry={geos.left} material={mats.wall} castShadow receiveShadow />
      <mesh geometry={geos.right} material={mats.wall} castShadow receiveShadow />
      <mesh geometry={geos.frame} material={mats.wall} position={[3, 0, -0.07]} castShadow receiveShadow />
      {/* side walls of the plot */}
      <mesh position={[-9, 1.1, -6]} material={mats.wall} castShadow receiveShadow>
        <boxGeometry args={[0.3, 2.2, 24]} />
      </mesh>
      <mesh position={[9, 0.9, -6]} material={mats.wall} castShadow receiveShadow>
        <boxGeometry args={[0.3, 1.8, 24]} />
      </mesh>
    </group>
  )
}

// Louvred gate leaves clipped to the arch.
function louvreSlats(halfW, archR, archCY, height, step = 0.13) {
  const slats = []
  for (let y = 0.12; y < height - 0.05; y += step) {
    let w = halfW
    if (y > archCY) w = Math.min(halfW, Math.sqrt(Math.max(0, archR * archR - (y - archCY) ** 2)))
    if (w > 0.05) slats.push({ y, w })
  }
  return slats
}

function Leaf({ side, mats, halfW, archR, archCY, height, open }) {
  // side = -1: left leaf, hinged at x = -halfW; side = +1: right leaf, hinged at +halfW.
  // A slat whose half-width (clipped by the arch) is w spans halfW - w .. halfW from the hinge.
  const slats = useMemo(() => louvreSlats(halfW, archR, archCY, height), [halfW, archR, archCY, height])
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = -side * open() * 1.45 // both leaves swing into the courtyard
  })
  return (
    <group ref={ref} position={[side * halfW, 0, 0]}>
      {slats.map((s, i) => (
        <mesh key={i} position={[-side * (halfW - s.w / 2), s.y, 0]} material={mats.bronze} castShadow>
          <boxGeometry args={[Math.max(0.05, s.w - 0.02), 0.07, 0.04]} />
        </mesh>
      ))}
      {/* stile at the hinge (as tall as the arch springs) and at the meeting edge (full height) */}
      <mesh position={[-side * 0.03, archCY / 2, 0]} material={mats.bronze}>
        <boxGeometry args={[0.05, archCY, 0.06]} />
      </mesh>
      <mesh position={[-side * (halfW - 0.03), height / 2, 0]} material={mats.bronze}>
        <boxGeometry args={[0.05, height, 0.06]} />
      </mesh>
    </group>
  )
}

function Gates({ mats }) {
  const open = () => span(scroll.progress, 0.08, 0.17)
  const closed = () => 0
  return (
    <group position={[0, 0, 6]}>
      {/* car gate: inner arch 4.2 wide, 3.6 tall (radius 2.1, centre at 1.5) */}
      <group position={[3, 0, 0]}>
        <Leaf side={-1} mats={mats} halfW={2.1} archR={2.1} archCY={1.5} height={3.58} open={open} />
        <Leaf side={1} mats={mats} halfW={2.1} archR={2.1} archCY={1.5} height={3.58} open={open} />
      </group>
      {/* pedestrian gate */}
      <group position={[-0.7, 0, 0]}>
        <Leaf side={-1} mats={mats} halfW={0.55} archR={0.55} archCY={1.65} height={2.18} open={closed} />
        <Leaf side={1} mats={mats} halfW={0.55} archR={0.55} archCY={1.65} height={2.18} open={closed} />
      </group>
    </group>
  )
}

function Building({ mats }) {
  const g = useMemo(() => {
    // floor slabs: rounded in plan, deeper at the front where they become balconies
    const slab = (w, d, r) => {
      const s = roundedRectShape(w, d, r)
      const geo = extrude(s, 0.4)
      geo.rotateX(-Math.PI / 2) // shape XY → plan XZ (shape y → -z)
      return geo
    }
    // ground floor front: arched door + two long windows
    const gf = panelWithHoles(10, 3.0, [
      archPath(-3, 0.02, 1.3, 2.72),
      rectPath(-1.7, 0.35, 1.3, 2.75),
      rectPath(1.8, 0.35, 4.4, 2.75),
    ])
    // first floor front: one long window
    const ff = panelWithHoles(10, 2.9, [rectPath(-3.6, 0.45, 3.1, 2.45)])
    // second floor front: three arches
    const sf = panelWithHoles(10, 3.1, [archPath(-2.6, 0.35, 1.4, 2.45), archPath(-0.8, 0.35, 1.4, 2.45), archPath(1.0, 0.35, 1.4, 2.45)])
    // the curled roof: section in (z, y), extruded across the width
    const roof = new THREE.Shape()
    roof.moveTo(-8.6, 0)
    roof.lineTo(2.4, 0)
    roof.quadraticCurveTo(3.25, 0.0, 3.5, 0.8)
    roof.lineTo(3.34, 0.86)
    roof.quadraticCurveTo(3.1, 0.36, 2.4, 0.36)
    roof.lineTo(-8.6, 0.36)
    roof.lineTo(-8.6, 0)
    return {
      slab1: slab(10.6, 11.6, 0.9),
      slab2: slab(10.2, 10.6, 0.8),
      gf: extrude(gf, 0.25),
      gfIn: extrude(gf, 0.01),
      ff: extrude(ff, 0.25),
      sf: extrude(sf, 0.25),
      roof: extrude(roof, 11.2, { curveSegments: 32 }),
      doorRing: extrude(archRingShape(1.46, 2.8, 0.08), 0.34),
      doorLeaf: extrude(archShape(1.3, 2.72), 0.06),
      arch: extrude(archShape(1.4, 2.45), 0.01),
      capsule: extrude(capsuleRingShape(0.7, 6.2, 0.14), 0.16),
      round: extrude(ringShape(0.95, 0.82), 0.18),
      porthole: extrude(ringShape(0.24, 0.17), 0.08),
    }
  }, [])

  const doorRef = useRef()
  useFrame(() => {
    if (doorRef.current) doorRef.current.rotation.y = span(scroll.progress, 0.215, 0.275) * 1.55
  })

  return (
    <group>
      {/* plinth */}
      <mesh position={[0, 0.225, -3]} receiveShadow castShadow>
        <boxGeometry args={[10.4, 0.45, 10.6]} />
        <meshStandardMaterial color="#a9a397" roughness={0.9} />
      </mesh>

      {/* ── ground floor ── */}
      <group position={[0, 0.45, 1.75]}>
        <mesh geometry={g.gf} material={mats.facade} castShadow receiveShadow />
        <mesh geometry={g.gfIn} material={mats.white} position={[0, 0, -0.012]} />
        {/* door frame in bronze-gold and the door leaf */}
        <mesh geometry={g.doorRing} material={mats.gold} position={[-3, -0.02, -0.03]} castShadow />
        <group ref={doorRef} position={[-3.65, 0.02, 0.1]} userData={{ noMerge: true }}>
          <mesh geometry={g.doorLeaf} material={mats.white} position={[0.65, 0, 0]} castShadow />
        </group>
        {/* windows: glass, mullions, curtains */}
        <Glazing mats={mats} x0={-1.7} x1={1.3} y0={0.35} y1={2.75} z={0.12} />
        <Glazing mats={mats} x0={1.8} x1={4.4} y0={0.35} y1={2.75} z={0.12} />
      </group>
      {/* ground floor side and back walls */}
      <Walls mats={mats} y0={0.45} h={3.0} zFront={1.75} zBack={-8} />

      {/* ── first floor ── */}
      <mesh geometry={g.slab1} material={mats.facadeLight} position={[0, 3.45, -2.3]} castShadow receiveShadow />
      <mesh position={[0, 3.45 - 0.01, 3.35]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[10.3, 0.05]} />
        <primitive object={mats.led} attach="material" />
      </mesh>
      <group position={[0, 3.85, 1.05]}>
        <mesh geometry={g.ff} material={mats.facade} castShadow receiveShadow />
        <Glazing mats={mats} x0={-3.6} x1={3.1} y0={0.45} y1={2.45} z={0.12} />
        {/* portholes */}
        {[4.0, 4.55].map((x) => (
          <group key={x} position={[x, 1.95, 0.25]}>
            <mesh geometry={g.porthole} material={mats.facadeLight} />
            <mesh position={[0, 0, 0.01]}>
              <circleGeometry args={[0.17, 32]} />
              <meshStandardMaterial color="#2e2a27" roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>
      <Walls mats={mats} y0={3.85} h={2.9} zFront={1.05} zBack={-8} />
      {/* balcony parapet with planters */}
      <RoundedBox args={[10.4, 0.95, 0.2]} radius={0.09} position={[0, 3.85 + 0.475, 3.38]} material={mats.facade} castShadow receiveShadow />
      <Planter position={[-4.2, 3.85, 2.8]} mats={mats} tree />
      <Planter position={[2.2, 3.85, 2.85]} mats={mats} />

      {/* ── second floor ── */}
      <mesh geometry={g.slab2} material={mats.facadeLight} position={[0, 6.75, -2.8]} castShadow receiveShadow />
      <mesh position={[0, 6.75 - 0.01, 2.45]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[9.9, 0.05]} />
        <primitive object={mats.led} attach="material" />
      </mesh>
      <group position={[0, 7.15, 0.35]}>
        <mesh geometry={g.sf} material={mats.facade} castShadow receiveShadow />
        {[-2.6, -0.8, 1.0].map((x) => (
          <group key={x}>
            <mesh geometry={g.arch} material={mats.curtain} position={[x, 0.35, 0.05]} />
            <mesh position={[x, 1.2, 0.08]} material={mats.glass}>
              <planeGeometry args={[1.38, 1.7]} />
            </mesh>
          </group>
        ))}
      </group>
      <Walls mats={mats} y0={7.15} h={3.05} zFront={0.35} zBack={-8} />
      <RoundedBox args={[10.0, 0.9, 0.18]} radius={0.08} position={[0, 7.15 + 0.45, 2.38]} material={mats.facade} castShadow receiveShadow />
      <Planter position={[-4.1, 7.15, 1.8]} mats={mats} tree tall />
      <Planter position={[3.6, 7.15, 1.9]} mats={mats} />

      {/* ── the curled roof ── */}
      <mesh geometry={g.roof} material={mats.facadeLight} rotation-y={-Math.PI / 2} position={[5.6, 10.2, 0]} castShadow receiveShadow />
      <mesh position={[0, 10.19, 0.4]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[11.1, 4.2]} />
        <meshStandardMaterial map={useWoodSoffit()} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 10.17, 2.38]} material={mats.led}>
        <boxGeometry args={[10.9, 0.03, 0.04]} />
      </mesh>
      {[-4.6, 4.6].map((x) => (
        <mesh key={x} position={[x, 8.67, 2.05]} material={mats.facadeLight} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3.05, 24]} />
        </mesh>
      ))}

      {/* ── east side: capsule frames with studs and the round window ── */}
      <group position={[5.02, 0, 0]} rotation-y={Math.PI / 2}>
        {[1.6, 6.4].map((z) => (
          <group key={z} position={[z, 3.95, 0]}>
            <mesh geometry={g.capsule} material={mats.facadeLight} castShadow />
            {[0.55, 3.1, 5.65].map((y) => (
              <mesh key={y} position={[0, y, 0.12]} rotation-x={Math.PI / 2} castShadow>
                <cylinderGeometry args={[0.17, 0.17, 0.12, 24]} />
                <meshStandardMaterial color="#e3d6c3" roughness={0.6} />
              </mesh>
            ))}
          </group>
        ))}
        <group position={[4.0, 7.25, 0]}>
          <mesh geometry={g.round} material={mats.facadeLight} castShadow />
          <mesh position={[0, 0, 0.02]}>
            <circleGeometry args={[0.82, 48]} />
            <meshStandardMaterial color="#f3eee5" roughness={1} />
          </mesh>
          <mesh position={[0, 0, 0.1]} material={mats.bronze}>
            <boxGeometry args={[1.64, 0.04, 0.03]} />
          </mesh>
          <mesh position={[0, 0, 0.1]} material={mats.bronze}>
            <boxGeometry args={[0.04, 1.64, 0.03]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function useWoodSoffit() {
  return useMemo(() => {
    const t = wood('#9a6a3f', 'soffit', 17).clone()
    t.needsUpdate = true
    t.repeat.set(8, 1)
    return t
  }, [])
}

function Walls({ mats, y0, h, zFront, zBack }) {
  const d = zFront - zBack
  const zc = (zFront + zBack) / 2
  return (
    <group>
      <mesh position={[-4.875, y0 + h / 2, zc]} material={mats.facade} castShadow receiveShadow>
        <boxGeometry args={[0.25, h, d]} />
      </mesh>
      <mesh position={[4.875, y0 + h / 2, zc]} material={mats.facade} castShadow receiveShadow>
        <boxGeometry args={[0.25, h, d]} />
      </mesh>
      <mesh position={[0, y0 + h / 2, zBack + 0.125]} material={mats.facade} castShadow receiveShadow>
        <boxGeometry args={[10, h, 0.25]} />
      </mesh>
    </group>
  )
}

function Glazing({ mats, x0, x1, y0, y1, z }) {
  const w = x1 - x0
  const h = y1 - y0
  const n = Math.max(2, Math.round(w / 0.7))
  return (
    <group position={[(x0 + x1) / 2, (y0 + y1) / 2, z]}>
      <mesh material={mats.glass}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {Array.from({ length: n - 1 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (w / n) * (i + 1), 0, 0.01]} material={mats.bronze}>
          <boxGeometry args={[0.035, h, 0.03]} />
        </mesh>
      ))}
      <mesh position={[-w / 2 + w * 0.22, 0, -0.2]} material={mats.curtain}>
        <planeGeometry args={[w * 0.4, h]} />
      </mesh>
      <mesh position={[w / 2 - w * 0.18, 0, -0.2]} material={mats.curtain}>
        <planeGeometry args={[w * 0.32, h]} />
      </mesh>
    </group>
  )
}

function Planter({ position, mats, tree, tall }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.1, 0.55, 0.55]} radius={0.06} position={[0, 0.275, 0]} castShadow>
        <meshStandardMaterial color="#d9cbb8" roughness={0.9} />
      </RoundedBox>
      {[[-0.3, 0.7, 0], [0, 0.78, 0.05], [0.3, 0.68, -0.04]].map((p, i) => (
        <mesh key={i} position={p} material={i % 2 ? mats.leaf2 : mats.leaf} castShadow>
          <icosahedronGeometry args={[0.28, 0]} />
        </mesh>
      ))}
      {tree && <Tree mats={mats} height={tall ? 2.8 : 2.1} />}
    </group>
  )
}

function Tree({ mats, height = 2.4, position = [0, 0.5, 0] }) {
  const blobs = useMemo(() => {
    const out = []
    for (let i = 0; i < 7; i++) {
      const a = i * 1.7
      out.push([Math.cos(a) * 0.45, height - 0.2 + Math.sin(i * 2.3) * 0.35, Math.sin(a) * 0.4, 0.36 + (i % 3) * 0.08])
    }
    return out
  }, [height])
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} material={mats.trunk} castShadow>
        <cylinderGeometry args={[0.04, 0.07, height, 8]} />
      </mesh>
      {blobs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={i % 2 ? mats.leaf2 : mats.leaf} castShadow>
          <icosahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
    </group>
  )
}

function Palm({ position, height = 4.2, lean = 0.08 }) {
  const fronds = useMemo(() => Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2), [])
  return (
    <group position={position} rotation-z={lean}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, height, 10]} />
        <meshStandardMaterial color="#8c7a63" roughness={0.95} />
      </mesh>
      {fronds.map((a, i) => (
        <group key={i} position={[0, height, 0]} rotation-y={a}>
          <mesh position={[0.75, -0.18, 0]} rotation-z={-0.45} castShadow>
            <boxGeometry args={[1.6, 0.02, 0.32]} />
            <meshStandardMaterial color={i % 2 ? '#5f8044' : '#4d6d38'} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Landscape() {
  const mats = useMemo(() => ({
    leaf: new THREE.MeshStandardMaterial({ color: '#4f6d3f', roughness: 0.85, flatShading: true }),
    leaf2: new THREE.MeshStandardMaterial({ color: '#6c8a4e', roughness: 0.85, flatShading: true }),
    trunk: new THREE.MeshStandardMaterial({ color: '#7a6a58', roughness: 0.9 }),
    bloom: new THREE.MeshStandardMaterial({ color: '#b0308f', roughness: 0.8, flatShading: true }),
    bloom2: new THREE.MeshStandardMaterial({ color: '#cc4fa7', roughness: 0.8, flatShading: true }),
  }), [])
  const bougainvillea = useMemo(() => {
    const out = []
    for (let i = 0; i < 16; i++) out.push([-8.4 + i * 0.32 + Math.sin(i) * 0.2, 0.4 + Math.abs(Math.sin(i * 1.7)) * 0.9, 6.55 + Math.cos(i * 2.1) * 0.18, 0.35 + (i % 3) * 0.08, i % 2])
    return out
  }, [])
  return (
    <group>
      {bougainvillea.map(([x, y, z, r, k], i) => (
        <mesh key={i} position={[x, y, z]} material={k ? mats.bloom : mats.bloom2} castShadow>
          <icosahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
      <Palm position={[-7.2, 0, 4.2]} height={4.6} lean={0.06} />
      <Palm position={[-5.9, 0, 4.9]} height={3.8} lean={-0.08} />
      <Palm position={[6.6, 0, 3.6]} height={4.2} lean={-0.05} />
      <Tree mats={mats} height={5.5} position={[-12, 0, -4]} />
      <Tree mats={mats} height={6.5} position={[12.5, 0, -6]} />
      <Tree mats={mats} height={5} position={[11, 0, 3]} />
      <Tree mats={mats} height={7} position={[-14, 0, -12]} />
      <Tree mats={mats} height={6} position={[3, 0, -16]} />
    </group>
  )
}

/* ─────────────────────────── inside (ground floor) ─────────────────────────── */

function Interior({ mats }) {
  return (
    <group>
      {/* marble floor and a clean ceiling */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.455, -3]} material={mats.floor} receiveShadow>
        <planeGeometry args={[9.5, 9.5]} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 3.43, -3]} material={mats.white}>
        <planeGeometry args={[9.6, 9.6]} />
      </mesh>
      {/* inner faces of the perimeter walls */}
      <mesh position={[-4.74, 1.94, -3]} rotation-y={Math.PI / 2} material={mats.white}>
        <planeGeometry args={[9.5, 2.98]} />
      </mesh>
      <mesh position={[4.74, 1.94, -3]} rotation-y={-Math.PI / 2} material={mats.white}>
        <planeGeometry args={[9.5, 2.98]} />
      </mesh>
      <mesh position={[0, 1.94, -7.74]} material={mats.white}>
        <planeGeometry args={[9.5, 2.98]} />
      </mesh>
      <Partitions mats={mats} />
      <Living mats={mats} />
      <Dining mats={mats} />
      <Kitchen mats={mats} />
      <Bedroom mats={mats} />
      <Fans />
      <CeilingCoves mats={mats} />
    </group>
  )
}

function Partitions({ mats }) {
  const H = 2.98
  const y = 0.45 + H / 2
  return (
    <group>
      {/* living | bedroom, with a door gap at x -0.6..0.4 */}
      <mesh position={[-2.675, y, -3.85]} material={mats.white}>
        <boxGeometry args={[4.15, H, 0.14]} />
      </mesh>
      <mesh position={[0.7, y, -3.85]} material={mats.white}>
        <boxGeometry args={[0.6, H, 0.14]} />
      </mesh>
      <mesh position={[-0.1, 3.05, -3.85]} material={mats.white}>
        <boxGeometry args={[1.0, 0.76, 0.14]} />
      </mesh>
      {/* bedroom | kitchen */}
      <mesh position={[1.0, y, -5.8]} material={mats.white}>
        <boxGeometry args={[0.14, H, 3.9]} />
      </mesh>
    </group>
  )
}

// A mountain silhouette: a few broad peaks with a little low-frequency texture, like her relief.
function mountainRidge(width, base, peaks, seed) {
  let r = seed
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280)
  const pts = []
  const n = 90
  for (let i = 0; i <= n; i++) {
    const x = -width / 2 + (width * i) / n
    let y = base
    peaks.forEach(([c, h, w]) => (y += h * Math.exp(-(((x - c) / w) ** 2))))
    y += Math.sin(x * 7.3 + seed) * 0.025 + (rnd() - 0.5) * 0.02
    pts.push([x, y])
  }
  return pts
}

function Living({ mats }) {
  const parts = useMemo(() => {
    const layer = (pts, bottom) => {
      const s = new THREE.Shape()
      s.moveTo(pts[0][0], bottom)
      pts.forEach(([x, y]) => s.lineTo(x, y))
      s.lineTo(pts[pts.length - 1][0], bottom)
      s.lineTo(pts[0][0], bottom)
      return extrude(s, 0.05)
    }
    // back range: tall peak to the right; front range: lower, broader, offset to the left
    const back = mountainRidge(3.0, 0.75, [[0.55, 0.95, 0.42], [-0.35, 0.55, 0.38], [1.15, 0.45, 0.22], [-1.1, 0.3, 0.3]], 7)
    const front = mountainRidge(2.9, 0.2, [[-0.6, 0.75, 0.5], [0.45, 0.5, 0.35], [1.2, 0.25, 0.25], [-1.3, 0.3, 0.2]], 19)
    const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y + 0.01, 0))), 160, r, 6, false)
    return {
      back: layer(back, 0.55),
      front: layer(front, 0.15),
      backGlow: tube(back, 0.007),
      frontGlow: tube(front, 0.007),
      backHalo: tube(back, 0.032),
      frontHalo: tube(front, 0.032),
      niche: extrude(archShape(0.62, 2.1), 0.01),
      nicheRing: extrude(archRingShape(0.72, 2.2, 0.05), 0.04),
    }
  }, [])
  const greyWall = useMemo(() => pbr('beige_wall_001', { size: 2, color: '#dcd8d2', normal: 0.6, diffuse: false }), [])
  const relief = useMemo(() => pbr('beige_wall_001', { size: 1.5, color: '#f6f4f0', normal: 0.8, diffuse: false }), [])
  const nicheMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c3c0bb', roughness: 1 }), [])
  const sofa = useMemo(() => pbr('wool_boucle', { size: 0.35, color: '#e9e2d7', diffuse: false, normal: 1.4 }), [])
  const blackMarble = useMemo(() => new THREE.MeshStandardMaterial({ map: darkMarble(3), roughness: 0.12, metalness: 0.2 }), [])
  const lacquer = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.25 }), [])
  const rug = useMemo(() => new THREE.MeshStandardMaterial({ map: shag('#7a6352'), roughness: 1 }), [])
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cbbd2a', roughness: 0.35, metalness: 0.7 }), [])
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff4dc', toneMapped: false }), [])
  const halo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [])

  return (
    <group>
      {/* mountain feature wall on the west wall; the panel faces +x */}
      <group position={[-4.72, 0.45, -1.35]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 1.49, 0]} material={greyWall}>
          <planeGeometry args={[4.4, 2.98]} />
        </mesh>
        {/* two relief layers; light washes up the wall from behind each ridge */}
        <mesh geometry={parts.back} material={relief} position={[0, 0.55, 0.01]} />
        <mesh geometry={parts.backHalo} material={halo} position={[0, 0.55, 0.012]} scale={[1, 1, 0.2]} />
        <mesh geometry={parts.backGlow} material={mats.led} position={[0, 0.55, 0.062]} />
        <mesh geometry={parts.front} material={relief} position={[0, 0.55, 0.09]} />
        <mesh geometry={parts.frontHalo} material={halo} position={[0, 0.55, 0.092]} scale={[1, 1, 0.2]} />
        <mesh geometry={parts.frontGlow} material={mats.led} position={[0, 0.55, 0.142]} />
        {/* arched niches with brass lamps at both ends */}
        {[-1.8, 1.8].map((x) => (
          <group key={x} position={[x, 0.4, 0.01]}>
            <mesh geometry={parts.niche} material={nicheMat} />
            <mesh geometry={parts.nicheRing} material={mats.white} position={[0, -0.05, 0]} />
            <mesh position={[0.02, 1.35, 0.06]} rotation-z={0.35} material={brass}>
              <cylinderGeometry args={[0.012, 0.012, 0.75, 8]} />
            </mesh>
            <mesh position={[-0.04, 1.3, 0.07]} rotation-z={-0.5} material={brass}>
              <cylinderGeometry args={[0.012, 0.012, 0.55, 8]} />
            </mesh>
            <mesh position={[-0.12, 1.58, 0.1]} material={glow}>
              <sphereGeometry args={[0.065, 20, 20]} />
            </mesh>
            <mesh position={[0.12, 1.05, 0.1]} material={glow}>
              <sphereGeometry args={[0.065, 20, 20]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* the long tufted sofa: along the feature wall, returning along the bedroom wall */}
      <group>
        <mesh position={[-4.2, 0.65, -1.35]} material={sofa}>
          <boxGeometry args={[0.9, 0.4, 4.0]} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <RoundedBox key={i} args={[0.82, 0.16, 0.64]} radius={0.06} position={[-4.18, 0.93, 0.3 - i * 0.66]} material={sofa} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <RoundedBox key={i} args={[0.24, 0.42, 0.6]} radius={0.08} position={[-4.55, 1.2, 0.3 - i * 0.66]} rotation-z={-0.18} material={sofa} />
        ))}
        <mesh position={[-2.7, 0.65, -3.33]} material={sofa}>
          <boxGeometry args={[2.2, 0.4, 0.85]} />
        </mesh>
        {Array.from({ length: 3 }, (_, i) => (
          <RoundedBox key={i} args={[0.7, 0.16, 0.8]} radius={0.06} position={[-3.3 + i * 0.72, 0.93, -3.3]} material={sofa} />
        ))}
        {Array.from({ length: 3 }, (_, i) => (
          <RoundedBox key={i} args={[0.66, 0.42, 0.24]} radius={0.08} position={[-3.3 + i * 0.72, 1.2, -3.66]} rotation-x={0.18} material={sofa} />
        ))}
        {/* throw cushions */}
        {[[-4.32, -0.2, 0.3], [-4.32, -1.6, -0.2], [-3.0, -3.48, 0], [-2.2, -3.48, 0.2]].map(([x, z, r], i) => (
          <RoundedBox key={i} args={[0.14, 0.36, 0.36]} radius={0.06} position={[x, 1.2, z]} rotation-y={r} material={lacquer} />
        ))}
      </group>

      {/* rug and nested oval tables */}
      <RoundedBox args={[2.9, 0.025, 3.4]} radius={0.01} position={[-2.55, 0.47, -1.45]} material={rug} />
      {[[-2.65, -0.55], [-2.3, -2.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0.45, z]}>
          <mesh position={[0, 0.17, 0]} scale={[1.45, 1, 1]} material={blackMarble} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.34, 40]} />
          </mesh>
          <mesh position={[0.18, 0.42, 0.06]} scale={[1.45, 1, 1]} material={lacquer} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.1, 40]} />
          </mesh>
          <Flowers position={[0.18, 0.47, 0.06]} />
        </group>
      ))}

      {/* feather-pattern metal screen between living and dining */}
      <FeatherScreen position={[1.0, 0.45, -1.3]} height={2.95} width={1.5} />
    </group>
  )
}

function Flowers({ position }) {
  const petals = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f2ec', roughness: 0.9, flatShading: true }), [])
  const leaves = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8fb34a', roughness: 0.9, flatShading: true }), [])
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.2, 16]} />
        <meshStandardMaterial color="#7b4a2f" roughness={0.3} metalness={0.3} />
      </mesh>
      {[[0, 0.3, 0], [0.08, 0.26, 0.04], [-0.07, 0.27, -0.03], [0.02, 0.36, -0.06]].map((p, i) => (
        <mesh key={i} position={p} material={i === 1 ? leaves : petals}>
          <icosahedronGeometry args={[0.07, 0]} />
        </mesh>
      ))}
    </group>
  )
}

function FeatherScreen({ position, height, width }) {
  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141312', roughness: 0.4, metalness: 0.6 }), [])
  const bars = useMemo(() => {
    const out = []
    for (let y = 0.2; y < height - 0.2; y += 0.28) {
      out.push({ y, side: 1 })
      out.push({ y, side: -1 })
    }
    return out
  }, [height])
  const len = width / 2 / Math.cos(0.75)
  return (
    <group position={position} rotation-y={Math.PI / 2}>
      <mesh position={[0, height / 2, 0]} material={black}>
        <boxGeometry args={[0.03, height, 0.03]} />
      </mesh>
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]} material={black}>
          <boxGeometry args={[0.03, height, 0.03]} />
        </mesh>
      ))}
      {bars.map((b, i) => (
        <mesh key={i} position={[(b.side * width) / 4, b.y + (len * Math.sin(0.75)) / 2, 0]} rotation-z={b.side * 0.75} material={black}>
          <boxGeometry args={[len, 0.018, 0.018]} />
        </mesh>
      ))}
    </group>
  )
}

function Dining({ mats }) {
  const geo = useMemo(() => ({
    big: extrude(archRingShape(1.7, 2.7, 0.06), 0.05),
    mid: extrude(archRingShape(1.15, 2.0, 0.05), 0.05),
    small: extrude(archRingShape(0.8, 1.45, 0.04), 0.05),
    bigFill: extrude(archShape(1.58, 2.64), 0.01),
    midFill: extrude(archShape(1.05, 1.95), 0.01),
  }), [])
  const panel = useMemo(() => {
    const t = fluted('#e7e1d8', 64, 'dinwall').clone()
    t.needsUpdate = true
    t.repeat.set(4, 1)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })
  }, [])
  const flute = useMemo(() => {
    const t = fluted('#ede8e0', 24, 'archflute').clone()
    t.needsUpdate = true
    t.repeat.set(1, 1)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })
  }, [])
  const tableTop = useMemo(() => pbr('marble_01', { size: 1.1, roughness: 0.3, normal: 0.2 }), [])
  const chair = useMemo(() => pbr('velour_velvet', { size: 0.5, color: '#d7cbbb', diffuse: false }), [])
  const darkWood = useMemo(() => pbr('mocha_oak_veneer', { size: 1.2, roughness: 0.8 }), [])
  const mirror = useMemo(() => new THREE.MeshStandardMaterial({ map: mirrorGrid(), roughness: 0.15, metalness: 0.9 }), [])
  const smoke = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f2c2a', roughness: 0.15, metalness: 0.7, transparent: true, opacity: 0.88, side: THREE.DoubleSide }), [])
  const fluteWood = useMemo(() => {
    const t = fluted('#6e4a33', 40, 'barfront').clone()
    t.needsUpdate = true
    t.repeat.set(3, 1)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })
  }, [])

  return (
    <group>
      {/* layered fluted arches on the east wall; the panel faces -x */}
      <group position={[4.72, 0.45, -0.6]} rotation-y={-Math.PI / 2}>
        <mesh position={[0, 1.49, 0]} material={panel}>
          <planeGeometry args={[4.2, 2.98]} />
        </mesh>
        <mesh geometry={geo.bigFill} material={flute} position={[0, 0.03, 0.01]} />
        <mesh geometry={geo.big} material={mats.white} position={[0, 0, 0.02]} />
        {[-1.35, 1.35].map((x) => (
          <group key={x} position={[x, 0, 0.01]}>
            <mesh geometry={geo.midFill} material={flute} position={[0, 0.03, 0]} />
            <mesh geometry={geo.mid} material={mats.white} position={[0, 0, 0.01]} />
            <mesh geometry={geo.small} material={mats.white} position={[x > 0 ? -0.15 : 0.15, 0, 0.04]} />
          </group>
        ))}
      </group>

      {/* table and six chairs */}
      <group position={[2.85, 0.45, -0.45]}>
        <RoundedBox args={[2.1, 0.05, 0.95]} radius={0.015} position={[0, 0.76, 0]} material={tableTop} castShadow />
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.37, 0]} rotation-z={x > 0 ? 0.25 : -0.25} material={darkWood}>
            <boxGeometry args={[0.12, 0.76, 0.5]} />
          </mesh>
        ))}
        {[-0.7, 0, 0.7].flatMap((x) => [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x, 0, s * 0.72]} rotation-y={s > 0 ? Math.PI : 0}>
            <RoundedBox args={[0.48, 0.08, 0.46]} radius={0.03} position={[0, 0.48, 0]} material={chair} />
            <RoundedBox args={[0.5, 0.36, 0.07]} radius={0.03} position={[0, 0.74, -0.22]} material={chair} />
            {[[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]].map(([lx, lz], k) => (
              <mesh key={k} position={[lx, 0.22, lz]} rotation-x={lz > 0 ? 0.08 : -0.08} material={darkWood}>
                <cylinderGeometry args={[0.014, 0.01, 0.46, 6]} />
              </mesh>
            ))}
          </group>
        )))}
      </group>

      {/* mirrored ceiling cove and the chandelier */}
      <group position={[2.85, 3.41, -0.45]}>
        <mesh rotation-x={Math.PI / 2} material={mirror}>
          <planeGeometry args={[2.7, 1.7]} />
        </mesh>
        {[[0, 0.86, 2.74, 0.03], [0, -0.86, 2.74, 0.03]].map(([x, z, w, d], i) => (
          <mesh key={i} position={[x, -0.02, z]} material={mats.led}>
            <boxGeometry args={[w, 0.02, d]} />
          </mesh>
        ))}
        {[-1.36, 1.36].map((x) => (
          <mesh key={x} position={[x, -0.02, 0]} material={mats.led}>
            <boxGeometry args={[0.03, 0.02, 1.7]} />
          </mesh>
        ))}
        <mesh position={[0, -0.25, 0]} material={smoke}>
          <cylinderGeometry args={[0.006, 0.006, 0.5, 6]} />
        </mesh>
        {[0.34, 0.29, 0.24, 0.19].map((r, i) => (
          <mesh key={i} position={[0, -0.55 - i * 0.12, 0]} material={smoke}>
            <cylinderGeometry args={[r, r, 0.11, 32, 1, true]} />
          </mesh>
        ))}
        <pointLight position={[0, -0.8, 0]} intensity={2.5} distance={3} color="#ffd9a8" />
      </group>

      {/* breakfast counter between dining and kitchen */}
      <group position={[2.85, 0.45, -2.6]}>
        <mesh position={[0, 0.52, 0]} material={fluteWood}>
          <boxGeometry args={[2.6, 1.04, 0.45]} />
        </mesh>
        <mesh position={[0, 1.06, -0.05]} material={mats.white}>
          <boxGeometry args={[2.7, 0.05, 0.62]} />
        </mesh>
        {[-0.8, 0, 0.8].map((x) => (
          <group key={x} position={[x, 0, 0.5]}>
            <RoundedBox args={[0.4, 0.07, 0.38]} radius={0.03} position={[0, 0.72, 0]} material={chair} />
            <mesh position={[0, 0.36, 0]} material={darkWood}>
              <cylinderGeometry args={[0.02, 0.02, 0.72, 8]} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation-x={Math.PI / 2} material={darkWood}>
              <torusGeometry args={[0.16, 0.012, 6, 24]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function Kitchen({ mats }) {
  const cab = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e2d8cb', roughness: 0.6 }), [])
  const blackGlass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#191817', roughness: 0.08, metalness: 0.6 }), [])
  const top = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f6f4f0', roughness: 0.25 }), [])
  return (
    <group position={[0, 0.45, 0]}>
      {/* back run */}
      <mesh position={[2.9, 0.43, -7.42]} material={cab}>
        <boxGeometry args={[3.5, 0.86, 0.6]} />
      </mesh>
      <mesh position={[2.9, 0.885, -7.4]} material={top}>
        <boxGeometry args={[3.55, 0.05, 0.66]} />
      </mesh>
      {/* side run */}
      <mesh position={[4.42, 0.43, -5.6]} material={cab}>
        <boxGeometry args={[0.6, 0.86, 3.0]} />
      </mesh>
      <mesh position={[4.4, 0.885, -5.6]} material={top}>
        <boxGeometry args={[0.66, 0.05, 3.05]} />
      </mesh>
      {/* drawer lines */}
      {[0.28, 0.58].map((y) => (
        <mesh key={y} position={[2.9, y, -7.115]} material={mats.dark}>
          <boxGeometry args={[3.4, 0.008, 0.005]} />
        </mesh>
      ))}
      {/* hob, sink */}
      <mesh position={[2.6, 0.915, -7.4]} material={blackGlass}>
        <boxGeometry args={[0.6, 0.01, 0.45]} />
      </mesh>
      <mesh position={[4.38, 0.9, -6.4]} material={mats.dark}>
        <boxGeometry args={[0.42, 0.02, 0.55]} />
      </mesh>
      {/* uppers: greige centre, smoked glass ends */}
      <mesh position={[2.9, 2.0, -7.55]} material={cab}>
        <boxGeometry args={[1.2, 0.9, 0.35]} />
      </mesh>
      {[1.65, 4.15].map((x) => (
        <mesh key={x} position={[x, 2.0, -7.55]} material={blackGlass}>
          <boxGeometry args={[1.2, 0.9, 0.35]} />
        </mesh>
      ))}
      <mesh position={[2.9, 1.46, -7.62]} material={mats.led}>
        <boxGeometry args={[3.4, 0.015, 0.02]} />
      </mesh>
      {/* window with a roller blind on the side wall */}
      <mesh position={[4.735, 1.6, -4.6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.1, 1.0]} />
        <meshBasicMaterial color="#d9e6d2" toneMapped={false} />
      </mesh>
      <mesh position={[4.72, 1.95, -4.6]} rotation-y={-Math.PI / 2} material={mats.curtain}>
        <planeGeometry args={[1.12, 0.45]} />
      </mesh>
    </group>
  )
}

function Bedroom({ mats }) {
  const marblePanel = useMemo(() => pbr('marble_01', { size: 1.4, roughness: 0.35, normal: 0.2 }), [])
  const linen = useMemo(() => pbr('velour_velvet', { size: 0.5, color: '#d8c6ae', diffuse: false }), [])
  const duvet = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f2ec', roughness: 1 }), [])
  const throwM = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b59a7c', roughness: 1 }), [])
  const wardrobe = useMemo(() => {
    const t = fluted('#e6ddd0', 30, 'wardrobe').clone()
    t.needsUpdate = true
    t.repeat.set(3, 1)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })
  }, [])
  return (
    <group position={[0, 0.45, 0]}>
      {/* marble-panelled headboard wall with thin gold joints, facing +x */}
      <group position={[-4.72, 0, -5.85]} rotation-y={Math.PI / 2}>
        {[-1.05, 0, 1.05].map((x) => (
          <mesh key={x} position={[x, 1.35, 0.005]} material={marblePanel}>
            <planeGeometry args={[1.02, 2.5]} />
          </mesh>
        ))}
        {[-0.525, 0.525].map((x) => (
          <mesh key={x} position={[x, 1.35, 0.01]} material={mats.gold}>
            <boxGeometry args={[0.02, 2.5, 0.01]} />
          </mesh>
        ))}
        {/* windows either side with roman blinds */}
        {[-1.95, 1.95].map((x) => (
          <group key={x} position={[x, 1.45, 0]}>
            <mesh>
              <planeGeometry args={[0.7, 1.2]} />
              <meshBasicMaterial color="#cfe0c4" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.38, 0.02]} material={mats.curtain}>
              <planeGeometry args={[0.74, 0.5]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* bed */}
      <group position={[-3.55, 0, -5.85]}>
        <RoundedBox args={[2.1, 0.36, 1.85]} radius={0.08} position={[0, 0.18, 0]} material={linen} />
        <RoundedBox args={[1.95, 0.22, 1.75]} radius={0.08} position={[0.02, 0.47, 0]} material={duvet} />
        <RoundedBox args={[0.14, 1.05, 1.9]} radius={0.06} position={[-1.05, 0.75, 0]} material={linen} />
        <RoundedBox args={[0.5, 0.05, 1.8]} radius={0.02} position={[0.65, 0.6, 0]} rotation-z={-0.05} material={throwM} />
        {[-0.45, 0.45].map((z) => (
          <RoundedBox key={z} args={[0.28, 0.32, 0.6]} radius={0.1} position={[-0.8, 0.72, z]} rotation-z={0.3} material={duvet} />
        ))}
      </group>
      {[-4.55, -7.15].map((z) => (
        <mesh key={z} position={[-4.45, 0.25, z]} material={mats.white}>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
        </mesh>
      ))}
      <RoundedBox args={[2.4, 0.02, 2.6]} radius={0.01} position={[-3.3, 0.012, -5.85]}>
        <meshStandardMaterial color="#b9b6b2" roughness={1} />
      </RoundedBox>
      {/* fluted wardrobe on the partition, facing -x */}
      <mesh position={[0.86, 1.4, -5.8]} rotation-y={-Math.PI / 2} material={wardrobe}>
        <planeGeometry args={[3.6, 2.8]} />
      </mesh>
    </group>
  )
}

function Fans() {
  const refs = useRef([])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e6e0', roughness: 0.6 }), [])
  const spots = [[-2.6, -0.4], [-2.6, -2.3], [2.85, -5.6], [-2.4, -5.8]]
  useFrame((_, dt) => refs.current.forEach((r) => r && (r.rotation.y += dt * 1.6)))
  return spots.map(([x, z], i) => (
    <group key={i} position={[x, 3.15, z]} ref={(el) => (refs.current[i] = el)} userData={{ noMerge: true }}>
      <mesh position={[0, 0.12, 0]} material={mat}>
        <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
      </mesh>
      <mesh material={mat}>
        <cylinderGeometry args={[0.09, 0.09, 0.07, 16]} />
      </mesh>
      {[0, 2.094, 4.189].map((a) => (
        <mesh key={a} rotation-y={a} position={[Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42]} material={mat}>
          <boxGeometry args={[0.7, 0.012, 0.12]} />
        </mesh>
      ))}
    </group>
  ))
}

function CeilingCoves({ mats }) {
  // Recessed cove light lines and downlights, as in her ceilings.
  const lines = [
    [-2.1, -0.1, 5.0, 0.03], [-2.1, -3.6, 5.0, 0.03],
    [-4.55, -1.85, 0.03, 3.5], [0.35, -1.85, 0.03, 3.5],
    [2.9, -5.9, 3.2, 0.03], [-2.0, -4.15, 4.8, 0.03], [-2.0, -7.55, 4.8, 0.03],
  ]
  const downs = [[-3.4, -0.6], [-1.2, -0.6], [-3.4, -3.0], [-1.2, -3.0], [3.9, 1.1], [1.8, 1.1], [3.9, -1.9], [1.8, -1.9], [-3.0, -6.6], [-1.0, -6.6]]
  return (
    <group position={[0, 3.41, 0]}>
      {lines.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0, z]} material={mats.led}>
          <boxGeometry args={[w, 0.015, d]} />
        </mesh>
      ))}
      {downs.map(([x, z], i) => (
        <mesh key={i} position={[x, -0.005, z]} rotation-x={Math.PI / 2} material={mats.led}>
          <circleGeometry args={[0.045, 16]} />
        </mesh>
      ))}
    </group>
  )
}

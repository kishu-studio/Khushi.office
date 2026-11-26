import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, Environment, useGLTF } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import CameraRig from '../lib/CameraRig.jsx'
import StaticMerge from '../lib/StaticMerge.jsx'
import { scroll } from '../lib/store.js'
import { wood, chevron, stucco } from '../lib/textures.js'
import { pbr } from '../lib/pbr.js'
import { PROJECTS } from '../content.js'

const MODELS = ['potted_plant_04', 'ceramic_vase_02', 'desk_lamp_arm_01', 'stationery_supplies']
MODELS.forEach((m) => useGLTF.preload(`models/${m}.glb`))

// Camera: from the doorway, past the gallery wall, down to the laptop, then into its screen.
export const STUDIO_KEYS = [
  { t: 0.0, pos: [2.05, 1.6, 2.85], look: [0, 1.25, -0.8] },
  { t: 0.35, pos: [0.95, 1.32, 1.25], look: [0, 1.0, -0.72] },
  { t: 0.72, pos: [0.12, 1.03, 0.05], look: [0, 0.9, -0.74] },
  { t: 1.0, pos: [0, 0.9515, -0.5614], look: [0, 0.8988, -0.7595] },
]

// Laptop on the desk: base centre, lid opened 15 degrees past upright, 16:10 display.
const LAPTOP = { pos: [0, 0.7725, -0.62], tilt: -0.26 }
const SCREEN = { w: 0.29, h: 0.181, y: 0.1145 } // display centre, in the lid's frame
const CANVAS_W = 1280
const CANVAS_H = 800

export default function Studio({ onPick, interactive }) {
  return (
    <>
      <CameraRig keys={STUDIO_KEYS} fov={50} damping={0.3} parallax={0.05} dolly={[0.55, 0.95]} />
      <Suspense fallback={null}>
        <Environment files="hdri/photo_studio_loft_hall_1k.hdr" environmentIntensity={0.35} />
      </Suspense>
      <StudioLights />
      <StaticMerge onStats={(s) => (window.__merge = s)}>
        <Room />
        <Desk />
        <BentoWall />
        <Props />
        <Models />
        <Chair />
      </StaticMerge>
      <Laptop onPick={onPick} interactive={interactive} />
      <StaticShadows />
    </>
  )
}

function StaticShadows() {
  // Lighting is static, so shadows are rendered once instead of every frame.
  const { gl } = useThree()
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    const t = setTimeout(() => (gl.shadowMap.needsUpdate = true), 600)
    return () => clearTimeout(t)
  }, [gl])
  return null
}

function StudioLights() {
  return (
    <>
      <hemisphereLight args={['#fff4e6', '#6b5546', 0.65]} />
      <directionalLight
        position={[-4, 4.2, 1.5]}
        intensity={2.4}
        color="#ffe9cc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <pointLight position={[-0.62, 1.42, -0.42]} intensity={1.4} distance={2.2} color="#ffcf8a" />
    </>
  )
}

function Room() {
  const floorMat = useMemo(() => pbr('wood_floor', { size: 2.2, roughness: 0.9 }), [])
  const back = useMemo(() => chevron('#e2d8ca'), [])
  const wall = useMemo(() => stucco('#e8ded1', 13, 'studiowall'), [])
  back.repeat.set(6, 3)
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[6, 5]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      {/* back wall */}
      <mesh position={[0.2, 1.5, -1.2]} receiveShadow>
        <planeGeometry args={[5.6, 3]} />
        <meshStandardMaterial map={back} roughness={0.95} />
      </mesh>
      {/* left wall with a window */}
      <group position={[-2.2, 0, 0.6]} rotation-y={Math.PI / 2}>
        <mesh position={[-1.35, 1.5, 0]} receiveShadow>
          <planeGeometry args={[1.0, 3]} />
          <meshStandardMaterial map={wall} />
        </mesh>
        <mesh position={[1.75, 1.5, 0]} receiveShadow>
          <planeGeometry args={[2.0, 3]} />
          <meshStandardMaterial map={wall} />
        </mesh>
        <mesh position={[0.2, 0.42, 0]}>
          <planeGeometry args={[1.1, 0.84]} />
          <meshStandardMaterial map={wall} />
        </mesh>
        <mesh position={[0.2, 2.75, 0]}>
          <planeGeometry args={[1.1, 0.5]} />
          <meshStandardMaterial map={wall} />
        </mesh>
        {/* window view: soft garden light */}
        <mesh position={[0.2, 1.67, -0.05]}>
          <planeGeometry args={[1.1, 1.66]} />
          <meshBasicMaterial color="#cfe0c2" toneMapped={false} />
        </mesh>
        {/* sheer curtain */}
        <mesh position={[-0.12, 1.65, 0.06]}>
          <planeGeometry args={[0.5, 2.2]} />
          <meshStandardMaterial color="#f5efe6" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* right wall */}
      <mesh position={[2.6, 1.5, 0.6]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.6, 3]} />
        <meshStandardMaterial map={wall} />
      </mesh>
      {/* ceiling */}
      <mesh position={[0.2, 3, 0.6]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[5.6, 4]} />
        <meshStandardMaterial color="#efe7dc" roughness={1} />
      </mesh>
      {/* rug under the desk */}
      <mesh position={[0, 0.006, 0.1]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[1.25, 48]} />
        <meshStandardMaterial color="#c9b9a3" roughness={1} />
      </mesh>
      {/* shelf on the right wall */}
      <group position={[2.45, 1.55, -0.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.03, 1.1]} />
          <meshStandardMaterial color="#6b4a32" />
        </mesh>
        {['#8c6e54', '#3f4a3c', '#c9a46e', '#5c3b2e', '#d8cfc2', '#7a7f86', '#a2552f'].map((c, i) => (
          <mesh key={i} position={[0.02, 0.12, -0.45 + i * 0.075]} castShadow>
            <boxGeometry args={[0.18, 0.22 - (i % 3) * 0.02, 0.05]} />
            <meshStandardMaterial color={c} roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Desk() {
  const topMat = useMemo(() => pbr('oak_veneer_01', { size: 1.4, roughness: 0.8 }), [])
  return (
    <group position={[0, 0, -0.55]}>
      <RoundedBox args={[1.75, 0.045, 0.82]} radius={0.015} position={[0, 0.75, 0]} castShadow receiveShadow>
        <primitive object={topMat} attach="material" />
      </RoundedBox>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.37, 0]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.72]} />
          <meshStandardMaterial color="#2a2522" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Laptop({ onPick, interactive }) {
  const [hover, setHover] = useState(-1)
  const { texture, cards } = usePickerTexture(hover, interactive)
  const glow = useRef()
  const m = useLaptopMaterials()
  const keys = useKeys(m.key)

  const hit = (e) => {
    if (!e.uv) return -1
    const x = e.uv.x * CANVAS_W
    const y = (1 - e.uv.y) * CANVAS_H
    return cards.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h)
  }

  // The screen's light on the desk rises as the camera arrives.
  useFrame(() => {
    if (glow.current) glow.current.intensity = 0.25 + scroll.progress * 0.7
  })

  return (
    <group position={LAPTOP.pos}>
      {/* aluminium base */}
      <RoundedBox args={[0.312, 0.0155, 0.221]} radius={0.0055} smoothness={4} position={[0, 0.00775, 0]} castShadow receiveShadow material={m.alu} />
      {/* keyboard well and keys */}
      <mesh position={[0, 0.0156, -0.033]} rotation-x={-Math.PI / 2} material={m.well}>
        <planeGeometry args={[0.276, 0.112]} />
      </mesh>
      <primitive object={keys} />
      {/* trackpad */}
      <RoundedBox args={[0.132, 0.0004, 0.082]} radius={0.0002} position={[0, 0.0157, 0.0615]} material={m.pad} />
      {/* hinge */}
      <mesh position={[0, 0.012, -0.108]} rotation-z={Math.PI / 2} material={m.hinge}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.24, 16]} />
      </mesh>
      {/* lid, pivoting at the hinge */}
      <group position={[0, 0.0155, -0.1105]} rotation-x={LAPTOP.tilt}>
        <RoundedBox args={[0.312, 0.221, 0.0055]} radius={0.0027} smoothness={4} position={[0, 0.1105, -0.00285]} castShadow material={m.alu} />
        {/* glass with a thin black bezel */}
        <mesh position={[0, 0.1105, 0.0002]} material={m.glass}>
          <planeGeometry args={[0.304, 0.213]} />
        </mesh>
        <mesh
          position={[0, SCREEN.y, 0.0004]}
          onPointerMove={(e) => {
            if (!interactive) return
            e.stopPropagation()
            const i = hit(e)
            if (i !== hover) setHover(i)
            document.body.style.cursor = i >= 0 ? 'pointer' : ''
          }}
          onPointerOut={() => {
            setHover(-1)
            document.body.style.cursor = ''
          }}
          onClick={(e) => {
            if (!interactive) return
            e.stopPropagation()
            const i = hit(e)
            if (i >= 0) onPick(cards[i].id, cards[i].live)
          }}
        >
          <planeGeometry args={[SCREEN.w, SCREEN.h]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        {/* camera notch */}
        <RoundedBox args={[0.032, 0.0065, 0.0004]} radius={0.0001} position={[0, SCREEN.y + SCREEN.h / 2 - 0.0028, 0.0006]} material={m.glass} />
        <pointLight ref={glow} position={[0, SCREEN.y, 0.18]} distance={0.9} color="#ffe8cc" intensity={0.4} />
      </group>
    </group>
  )
}

function useLaptopMaterials() {
  return useMemo(
    () => ({
      alu: new THREE.MeshStandardMaterial({ color: '#d4d5d7', metalness: 1, roughness: 0.34 }),
      well: new THREE.MeshStandardMaterial({ color: '#2a2b2d', metalness: 0.6, roughness: 0.5 }),
      key: new THREE.MeshStandardMaterial({ color: '#161617', roughness: 0.62 }),
      pad: new THREE.MeshStandardMaterial({ color: '#c9cacc', metalness: 0.4, roughness: 0.22 }),
      hinge: new THREE.MeshStandardMaterial({ color: '#2d2e30', metalness: 0.8, roughness: 0.4 }),
      glass: new THREE.MeshStandardMaterial({ color: '#070708', metalness: 0.2, roughness: 0.06 }),
    }),
    [],
  )
}

// A full keyboard as one instanced mesh: one draw call for ~78 keys.
function useKeys(material) {
  return useMemo(() => {
    const u = 0.0185
    const gap = 0.003
    const rows = [
      { d: 0.0095, keys: Array(14).fill(1.036) },
      { d: 0.0155, keys: [...Array(13).fill(1), 1.5] },
      { d: 0.0155, keys: [1.5, ...Array(13).fill(1)] },
      { d: 0.0155, keys: [1.75, ...Array(11).fill(1), 1.75] },
      { d: 0.0155, keys: [2.25, ...Array(10).fill(1), 2.25] },
      { d: 0.0155, keys: [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1] },
    ]
    const list = []
    let z = -0.033 - 0.112 / 2 + 0.006
    rows.forEach((r) => {
      let x = -(r.keys.reduce((a, b) => a + b, 0) * u) / 2
      r.keys.forEach((w) => {
        list.push({ x: x + (w * u) / 2, z: z + r.d / 2, w: w * u - gap, d: r.d })
        x += w * u
      })
      z += r.d + gap
    })
    const geo = new RoundedBoxGeometry(1, 1, 1, 2, 0.15)
    const mesh = new THREE.InstancedMesh(geo, material, list.length)
    const m4 = new THREE.Matrix4()
    list.forEach((k, i) => {
      m4.compose(new THREE.Vector3(k.x, 0.0162, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w, 0.0011, k.d))
      mesh.setMatrixAt(i, m4)
    })
    mesh.castShadow = false
    return mesh
  }, [material])
}

// The picker screen is a 2D canvas redrawn on hover. Cards are laid out once.
function usePickerTexture(hover, interactive) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = CANVAS_W
    c.height = CANVAS_H
    return c
  }, [])
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [canvas])
  const cards = useMemo(() => {
    const list = PROJECTS.map((p, i) => ({ id: p.id, live: p.live, x: 72 + i * 290, y: 226, w: 268, h: 470, p }))
    return list
  }, [])
  const [thumbs, setThumbs] = useState({})

  useEffect(() => {
    PROJECTS.forEach((p) => {
      if (!p.thumb) return
      const img = new Image()
      img.onload = () => setThumbs((t) => ({ ...t, [p.id]: img }))
      img.src = p.thumb
    })
  }, [])

  useEffect(() => {
    const g = canvas.getContext('2d')
    // wallpaper
    const bg = g.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
    bg.addColorStop(0, '#2a221d')
    bg.addColorStop(1, '#4a3b30')
    g.fillStyle = bg
    g.fillRect(0, 0, CANVAS_W, CANVAS_H)
    // top bar
    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fillRect(0, 0, CANVAS_W, 44)
    g.fillStyle = '#f3ece2'
    g.font = '500 20px Jost, sans-serif'
    g.fillText('KHUSHI  ·  STUDIO', 28, 29)
    g.textAlign = 'right'
    g.fillStyle = 'rgba(243,236,226,0.7)'
    g.fillText('Projects', CANVAS_W - 28, 29)
    g.textAlign = 'left'
    // heading
    g.fillStyle = '#f3ece2'
    g.font = '300 54px Jost, sans-serif'
    g.fillText('Select a site', 96, 140)
    g.fillStyle = 'rgba(243,236,226,0.6)'
    g.font = '300 22px Jost, sans-serif'
    g.fillText(interactive ? 'Click a project to walk in.' : 'Scroll to come closer.', 96, 182)

    cards.forEach((c, i) => {
      const hot = hover === i && c.live
      g.save()
      g.translate(c.x, c.y - (hot ? 8 : 0))
      g.fillStyle = hot ? '#f6efe5' : c.live ? '#ece4d8' : 'rgba(236,228,216,0.86)'
      roundRect(g, 0, 0, c.w, c.h, 18)
      g.fill()
      const img = thumbs[c.id]
      if (img) {
        g.save()
        roundRect(g, 12, 12, c.w - 24, 250, 12)
        g.clip()
        const s = Math.max((c.w - 24) / img.width, 250 / img.height)
        g.drawImage(img, 12 + (c.w - 24 - img.width * s) / 2, 12 + (250 - img.height * s) / 2, img.width * s, img.height * s)
        g.restore()
      } else if (!c.live) {
        g.strokeStyle = 'rgba(236,228,216,0.35)'
        g.setLineDash([8, 8])
        roundRect(g, 14, 14, c.w - 28, 230, 12)
        g.stroke()
        g.setLineDash([])
      }
      g.fillStyle = '#2a221d'
      g.font = '500 27px Jost, sans-serif'
      g.fillText(c.p.title, 22, 304)
      g.font = '300 19px Jost, sans-serif'
      g.fillStyle = 'rgba(42,34,29,0.7)'
      wrap(g, c.p.subtitle, 22, 338, c.w - 44, 25)
      g.font = '500 15px Jost, sans-serif'
      g.fillStyle = '#9a6a3f'
      g.fillText(c.live ? (hot ? 'WALK IN  →' : '3D WALK-THROUGH') : hot ? 'VIEW  →' : 'GALLERY', 22, c.h - 24)
      g.restore()
    })
    texture.needsUpdate = true
  }, [hover, thumbs, interactive, canvas, cards, texture])

  return { canvas, texture, cards }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' ')
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (g.measureText(t).width > maxW && line) {
      g.fillText(line, x, y)
      line = w
      y += lh
    } else line = t
  }
  if (line) g.fillText(line, x, y)
}

// Her work as a bento grid on the back wall. All tiles are drawn into one canvas, so the whole
// gallery is a single textured panel (one draw call) on a light board.
const BENTO = { x0: -1.55, y0: 2.72, w: 3.1, h: 1.45, cols: 6, rows: 3, gap: 0.04 }
const TILES = [
  [0, 0, 2, 2, 'exterior-2'], [2, 0, 1, 1, 'apt-1'], [3, 0, 2, 1, 'tower-2'], [5, 0, 1, 2, 'clinic-5'],
  [2, 1, 2, 1, 'living-4'], [4, 1, 1, 1, 'clinic-4'],
  [0, 2, 1, 1, 'apt-8'], [1, 2, 2, 1, 'dining-1'], [3, 2, 1, 1, 'apt-12'], [4, 2, 2, 1, 'clinic-2'],
]

function BentoWall() {
  const PX = 1000 // pixels per metre
  const { texture, board, frame } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = BENTO.w * PX
    c.height = BENTO.h * PX
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return {
      texture: t,
      board: new THREE.MeshStandardMaterial({ color: '#efe8de', roughness: 0.9 }),
      frame: new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.55 }),
    }
  }, [])

  useEffect(() => {
    const c = texture.image
    const g = c.getContext('2d')
    const cw = (BENTO.w - BENTO.gap * (BENTO.cols - 1)) / BENTO.cols
    const ch = (BENTO.h - BENTO.gap * (BENTO.rows - 1)) / BENTO.rows
    const rect = ([col, row, cs, rs]) => [
      (col * (cw + BENTO.gap)) * PX,
      (row * (ch + BENTO.gap)) * PX,
      (cs * cw + (cs - 1) * BENTO.gap) * PX,
      (rs * ch + (rs - 1) * BENTO.gap) * PX,
    ]
    g.fillStyle = '#efe8de'
    g.fillRect(0, 0, c.width, c.height)
    let alive = true
    TILES.forEach((tile) => {
      const [x, y, w, h] = rect(tile)
      g.fillStyle = '#d9d0c3'
      roundRect(g, x, y, w, h, 14)
      g.fill()
      const img = new Image()
      img.onload = () => {
        if (!alive) return
        g.save()
        g.shadowColor = 'rgba(40,30,20,0.28)'
        g.shadowBlur = 18
        g.shadowOffsetY = 6
        roundRect(g, x, y, w, h, 14)
        g.fillStyle = '#efe8de'
        g.fill()
        g.restore()
        g.save()
        roundRect(g, x, y, w, h, 14)
        g.clip()
        const s = Math.max(w / img.width, h / img.height)
        g.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s)
        g.restore()
        texture.needsUpdate = true
      }
      img.src = `renders/${tile[4]}.webp`
    })
    texture.needsUpdate = true
    return () => {
      alive = false
    }
  }, [texture])

  const cx = BENTO.x0 + BENTO.w / 2
  const cy = BENTO.y0 - BENTO.h / 2
  return (
    <group position={[cx, cy, -1.2]}>
      {/* oak-edged board, then the gallery print */}
      <RoundedBox args={[BENTO.w + 0.14, BENTO.h + 0.14, 0.03]} radius={0.01} position={[0, 0, 0.015]} castShadow receiveShadow material={frame} />
      <mesh position={[0, 0, 0.0305]} material={board}>
        <planeGeometry args={[BENTO.w + 0.1, BENTO.h + 0.1]} />
      </mesh>
      <mesh position={[0, 0, 0.031]} receiveShadow>
        <planeGeometry args={[BENTO.w, BENTO.h]} />
        <meshStandardMaterial map={texture} roughness={0.7} userData={{ unique: true }} />
      </mesh>
      {/* brass picture light */}
      <mesh position={[0, BENTO.h / 2 + 0.11, 0.09]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 1.6, 24]} />
        <meshStandardMaterial color="#b89155" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, BENTO.h / 2 + 0.096, 0.095]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[1.56, 0.012]} />
        <meshBasicMaterial color="#ffe2b0" toneMapped={false} />
      </mesh>
    </group>
  )
}

function Props() {
  const swatches = ['#e9e3da', '#b99a76', '#4a3324', '#c8893b', '#d4c21a', '#8d8a85', '#f2efea']
  return (
    <group position={[0, 0.775, -0.55]}>
      {/* sketchbook and pencil */}
      <mesh position={[-0.5, 0.006, 0.12]} rotation-y={0.25} castShadow>
        <boxGeometry args={[0.3, 0.012, 0.21]} />
        <meshStandardMaterial color="#f4efe6" roughness={0.9} />
      </mesh>
      <mesh position={[-0.45, 0.016, 0.1]} rotation={[0, 0.9, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.17, 8]} />
        <meshStandardMaterial color="#2f2a26" />
      </mesh>
      {/* material swatch fan */}
      <group position={[0.55, 0.004, 0.08]}>
        {swatches.map((c, i) => (
          <mesh key={i} rotation-y={-0.5 + i * 0.16} position={[0, i * 0.003, 0]} castShadow>
            <boxGeometry args={[0.05, 0.003, 0.2]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* mug */}
      <mesh position={[0.5, 0.045, -0.22]} castShadow>
        <cylinderGeometry args={[0.035, 0.032, 0.09, 24]} />
        <meshStandardMaterial color="#d9cbb8" roughness={0.4} />
      </mesh>
      {/* the villa, as a little massing model */}
      <group position={[-0.36, 0, -0.26]} rotation-y={0.35} scale={0.02}>
        <mesh position={[0, 1.8, 0]} castShadow>
          <boxGeometry args={[10, 3.6, 10]} />
          <meshStandardMaterial color="#d8c3a5" roughness={0.9} />
        </mesh>
        <mesh position={[0, 5.3, -0.5]} castShadow>
          <boxGeometry args={[9.4, 3.3, 9]} />
          <meshStandardMaterial color="#cfb796" roughness={0.9} />
        </mesh>
        <mesh position={[0, 8.6, -1]} castShadow>
          <boxGeometry args={[9, 3.3, 8]} />
          <meshStandardMaterial color="#d8c3a5" roughness={0.9} />
        </mesh>
        <mesh position={[0, 10.5, -0.6]} castShadow>
          <boxGeometry args={[11, 0.5, 11]} />
          <meshStandardMaterial color="#efe6d8" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

// Scanned CC0 models from Poly Haven, at their real-world size, sitting on whatever is below them.
function Models() {
  return (
    <group>
      <Model name="desk_lamp_arm_01" position={[-0.66, 0.7725, -0.82]} rotation={[0, Math.PI / 2 + 0.35, 0]} tint={{ desk_lamp_arm_01: '#1f1d1b' }} />
      <Model name="potted_plant_04" position={[0.7, 0.7725, -0.8]} />
      <Tablet position={[0.36, 0.7725, -0.8]} rotation-y={-0.32} art="renders/apt-2.webp" />
      <Model name="stationery_supplies" position={[-0.27, 0.7725, -0.35]} rotation={[0, 0.3, 0]} />
      <Model name="ceramic_vase_02" position={[1.2, 0, -0.95]} scale={1.7} />
    </group>
  )
}

function Model({ name, position, rotation = [0, 0, 0], scale = 1, art, tint }) {
  const { scene } = useGLTF(`models/${name}.glb`)
  const obj = useMemo(() => {
    const o = scene.clone(true)
    const box = new THREE.Box3().setFromObject(o)
    o.position.y = -box.min.y // stand on the surface
    o.traverse((m) => {
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      // recolour a part to fit the studio palette (keeps its scanned surface)
      if (tint && tint[m.material.name]) {
        m.material = m.material.clone()
        m.material.map = null
        m.material.color.set(tint[m.material.name])
      }
      if (art && m.material.name.endsWith('_artwork')) {
        const t = new THREE.TextureLoader().load(art)
        t.colorSpace = THREE.SRGBColorSpace
        t.flipY = false
        m.material = m.material.clone()
        m.material.map = t
      }
    })
    return o
  }, [scene, art, tint])
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={obj} />
    </group>
  )
}

// An 11-inch tablet (iPad proportions, no branding) leaning on a small stand, showing a render.
function Tablet({ art, ...props }) {
  const W = 0.247, H = 0.178, D = 0.0059
  const { alu, glass, screen, stand } = useMemo(() => {
    const t = new THREE.TextureLoader().load(art)
    t.colorSpace = THREE.SRGBColorSpace
    return {
      alu: new THREE.MeshStandardMaterial({ color: '#8e9094', metalness: 1, roughness: 0.38 }),
      glass: new THREE.MeshStandardMaterial({ color: '#070708', metalness: 0.2, roughness: 0.05 }),
      screen: new THREE.MeshBasicMaterial({ map: t, toneMapped: false }),
      stand: new THREE.MeshStandardMaterial({ color: '#2b2622', metalness: 0.6, roughness: 0.45 }),
    }
  }, [art])
  const lean = -0.32 // radians back from upright
  return (
    <group {...props}>
      {/* stand: base plate and a lip the tablet rests against */}
      <RoundedBox args={[0.12, 0.006, 0.09]} radius={0.003} position={[0, 0.003, -0.02]} castShadow material={stand} />
      <mesh position={[0, 0.012, 0.012]} material={stand} castShadow>
        <boxGeometry args={[0.12, 0.012, 0.008]} />
      </mesh>
      <mesh position={[0, 0.045, -0.04]} rotation-x={lean} material={stand} castShadow>
        <boxGeometry args={[0.03, 0.09, 0.006]} />
      </mesh>
      <group position={[0, 0.008, 0.008]} rotation-x={lean}>
        <RoundedBox args={[W, H, D]} radius={0.0028} smoothness={4} position={[0, H / 2, -D / 2]} castShadow material={alu} />
        <mesh position={[0, H / 2, 0.0002]} material={glass}>
          <planeGeometry args={[W - 0.003, H - 0.003]} />
        </mesh>
        <mesh position={[0, H / 2, 0.0004]} material={screen}>
          <planeGeometry args={[W - 0.019, H - 0.019]} />
        </mesh>
      </group>
    </group>
  )
}

function Chair() {
  return (
    <group position={[0.15, 0, 0.35]} rotation-y={0.25}>
      <RoundedBox args={[0.5, 0.08, 0.48]} radius={0.03} position={[0, 0.47, 0]} castShadow>
        <meshStandardMaterial color="#d9cbb8" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.42, 0.07]} radius={0.03} position={[0, 0.74, 0.22]} rotation-x={-0.12} castShadow>
        <meshStandardMaterial color="#d9cbb8" roughness={0.9} />
      </RoundedBox>
      {[[-0.21, -0.19], [0.21, -0.19], [-0.21, 0.19], [0.21, 0.19]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.015, 0.012, 0.44, 8]} />
          <meshStandardMaterial color="#4a3324" />
        </mesh>
      ))}
    </group>
  )
}

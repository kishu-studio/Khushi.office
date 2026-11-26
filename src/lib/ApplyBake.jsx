import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Swaps the merged static meshes for their baked copies (same names m0, m1, ...) and gives each
// material the baked light. Real-time lights are then switched off: the light is in the textures.
// Runs only when public/baked/manifest.json lists this scene; ?nobake turns it off.
const ENC = 0.5 // must match bake.py
const params = new URLSearchParams(location.search)

export default function ApplyBake({ name, exposure = 1 }) {
  const { scene } = useThree()
  useEffect(() => {
    if (params.has('nobake')) return
    let cancelled = false
    ;(async () => {
      const manifest = await fetch('baked/manifest.json').then((r) => r.json()).catch(() => null)
      const entry = manifest && manifest[name]
      if (!entry || cancelled) return
      const gltf = await new GLTFLoader().loadAsync(`baked/${name}.glb`)
      const maps = {}
      await Promise.all(
        entry.groups.map(async (g) => {
          const t = await new THREE.TextureLoader().loadAsync(`baked/${name}_${g}.${entry.ext || 'png'}`)
          t.flipY = false
          t.channel = 1
          t.colorSpace = THREE.SRGBColorSpace
          maps[g] = t
        }),
      )
      if (cancelled) return
      const baked = {}
      gltf.scene.traverse((o) => o.isMesh && (baked[o.name] = o))
      // the scene may still be loading: wait for StaticMerge to finish (up to 15 s)
      const merged = []
      for (let k = 0; k < 60 && !merged.length && !cancelled; k++) {
        scene.traverse((o) => o.userData.merged && merged.push(...o.userData.merged))
        if (!merged.length) await new Promise((r) => setTimeout(r, 250))
      }
      let n = 0
      merged.forEach((m, i) => {
        const b = baked[`m${i}`]
        const map = b && maps[b.userData.group || 'main']
        if (!map || m.material.transparent) return
        m.geometry.dispose()
        m.geometry = b.geometry
        const mat = m.material.clone()
        mat.lightMap = map
        mat.lightMapIntensity = (Math.PI / ENC) * exposure
        if ('envMapIntensity' in mat) mat.envMapIntensity = 0.25
        m.material = mat
        n++
      })
      scene.traverse((o) => o.isLight && (o.visible = false))
      window.__baked = { name, meshes: n }
    })().catch((e) => (window.__baked = { error: String(e) }))
    return () => {
      cancelled = true
    }
  }, [scene, name, exposure])
  return null
}

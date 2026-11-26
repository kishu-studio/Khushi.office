import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

// ?export (dev only): writes the merged static geometry and the lights to bake/in/ for Blender.
// Each merged mesh is named m<i>; the app later swaps in the baked copy by the same name.
export default function BakeExport({ name }) {
  const { scene } = useThree()
  useEffect(() => {
    const t = setTimeout(() => run().catch((e) => (window.__bakeExport = { error: String(e.stack || e) })), 3000)
    async function run() {
      const merged = []
      scene.traverse((o) => o.userData.merged && merged.push(...o.userData.merged))
      const out = new THREE.Scene()
      merged.forEach((m, i) => {
        const g = new THREE.BufferGeometry()
        ;['position', 'normal', 'uv'].forEach((k) => g.setAttribute(k, m.geometry.attributes[k].clone()))
        const src = m.material
        const unlit = src.type === 'MeshBasicMaterial'
        const mat = new THREE.MeshStandardMaterial({ name: `mat${i}`, color: albedo(src), roughness: src.roughness ?? 1 })
        const mesh = new THREE.Mesh(g, mat)
        mesh.name = `m${i}`
        g.computeBoundingSphere()
        mesh.userData = {
          group: g.boundingSphere.radius > 15 ? 'site' : 'main',
          emission: unlit ? 6 : 0,
          transparent: src.transparent && src.opacity < 0.6 ? 1 : 0,
        }
        out.add(mesh)
      })
      const lights = []
      scene.traverse((o) => {
        if (!o.isLight) return
        const p = new THREE.Vector3()
        o.getWorldPosition(p)
        lights.push({ type: o.type, position: p.toArray(), color: o.color.getHexString(), intensity: o.intensity, distance: o.distance ?? 0 })
      })
      const glb = await new GLTFExporter().parseAsync(out, { binary: true })
      await fetch(`/__bake/save?name=${name}.glb`, { method: 'POST', body: glb })
      await fetch(`/__bake/save?name=${name}.lights.json`, { method: 'POST', body: JSON.stringify(lights, null, 1) })
      window.__bakeExport = { name, meshes: merged.length, lights: lights.length }
    }
    return () => clearTimeout(t)
  }, [scene, name])
  return null
}

// Material colour as Blender should see it for bounce light: colour × average texture colour.
function albedo(m) {
  const c = new THREE.Color(m.color ?? '#ffffff')
  const img = m.map && m.map.image
  if (img && (img.width || img.naturalWidth)) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d')
    ctx.drawImage(img, 0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    c.multiply(new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace))
  }
  return c
}

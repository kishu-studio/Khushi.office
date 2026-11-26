import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Merges every static mesh inside it into one mesh per look-alike material, so the GPU gets a
// handful of draw calls instead of hundreds. Anything under an object with userData.noMerge
// (gates, the door, fans) is left alone so it can still move.
export default function StaticMerge({ children, onStats }) {
  const ref = useRef()

  useLayoutEffect(() => {
    const root = ref.current
    root.updateMatrixWorld(true)
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const buckets = new Map()
    let before = 0

    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.visible || skip(o, root)) return
      if (Array.isArray(o.material)) return
      before++
      const key = signature(o.material) + (o.castShadow ? 'C' : '') + (o.receiveShadow ? 'R' : '')
      if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [], meshes: [] })
      const b = buckets.get(key)
      const g = normalise(o.geometry).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))
      if (o.material.userData.worldUV) boxUV(g)
      b.geos.push(g)
      b.meshes.push(o)
    })

    const merged = []
    for (const b of buckets.values()) {
      if (b.geos.length < 2 && !b.material.userData.worldUV) {
        b.geos.forEach((g) => g.dispose())
        continue
      }
      const geo = mergeGeometries(b.geos, false)
      b.geos.forEach((g) => g.dispose())
      if (!geo) continue
      geo.computeBoundingSphere()
      const m = new THREE.Mesh(geo, b.material)
      m.castShadow = b.cast
      m.receiveShadow = b.receive
      m.matrixAutoUpdate = false
      root.add(m)
      merged.push(m)
      b.meshes.forEach((o) => (o.visible = false))
    }
    root.userData.merged = merged // read by the bake export
    onStats && onStats({ before, buckets: buckets.size, merged: merged.length })

    return () => {
      merged.forEach((m) => {
        root.remove(m)
        m.geometry.dispose()
      })
      for (const b of buckets.values()) b.meshes.forEach((o) => (o.visible = true))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <group ref={ref}>{children}</group>
}

function skip(o, root) {
  for (let p = o; p && p !== root; p = p.parent) if (p.userData && p.userData.noMerge) return true
  return false
}

// Materials that look identical share a bucket even if they are separate instances.
function signature(m) {
  return [
    m.type,
    m.color ? m.color.getHexString() : '',
    m.map ? m.map.uuid : '',
    m.roughness, m.metalness, m.transparent ? 1 : 0, m.opacity, m.side,
    m.emissive ? m.emissive.getHexString() : '', m.toneMapped ? 1 : 0, m.flatShading ? 1 : 0,
    m.uuid && (m.map || m.transparent) ? '' : '', // textured/transparent materials still merge by look
  ].join('|') + (m.userData && m.userData.unique ? m.uuid : '')
}

// Same attribute set for every geometry: position, normal, uv; non-indexed.
function normalise(geometry) {
  let g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const keep = ['position', 'normal', 'uv']
  Object.keys(g.attributes).forEach((k) => !keep.includes(k) && g.deleteAttribute(k))
  if (!g.attributes.normal) g.computeVertexNormals()
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  g.clearGroups()
  return g
}

// Box projection in metres: each face takes the two world axes it faces across.
function boxUV(g) {
  const p = g.attributes.position.array
  const n = g.attributes.normal.array
  const uv = g.attributes.uv.array
  for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
    const ax = Math.abs(n[i]), ay = Math.abs(n[i + 1]), az = Math.abs(n[i + 2])
    if (ax >= ay && ax >= az) { uv[j] = p[i + 2]; uv[j + 1] = p[i + 1] }
    else if (ay >= az) { uv[j] = p[i]; uv[j + 1] = p[i + 2] }
    else { uv[j] = p[i]; uv[j + 1] = p[i + 1] }
  }
  g.attributes.uv.needsUpdate = true
}

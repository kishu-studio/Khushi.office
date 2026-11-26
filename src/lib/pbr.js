import * as THREE from 'three'

// Photo-scanned CC0 materials from Poly Haven (public/textures/<name>/diff|nor|rough.webp).
// Geometry inside <StaticMerge> gets world-space box-projected UVs, so `size` is the real-world
// size of one tile in metres and every surface shares the same texel density.
const loader = new THREE.TextureLoader()
const cache = new Map()

function tex(name, kind, srgb) {
  const key = `${name}/${kind}`
  if (!cache.has(key)) {
    const t = loader.load(`textures/${name}/${kind}.webp`)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    cache.set(key, t)
  }
  return cache.get(key)
}

function scaled(t, size) {
  // one texture object per scale, sharing the same image
  const key = `${t.uuid}@${size}`
  if (!cache.has(key)) {
    const c = t.clone()
    c.repeat.set(1 / size, 1 / size)
    cache.set(key, c)
  }
  return cache.get(key)
}

// diffuse: false keeps the scanned surface (relief + roughness) but uses the designer's colour.
export function pbr(name, { size = 1, color = '#ffffff', roughness = 1, metalness = 0, normal = 1, rough = true, diffuse = true } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    map: diffuse ? scaled(tex(name, 'diff', true), size) : null,
    normalMap: scaled(tex(name, 'nor', false), size),
    normalScale: new THREE.Vector2(normal, normal),
    roughness,
    metalness,
  })
  if (rough) m.roughnessMap = scaled(tex(name, 'rough', false), size)
  m.userData.worldUV = true
  return m
}

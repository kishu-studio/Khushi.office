import * as THREE from 'three'

// Procedural canvas textures: they give the surfaces in her renders (fluted panels, marble,
// wood veneer, stucco) their character without shipping image files. Each is generated once.

const cache = new Map()

function make(key, w, h, draw, { repeat = [1, 1], color = true } = {}) {
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 4
  if (color) t.colorSpace = THREE.SRGBColorSpace
  cache.set(key, t)
  return t
}

function rand(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Vertical fluting: light ridges and soft shadow grooves.
export function fluted(base = '#e9e3da', count = 48, key = 'fluted') {
  return make(`${key}${base}${count}`, 512, 64, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const step = w / count
    for (let i = 0; i < count; i++) {
      const x = i * step
      const grd = g.createLinearGradient(x, 0, x + step, 0)
      grd.addColorStop(0, 'rgba(0,0,0,0.16)')
      grd.addColorStop(0.35, 'rgba(255,255,255,0.10)')
      grd.addColorStop(0.7, 'rgba(255,255,255,0.0)')
      grd.addColorStop(1, 'rgba(0,0,0,0.10)')
      g.fillStyle = grd
      g.fillRect(x, 0, step, h)
    }
  })
}

// Soft marble with a few grey veins.
export function marble(base = '#eeebe6', vein = 'rgba(120,115,110,0.28)', seed = 7, key = 'marble') {
  return make(`${key}${base}${seed}`, 1024, 1024, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const r = rand(seed)
    for (let v = 0; v < 14; v++) {
      g.strokeStyle = vein
      g.lineWidth = 0.6 + r() * 2.2
      g.beginPath()
      let x = r() * w
      let y = -20
      g.moveTo(x, y)
      while (y < h + 20) {
        x += (r() - 0.5) * 60
        y += 20 + r() * 40
        g.lineTo(x, y)
      }
      g.stroke()
    }
    g.fillStyle = 'rgba(255,255,255,0.05)'
    for (let i = 0; i < 400; i++) g.fillRect(r() * w, r() * h, 2, 2)
  })
}

// Dark polished marble with gold veins (coffee tables).
export function darkMarble(seed = 3) {
  return make(`dm${seed}`, 512, 512, (g, w, h) => {
    g.fillStyle = '#17130f'
    g.fillRect(0, 0, w, h)
    const r = rand(seed)
    for (let v = 0; v < 9; v++) {
      g.strokeStyle = `rgba(${170 + r() * 40},${120 + r() * 30},60,${0.35 + r() * 0.3})`
      g.lineWidth = 0.8 + r() * 1.8
      g.beginPath()
      let x = r() * w
      let y = r() * h
      g.moveTo(x, y)
      for (let k = 0; k < 8; k++) {
        x += (r() - 0.3) * 90
        y += (r() - 0.5) * 90
        g.lineTo(x, y)
      }
      g.stroke()
    }
  })
}

// Wood veneer: long grain lines, for the son's bedroom panels and the soffit.
export function wood(base = '#5a3d2a', key = 'wood', seed = 11) {
  return make(`${key}${base}`, 256, 1024, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const r = rand(seed)
    for (let i = 0; i < 70; i++) {
      const x = r() * w
      g.strokeStyle = `rgba(${r() > 0.5 ? '0,0,0' : '255,220,180'},${0.05 + r() * 0.12})`
      g.lineWidth = 0.5 + r() * 3
      g.beginPath()
      g.moveTo(x, 0)
      g.bezierCurveTo(x + (r() - 0.5) * 20, h * 0.33, x + (r() - 0.5) * 20, h * 0.66, x + (r() - 0.5) * 14, h)
      g.stroke()
    }
  })
}

// Stucco / lime plaster noise for the facade.
export function stucco(base = '#b99a76', seed = 5, key = 'stucco') {
  return make(`${key}${base}${seed}`, 512, 512, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const r = rand(seed)
    for (let i = 0; i < 9000; i++) {
      const a = r() * 0.07
      g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(60,40,20,${a})`
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3)
    }
  })
}

// Diagonal mirror grid for the dining ceiling.
export function mirrorGrid() {
  return make('mirrorgrid', 512, 512, (g, w, h) => {
    g.fillStyle = '#4b4038'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(200,190,175,0.55)'
    g.lineWidth = 3
    for (let i = -w; i < w * 2; i += 128) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke()
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke()
    }
  })
}

// Chevron pattern for the textured wall behind the study desk.
export function chevron(base = '#dcd6cd') {
  return make(`chev${base}`, 256, 256, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(0,0,0,0.10)'
    g.lineWidth = 2
    for (let y = -h; y < h * 2; y += 16) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w / 2, y + 40); g.lineTo(w, y); g.stroke()
    }
  })
}

// Shaggy rug: dense noise.
export function shag(base = '#7a6352', seed = 9) {
  return make(`shag${base}`, 256, 256, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const r = rand(seed)
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,240,220,0.08)' : 'rgba(0,0,0,0.10)'
      g.fillRect(r() * w, r() * h, 1, 3 + r() * 4)
    }
  })
}

// Textured metal ceiling (son's room) – hammered look.
export function hammered() {
  return make('hammered', 512, 512, (g, w, h) => {
    g.fillStyle = '#2b2622'
    g.fillRect(0, 0, w, h)
    const r = rand(21)
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = r() * h, rad = 4 + r() * 12
      const grd = g.createRadialGradient(x - rad / 3, y - rad / 3, 1, x, y, rad)
      grd.addColorStop(0, 'rgba(210,200,190,0.35)')
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grd
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill()
    }
  })
}

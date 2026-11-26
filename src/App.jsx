import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, useProgress, Stats } from '@react-three/drei'
import Lenis from 'lenis'
import gsap from 'gsap'
import { getGPUTier } from 'detect-gpu'
import Studio from './scenes/Studio.jsx'
import Villa from './scenes/Villa.jsx'
import { scroll, pointer } from './lib/store.js'
import { DESIGNER, VILLA_STOPS } from './content.js'
import Gallery from './ui/Gallery.jsx'
import DrawCallProbe from './ui/DrawCallProbe.jsx'
import BakeExport from './ui/BakeExport.jsx'
import ApplyBake from './lib/ApplyBake.jsx'

const HEIGHTS = { studio: 520, villa: 1300 } // scroll length in vh per mode
const params = new URLSearchParams(location.search)

export default function App() {
  const [mode, setMode] = useState(location.hash.startsWith('#/villa') ? 'villa' : 'studio')
  const [tier, setTier] = useState(null) // 'full' | 'gallery'
  const [stage, setStage] = useState(0)
  const [dpr, setDpr] = useState([1, 1.75])
  const lenis = useRef(null)
  const fade = useRef(null)
  const busy = useRef(false)
  const modeRef = useRef(mode)
  modeRef.current = mode

  // Decide once: full 3D, or the light gallery for low-end GPUs and reduced motion.
  useEffect(() => {
    if (params.has('gallery') || matchMedia('(prefers-reduced-motion: reduce)').matches) return setTier('gallery')
    if (params.has('full')) return setTier('full')
    let done = false
    const t = setTimeout(() => !done && setTier('full'), 2500)
    getGPUTier()
      .then((g) => {
        done = true
        setTier(g.tier < 1 ? 'gallery' : 'full')
      })
      .catch(() => {
        done = true
        setTier('full')
      })
    return () => clearTimeout(t)
  }, [])

  // Smooth scroll; progress goes into the shared store, never into React state.
  useEffect(() => {
    if (tier !== 'full') return
    const l = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 })
    lenis.current = l
    l.on('scroll', (e) => {
      scroll.progress = e.limit > 0 ? e.scroll / e.limit : 0
      scroll.velocity = e.velocity
    })
    let raf
    const loop = (t) => {
      l.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const move = (e) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = -((e.clientY / innerHeight) * 2 - 1)
    }
    addEventListener('pointermove', move)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', move)
      l.destroy()
    }
  }, [tier])

  // Which caption / stage we are at. Updates React only when the stage changes.
  useEffect(() => {
    if (tier !== 'full') return
    let raf
    let last = -1
    const tick = () => {
      const p = scroll.progress
      let s
      if (mode === 'studio') s = p < 0.1 ? 0 : p < 0.9 ? 1 : 2
      else s = Math.max(0, VILLA_STOPS.findIndex((x) => p >= x.from && p < x.to)) + (p > 0.975 ? 100 : 0)
      if (s !== last) {
        last = s
        setStage(s)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, tier])

  const switchTo = useCallback((next, after) => {
    if (busy.current) return
    busy.current = true
    gsap.to(fade.current, {
      opacity: 1,
      duration: 0.7,
      ease: 'power2.in',
      onComplete: () => {
        scroll.progress = next === 'studio' ? 1 : 0 // the camera mounts where the story continues
        setMode(next)
        const h = next === 'villa' ? '#/villa' : '#/'
        if (location.hash !== h) history.pushState(null, '', h)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const l = lenis.current
            l.resize()
            l.scrollTo(next === 'studio' ? l.limit : 0, { immediate: true, force: true })
            gsap.to(fade.current, {
              opacity: 0,
              duration: 1.0,
              delay: 0.2,
              ease: 'power2.out',
              onComplete: () => {
                busy.current = false
                after && after()
              },
            })
          }),
        )
      },
    })
  }, [])

  const enter = useCallback(() => switchTo('villa'), [switchTo])
  // From the laptop: the 3D project walks in; the others open as image galleries.
  const pick = useCallback((id, live) => (live ? enter() : (location.href = `?gallery#${id}`)), [enter])

  // Browser back/forward (or an edited link) changes only the hash: follow it.
  useEffect(() => {
    const onHash = () => {
      const want = location.hash.startsWith('#/villa') ? 'villa' : 'studio'
      if (want !== modeRef.current) switchTo(want)
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [switchTo])
  // Back: land inside the monitor, then pull out of the screen to the desk.
  const back = useCallback(
    () => switchTo('studio', () => lenis.current.scrollTo(0.62 * lenis.current.limit, { duration: 2.8, easing: (t) => 1 - Math.pow(1 - t, 3) })),
    [switchTo],
  )

  if (tier === null) return <div className="boot">Preparing the studio…</div>
  if (tier === 'gallery') return <Gallery onFull={() => (location.search = '?full')} />

  return (
    <>
      <div className="stage">
        <Canvas shadows dpr={dpr} camera={{ fov: 50, near: 0.03, far: 220, position: [2, 1.6, 3] }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
          <PerformanceMonitor onDecline={() => setDpr(1)} />
          <Suspense fallback={null}>
            {mode === 'studio' ? <Studio onPick={pick} interactive={stage === 2} /> : <Villa />}
          </Suspense>
          <ApplyBake key={`bake-${mode}`} name={mode} />
          {params.has('stats') && <Stats />}
          {params.has('stats') && <DrawCallProbe />}
          {import.meta.env.DEV && params.has('export') && <BakeExport key={mode} name={mode} />}
        </Canvas>
      </div>

      <div className="scroll-space" style={{ height: `${HEIGHTS[mode]}vh` }} />

      <header className="top">
        <span className="brand">{DESIGNER.name}</span>
        <nav>
          {mode === 'villa' && (
            <button className="link" onClick={back}>
              ← <span className="long">Back to the </span>studio
            </button>
          )}
          <a className="link" href="?gallery">
            <span className="long">View as </span>gallery
          </a>
        </nav>
      </header>

      {mode === 'studio' ? <StudioUI stage={stage} onEnter={enter} /> : <VillaUI stage={stage} onBack={back} />}
      <Loader />
      <div className="fade" ref={fade} />
    </>
  )
}

function StudioUI({ stage, onEnter }) {
  return (
    <>
      <section className={`hero ${stage === 0 ? 'on' : ''}`}>
        <p className="eyebrow">{DESIGNER.base}</p>
        <h1>{DESIGNER.name}</h1>
        <p className="role">{DESIGNER.role}</p>
        <p className="hint">Scroll to walk up to the desk</p>
      </section>
      <section className={`screen-cta ${stage === 2 ? 'on' : ''}`}>
        <p>Pick a project on the laptop, or</p>
        <button className="btn" onClick={onEnter} tabIndex={stage === 2 ? 0 : -1}>
          Enter The Arch House →
        </button>
      </section>
    </>
  )
}

function VillaUI({ stage, onBack }) {
  const end = stage >= 100
  const i = end ? VILLA_STOPS.length - 1 : stage
  const stop = VILLA_STOPS[i]
  const [zoom, setZoom] = useState(null)
  return (
    <>
      <aside className={`caption ${end ? 'hide' : ''}`} key={i}>
        <p className="eyebrow">
          {String(i + 1).padStart(2, '0')} / {String(VILLA_STOPS.length).padStart(2, '0')}
        </p>
        <h2>{stop.title}</h2>
        <p>{stop.body}</p>
        <button className="render-thumb" onClick={() => setZoom(stop.render)} aria-label={`See the original render: ${stop.title}`}>
          <img src={`renders/${stop.render}.webp`} alt="" />
          <span>Original render</span>
        </button>
      </aside>
      <ol className="rail" aria-label="Rooms">
        {VILLA_STOPS.map((s, k) => (
          <li key={s.title} className={k === i ? 'on' : ''}>
            {s.title}
          </li>
        ))}
      </ol>
      <section className={`end ${end ? 'on' : ''}`}>
        <h2>That was The Arch House.</h2>
        <button className="btn" onClick={onBack} tabIndex={end ? 0 : -1}>
          ← Back to the studio
        </button>
      </section>
      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label="Original render">
          <img src={`renders/${zoom}.webp`} alt={`${stop.title}, original render`} />
          <button className="link" onClick={() => setZoom(null)}>
            Close
          </button>
        </div>
      )}
    </>
  )
}

function Loader() {
  const { active, progress } = useProgress()
  const [gone, setGone] = useState(false)
  // Done when nothing is loading any more (a scene with no files never reports 100%).
  const done = !active && (progress >= 100 || progress === 0)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setGone(true), 700)
    return () => clearTimeout(t)
  }, [done])
  if (gone) return null
  return (
    <div className={`loader ${done ? 'out' : ''}`}>
      <span>{DESIGNER.name}</span>
      <div className="bar">
        <i style={{ width: `${Math.round(progress)}%` }} />
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { DESIGNER, VILLA_STOPS, GALLERIES } from '../content.js'

// The light path: her renders as an editorial page. Used for low-end GPUs,
// reduced motion, or when a visitor chooses it.
const EXTRA = ['exterior-4', 'exterior-5', 'living-2', 'living-3', 'balcony', 'dining-2', 'kitchen-1', 'master-2', 'son-1', 'son-2', 'daughter-1', 'daughter-2', 'daughter-3']

export default function Gallery({ onFull }) {
  // arriving from the laptop with #apartment etc.: jump to that project once images have a size
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
  }, [])
  return (
    <main className="gallery">
      <header>
        <p className="eyebrow">{DESIGNER.base}</p>
        <h1>{DESIGNER.name}</h1>
        <p className="role">{DESIGNER.role}</p>
        <button className="link" onClick={onFull}>
          Open the 3D walk-through →
        </button>
      </header>
      <section id="arch-house">
        <h2>The Arch House</h2>
        <p className="lede">Villa, Ahmedabad. Exterior and full interiors.</p>
        {VILLA_STOPS.map((s) => (
          <figure key={s.title}>
            <img src={`renders/${s.render}.webp`} alt={s.title} loading="lazy" />
            <figcaption>
              <strong>{s.title}</strong> {s.body}
            </figcaption>
          </figure>
        ))}
        <div className="grid">
          {EXTRA.map((r) => (
            <img key={r} src={`renders/${r}.webp`} alt="" loading="lazy" />
          ))}
        </div>
      </section>
      {Object.entries(GALLERIES).map(([id, g]) => (
        <section key={id} id={id} className="more">
          <h2>{g.title}</h2>
          <p className="lede">{g.lede}</p>
          <div className="grid">
            {g.renders.map((r) => (
              <img key={r} src={`renders/${r}.webp`} alt={g.title} loading="lazy" />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}

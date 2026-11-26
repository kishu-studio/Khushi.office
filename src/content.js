// Everything a visitor reads. Client names are kept off the public site until they agree.

export const DESIGNER = {
  name: 'Khushi',
  fullName: 'Khushi Panchal',
  role: 'Interior & Architectural Designer',
  base: 'Ahmedabad, India',
  phone: '+91 90547 10355',
  email: 'panchalkhushi9195@gmail.com',
  whatsapp: 'https://wa.me/919054710355?text=' + encodeURIComponent('Hi Khushi, I saw your portfolio and would like to talk about a project.'),
  mailto: 'mailto:panchalkhushi9195@gmail.com?subject=' + encodeURIComponent('Project enquiry from your portfolio'),
}

export const PROJECTS = [
  {
    id: 'arch-house',
    live: true,
    title: 'The Arch House',
    subtitle: 'Villa. Exterior and full interiors, in 3D.',
    thumb: 'renders/exterior-1.webp',
  },
  { id: 'apartment', live: false, title: 'Calm Apartment', subtitle: 'Warm-white apartment interiors.', thumb: 'renders/apt-1.webp' },
  { id: 'clinic', live: false, title: 'Clinic Interiors', subtitle: 'Oak panelling and sage-green seating.', thumb: 'renders/clinic-4.webp' },
  { id: 'tower', live: false, title: 'Residential Tower', subtitle: 'Brick and sandstone high-rise, Bhadaj.', thumb: 'renders/tower-2.webp' },
]

// Projects shown as image galleries (not walk-throughs yet). Renders are her originals.
export const GALLERIES = {
  apartment: { title: 'Calm Apartment', lede: 'Warm-white apartment: living, dining, prayer niche, kitchen and three bedrooms.', renders: Array.from({ length: 12 }, (_, i) => `apt-${i + 1}`) },
  clinic: { title: 'Clinic Interiors', lede: 'A clinic: oak-panelled reception, waiting lounge with an aquarium wall, and consultation rooms.', renders: ['clinic-4', 'clinic-1', 'clinic-2', 'clinic-3', 'clinic-5'] },
  tower: { title: 'Residential Tower', lede: 'A high-rise in brick and sandstone, Bhadaj.', renders: ['tower-2', 'tower-1', 'tower-3'] },
}

// Stops along the villa walk-through. `from`/`to` are scroll progress; `render` is her original image
// for that view, shown beside the 3D so visitors can compare.
export const VILLA_STOPS = [
  { from: 0.0, to: 0.1, title: 'The Arch House', body: 'A three-storey family villa in Ahmedabad. Warm lime-plaster walls, a roof that curls up at its edge, and arches repeated from the gate to the bedrooms.', render: 'exterior-2' },
  { from: 0.1, to: 0.2, title: 'The gate', body: 'The compound wall rises and falls in one soft wave, then opens into a tall arched gate with bronze louvres.', render: 'exterior-1' },
  { from: 0.2, to: 0.33, title: 'Arrival', body: 'A bronze-framed arched door, deep balconies planted with trees, and porthole windows that keep the facade playful.', render: 'exterior-3' },
  { from: 0.36, to: 0.5, title: 'Living room', body: 'A backlit mountain relief runs the length of the seating wall, framed by two arched niches with sculptural brass lights.', render: 'living-4' },
  { from: 0.5, to: 0.58, title: 'Lounge', body: 'One long tufted sofa, nested oval tables in white lacquer and black marble, and a deep shag rug to soften the marble floor.', render: 'living-1' },
  { from: 0.58, to: 0.74, title: 'Dining', body: 'Layered fluted arches behind the table and a mirrored ceiling cove that doubles the chandelier.', render: 'dining-1' },
  { from: 0.74, to: 0.84, title: 'Kitchen', body: 'A U-shaped kitchen in warm greige, smoked-glass uppers and a breakfast counter facing the dining room.', render: 'kitchen-2' },
  { from: 0.86, to: 1.01, title: 'Master bedroom', body: 'Marble-panelled headboard wall, upholstered bed and sheer curtains: the quietest room in the house.', render: 'master-1' },
]

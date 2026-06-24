// Fake data for the music carousel mockup.
// Album covers are generated as self-contained SVG data-URIs so the mockup
// renders with no network dependency. Swap `cover` for real Spotify art later.

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  releaseDate: string // ISO yyyy-mm-dd (precision may vary for real data)
  coverUrl?: string // real album art (Spotify); when absent a cover is generated
  colors?: [string, string, string] // [from, to, accent] for the generated cover
  pattern?: number // optional override, otherwise derived from id
}

export interface Playlist {
  id: string
  name: string
  emoji?: string
  tracks: Track[]
}

/* ── Generated album-cover art ───────────────────────────────────────── */

function patternFor(seed: number, [from, to, accent]: [string, string, string]): string {
  switch (seed % 5) {
    case 0: // concentric rings
      return `
        <circle cx="150" cy="135" r="120" fill="none" stroke="${accent}" stroke-width="6" opacity="0.55"/>
        <circle cx="150" cy="135" r="86"  fill="none" stroke="${accent}" stroke-width="6" opacity="0.4"/>
        <circle cx="150" cy="135" r="52"  fill="${accent}" opacity="0.85"/>`
    case 1: // diagonal stripes
      return `
        <g opacity="0.5">
          <rect x="-60" y="-60" width="60" height="520" fill="${accent}" transform="rotate(28 150 150)"/>
          <rect x="120" y="-60" width="60" height="520" fill="${accent}" transform="rotate(28 150 150)"/>
          <rect x="300" y="-60" width="60" height="520" fill="${accent}" transform="rotate(28 150 150)"/>
        </g>`
    case 2: // big triangle
      return `<path d="M40 250 L150 40 L260 250 Z" fill="${accent}" opacity="0.8"/>`
    case 3: // offset blocks
      return `
        <g opacity="0.75">
          <rect x="40"  y="40"  width="110" height="110" fill="${accent}"/>
          <rect x="160" y="120" width="100" height="100" fill="${to}"/>
          <circle cx="200" cy="80" r="36" fill="${from}"/>
        </g>`
    default: // sun / horizon
      return `
        <circle cx="150" cy="120" r="70" fill="${accent}" opacity="0.9"/>
        <rect x="0" y="190" width="300" height="110" fill="${accent}" opacity="0.35"/>`
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export function coverDataUri(track: Track): string {
  const colors: [string, string, string] = track.colors ?? ['#3a3a3a', '#1a1a1a', '#888888']
  const [from, to] = colors
  const seed = track.pattern ?? track.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="url(#g)"/>
  ${patternFor(seed, colors)}
  <rect x="0" y="232" width="300" height="68" fill="rgba(0,0,0,0.34)"/>
  <text x="20" y="262" font-family="Helvetica,Arial,sans-serif" font-size="20" font-weight="700" fill="#fff">${esc(clip(track.title, 22))}</text>
  <text x="20" y="284" font-family="Helvetica,Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.82)">${esc(clip(track.artist, 26))}</text>
</svg>`.trim()
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/* ── Playlists ───────────────────────────────────────────────────────── */

let _n = 0
const t = (
  title: string,
  artist: string,
  album: string,
  releaseDate: string,
  colors: [string, string, string],
): Track => ({ id: `tr${++_n}`, title, artist, album, releaseDate, colors })

export const PLAYLISTS: Playlist[] = [
  {
    id: 'late-night-drive',
    name: 'late night drive',
    emoji: '🌃',
    tracks: [
      t('Neon Mirage', 'Cassette Club', 'Afterglow', '2021-09-17', ['#3a1c71', '#d76d77', '#ffaf7b']),
      t('Midnight Tide', 'Violet Hours', 'Slow Motion', '2019-04-05', ['#0f2027', '#203a43', '#2c5364']),
      t('Static Bloom', 'Marlowe', 'Headlights', '2022-02-11', ['#42275a', '#734b6d', '#c06c84']),
      t('Glass Avenue', 'Nori', 'City Pop Vol.2', '2018-11-23', ['#1a2a6c', '#b21f1f', '#fdbb2d']),
      t('Velvet Static', 'The Lumen', 'After Dark', '2020-07-31', ['#232526', '#414345', '#8e9eab']),
      t('Run the Reds', 'Halcyon', 'Overpass', '2023-01-13', ['#16222a', '#3a6073', '#7f7fd5']),
      t('Slow Burn', 'Echo Lane', 'Afterglow', '2021-09-17', ['#603813', '#b29f94', '#e96443']),
      t('Cobalt', 'Marlowe', 'Headlights', '2022-02-11', ['#000046', '#1cb5e0', '#43cea2']),
      t('Aftertaste', 'Violet Hours', 'Slow Motion', '2019-04-05', ['#34073d', '#7b337d', '#ff5f6d']),
      t('Highway Hymn', 'Cassette Club', 'Afterglow', '2021-09-17', ['#2c3e50', '#4ca1af', '#c4e0e5']),
      t('Low Beams', 'Nori', 'City Pop Vol.2', '2018-11-23', ['#0b486b', '#f56217', '#f9d423']),
      t('Quiet Engine', 'The Lumen', 'After Dark', '2020-07-31', ['#1f1c2c', '#928dab', '#e0c3fc']),
      t('Tail Lights', 'Halcyon', 'Overpass', '2023-01-13', ['#4b134f', '#c94b4b', '#f7797d']),
      t('Underpass', 'Echo Lane', 'Afterglow', '2021-09-17', ['#0f0c29', '#24243e', '#5f72bd']),
      t('Dark Mirror', 'The Lumen', 'After Dark', '2020-07-31', ['#020024', '#090979', '#00d4ff']),
      t('Late Exit', 'Nori', 'City Pop Vol.2', '2018-11-23', ['#360033', '#0b8793', '#34e89e']),
      t('Two Lanes', 'Cassette Club', 'Afterglow', '2021-09-17', ['#41295a', '#2f0743', '#ee9ca7']),
      t('Drift', 'Marlowe', 'Headlights', '2022-02-11', ['#1e130c', '#9a8478', '#f7b733']),
      t('Signal', 'Violet Hours', 'Slow Motion', '2019-04-05', ['#222', '#3a1c71', '#ffaf7b']),
      t('Last Call', 'Halcyon', 'Overpass', '2023-01-13', ['#0a0e1a', '#1a2a6c', '#b21f1f']),
    ],
  },
  {
    id: 'sunday-morning',
    name: 'sunday morning',
    emoji: '☕️',
    tracks: [
      t('Honey Light', 'Pram & Co', 'Linen', '2017-05-12', ['#f7971e', '#ffd200', '#fff3b0']),
      t('Soft Open', 'June Maple', 'Window Seat', '2020-03-06', ['#a8e063', '#56ab2f', '#dcedc1']),
      t('Pour Over', 'The Kettle', 'Slow Sunday', '2019-08-30', ['#c79081', '#dfa579', '#ffe9d6']),
      t('Linen Sky', 'Pram & Co', 'Linen', '2017-05-12', ['#89f7fe', '#66a6ff', '#e0f7ff']),
      t('Marmalade', 'Field Notes', 'Garden Hours', '2022-06-24', ['#f8b500', '#fceabb', '#ff9a8b']),
      t('First Pages', 'June Maple', 'Window Seat', '2020-03-06', ['#d3cce3', '#e9e4f0', '#b8c6db']),
      t('Steam', 'The Kettle', 'Slow Sunday', '2019-08-30', ['#e6dada', '#274046', '#a1c4fd']),
      t('Barefoot', 'Field Notes', 'Garden Hours', '2022-06-24', ['#fbc2eb', '#a6c1ee', '#fde1ff']),
      t('Window Box', 'Pram & Co', 'Linen', '2017-05-12', ['#fdfbfb', '#ebedee', '#cfd9df']),
      t('Slow Roast', 'The Kettle', 'Slow Sunday', '2019-08-30', ['#c9d6ff', '#e2e2e2', '#b6fbff']),
      t('Citrus', 'Field Notes', 'Garden Hours', '2022-06-24', ['#f6d365', '#fda085', '#fff0c9']),
      t('No Plans', 'June Maple', 'Window Seat', '2020-03-06', ['#ffecd2', '#fcb69f', '#ffd3a5']),
      t('Cream', 'The Kettle', 'Slow Sunday', '2019-08-30', ['#fff6b7', '#f6416c', '#ffd9e8']),
      t('Toast', 'Pram & Co', 'Linen', '2017-05-12', ['#f4e2d8', '#ba5370', '#ffd1a9']),
      t('Garden Path', 'June Maple', 'Window Seat', '2020-03-06', ['#c1dfc4', '#deecdd', '#a8e6cf']),
      t('Afternoon', 'Field Notes', 'Garden Hours', '2022-06-24', ['#fceabb', '#f8b500', '#ffe29f']),
      t('Linen Fold', 'Pram & Co', 'Linen', '2017-05-12', ['#e0eafc', '#cfdef3', '#a1c4fd']),
      t('Daydream', 'June Maple', 'Window Seat', '2020-03-06', ['#fbc2eb', '#a6c1ee', '#ffdde1']),
      t('Stovetop', 'The Kettle', 'Slow Sunday', '2019-08-30', ['#ee9ca7', '#ffdde1', '#fceabb']),
      t('Slow Hours', 'Field Notes', 'Garden Hours', '2022-06-24', ['#fdfcfb', '#e2d1c3', '#f5e6ca']),
    ],
  },
  {
    id: 'focus-flow',
    name: 'focus flow',
    emoji: '🎧',
    tracks: [
      t('Deep Field', 'Arc System', 'Continuum', '2021-01-29', ['#0f0c29', '#302b63', '#24c6dc']),
      t('Lattice', 'Mono No', 'Grid', '2018-10-19', ['#000428', '#004e92', '#43c6ac']),
      t('Slow Math', 'Arc System', 'Continuum', '2021-01-29', ['#093028', '#237a57', '#56ab2f']),
      t('Null State', 'Tessellate', 'Quiet Machines', '2022-09-02', ['#141e30', '#243b55', '#7474bf']),
      t('Paper Trails', 'Mono No', 'Grid', '2018-10-19', ['#283048', '#859398', '#a8c0ff']),
      t('Long Form', 'Tessellate', 'Quiet Machines', '2022-09-02', ['#0a2342', '#2ca58d', '#84e9d2']),
      t('Index', 'Arc System', 'Continuum', '2021-01-29', ['#232526', '#1f4037', '#99f2c8']),
      t('Quiet Room', 'Mono No', 'Grid', '2018-10-19', ['#1d2b64', '#f8cdda', '#5b86e5']),
      t('Cache', 'Tessellate', 'Quiet Machines', '2022-09-02', ['#16222a', '#3a6073', '#36d1dc']),
      t('Threadbare', 'Arc System', 'Continuum', '2021-01-29', ['#42275a', '#734b6d', '#6dd5ed']),
      t('Soft Lock', 'Mono No', 'Grid', '2018-10-19', ['#1a2980', '#26d0ce', '#9be7ff']),
      t('Idle Hands', 'Tessellate', 'Quiet Machines', '2022-09-02', ['#000046', '#1cb5e0', '#7ee8fa']),
      t('Pointer', 'Arc System', 'Continuum', '2021-01-29', ['#12100e', '#2b4162', '#43cea2']),
      t('Buffer', 'Mono No', 'Grid', '2018-10-19', ['#0f2027', '#2c5364', '#56ccf2']),
      t('Quiet Loop', 'Tessellate', 'Quiet Machines', '2022-09-02', ['#1f1c2c', '#3a6073', '#8fd3f4']),
      t('Margins', 'Arc System', 'Continuum', '2021-01-29', ['#093028', '#237a57', '#43e97b']),
      t('Footnote', 'Mono No', 'Grid', '2018-10-19', ['#16222a', '#3a6073', '#a8c0ff']),
      t('Stillwater', 'Tessellate', 'Quiet Machines', '2022-09-02', ['#0a2342', '#126872', '#67e6dc']),
      t('Drafts', 'Arc System', 'Continuum', '2021-01-29', ['#232526', '#414345', '#7dd3fc']),
      t('Low Light', 'Mono No', 'Grid', '2018-10-19', ['#141e30', '#243b55', '#9face6']),
    ],
  },
  {
    id: 'throwbacks',
    name: 'throwbacks',
    emoji: '📼',
    tracks: [
      t('Bubblegum', 'The Polaroids', 'Saturday Cartoons', '2009-06-15', ['#ff6a00', '#ee0979', '#ffd86f']),
      t('Roller Rink', 'Dial Tone', 'Pager', '2011-03-22', ['#f953c6', '#b91d73', '#ffd1ff']),
      t('Mixtape', 'The Polaroids', 'Saturday Cartoons', '2009-06-15', ['#fc466b', '#3f5efb', '#ffd6e0']),
      t('Dial-Up', 'Dial Tone', 'Pager', '2011-03-22', ['#00c3ff', '#ffff1c', '#a8ff78']),
      t('Glow Sticks', 'Neon Court', 'After School', '2008-09-09', ['#7f00ff', '#e100ff', '#ffd6ff']),
      t('Cassette', 'The Polaroids', 'Saturday Cartoons', '2009-06-15', ['#f7971e', '#ffd200', '#ff5f6d']),
      t('Slap Bracelet', 'Neon Court', 'After School', '2008-09-09', ['#43e97b', '#38f9d7', '#fffc00']),
      t('Channel Surf', 'Dial Tone', 'Pager', '2011-03-22', ['#ff512f', '#dd2476', '#ffafbd']),
      t('Pixel Heart', 'Neon Court', 'After School', '2008-09-09', ['#ff0099', '#493240', '#ff6ec4']),
      t('Recess', 'The Polaroids', 'Saturday Cartoons', '2009-06-15', ['#36d1dc', '#5b86e5', '#fff200']),
      t('Static Channel', 'Dial Tone', 'Pager', '2011-03-22', ['#283c86', '#45a247', '#fdeb71']),
      t('Last Bell', 'Neon Court', 'After School', '2008-09-09', ['#ee0979', '#ff6a00', '#fff3a3']),
      t('Walkman', 'The Polaroids', 'Saturday Cartoons', '2009-06-15', ['#f12711', '#f5af19', '#ffe259']),
      t('Trapper Keeper', 'Dial Tone', 'Pager', '2011-03-22', ['#8e2de2', '#4a00e0', '#d4a5ff']),
      t('Lunchbox', 'Neon Court', 'After School', '2008-09-09', ['#00b09b', '#96c93d', '#f9ff8b']),
      t('VHS Rewind', 'The Polaroids', 'Saturday Cartoons', '2009-06-15', ['#fc466b', '#3f5efb', '#a18cd1']),
      t('Hopscotch', 'Dial Tone', 'Pager', '2011-03-22', ['#ff9a9e', '#fecfef', '#ffdde1']),
      t('Arcade', 'Neon Court', 'After School', '2008-09-09', ['#f857a6', '#ff5858', '#ffc371']),
      t('Sticker Book', 'The Polaroids', 'Saturday Cartoons', '2009-06-15', ['#43cea2', '#185a9d', '#b2fefa']),
      t('After Bell', 'Dial Tone', 'Pager', '2011-03-22', ['#ff512f', '#f09819', '#ffe53b']),
    ],
  },
]

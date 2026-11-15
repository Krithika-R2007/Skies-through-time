// Small RA/Dec scatter plot used for change candidates, motion trails and ghost
// predictions. East is to the left, as on the sky. Scales to fit whatever is plotted.

export interface PlotPoint {
  ra: number
  dec: number
  color: string
  label?: string
  r?: number
  hollow?: boolean
}
export interface PlotLine {
  pts: { ra: number; dec: number }[]
  color: string
  dashed?: boolean
  arrow?: boolean
}

const S = 360

export function SkyPlot({
  ra0,
  dec0,
  points,
  lines = [],
  minExtentDeg = 0.01,
}: {
  ra0: number
  dec0: number
  points: PlotPoint[]
  lines?: PlotLine[]
  minExtentDeg?: number
}) {
  const cosd = Math.cos((dec0 * Math.PI) / 180) || 1
  const off = (ra: number, dec: number) => {
    let dra = ra - ra0
    if (dra > 180) dra -= 360
    if (dra < -180) dra += 360
    return { x: -dra * cosd, y: dec - dec0 }
  }
  const all = [...points, ...lines.flatMap((l) => l.pts)].map((p) => off(p.ra, p.dec))
  const ext = Math.max(minExtentDeg, ...all.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)])) * 1.25
  const X = (x: number) => S / 2 + (x / ext) * (S / 2 - 18)
  const Y = (y: number) => S / 2 - (y / ext) * (S / 2 - 18)
  const arcsec = ext * 3600
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40" role="img" aria-label="Sky plot">
      <defs>
        <marker id="skyplot-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ffb02e" />
        </marker>
      </defs>
      <line x1={S / 2} x2={S / 2} y1={10} y2={S - 10} stroke="rgba(255,255,255,0.07)" />
      <line y1={S / 2} y2={S / 2} x1={10} x2={S - 10} stroke="rgba(255,255,255,0.07)" />
      <text x={S - 8} y={S / 2 - 6} textAnchor="end" fontSize="9" fill="rgba(200,190,255,0.5)">W</text>
      <text x={8} y={S / 2 - 6} fontSize="9" fill="rgba(200,190,255,0.5)">E</text>
      <text x={S / 2 + 5} y={16} fontSize="9" fill="rgba(200,190,255,0.5)">N</text>
      {lines.map((l, i) => (
        <polyline
          key={i}
          points={l.pts.map((p) => { const o = off(p.ra, p.dec); return `${X(o.x)},${Y(o.y)}` }).join(' ')}
          fill="none"
          stroke={l.color}
          strokeWidth="1.5"
          strokeDasharray={l.dashed ? '5 4' : undefined}
          markerEnd={l.arrow ? 'url(#skyplot-arrow)' : undefined}
        />
      ))}
      {points.map((p, i) => {
        const o = off(p.ra, p.dec)
        return (
          <g key={i}>
            <circle
              cx={X(o.x)}
              cy={Y(o.y)}
              r={p.r ?? 4}
              fill={p.hollow ? 'none' : p.color}
              stroke={p.color}
              strokeWidth="1.5"
              strokeDasharray={p.hollow ? '3 2' : undefined}
            />
            {p.label && (
              <text x={X(o.x) + 7} y={Y(o.y) - 6} fontSize="9" fill="rgba(240,235,255,0.85)">{p.label}</text>
            )}
          </g>
        )
      })}
      <text x={10} y={S - 8} fontSize="9" fill="rgba(200,190,255,0.45)">Field half-width {'\u2248'} {arcsec >= 120 ? `${(arcsec / 60).toFixed(1)}\u2032` : `${arcsec.toFixed(0)}\u2033`}</text>
    </svg>
  )
}

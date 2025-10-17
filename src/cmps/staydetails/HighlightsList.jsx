// /pages/StayDetails/parts/HighlightsList.jsx
import { SvgIcon } from '../SvgIcon'

export function HighlightsList({ highlights = [] }) {
  if (!highlights.length) return null

  return (
    <ul className="listing-highlights">
      {highlights.map((h, idx) => {
        const iconName = typeof h === 'string' ? 'key' : (h.icon?.toLowerCase?.() || 'key')
        const title = typeof h === 'string' ? h : h.title
        const desc = typeof h === 'string' ? '' : h.desc
        return (
          <li key={idx} className="highlight-item">
            <SvgIcon iconName={iconName} className="highlight-icon" />
            <div>
              <p className="highlight-title">{title}</p>
              {desc && <p className="highlight-desc">{desc}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
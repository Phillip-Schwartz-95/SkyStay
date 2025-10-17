// /pages/StayDetails/parts/AmenitiesList.jsx
import { SvgIcon } from '../SvgIcon'

export function AmenitiesList({ amenities = [] }) {
  if (!amenities.length) return null

  return (
    <section className="stay-amenities">
      <h2>What this place offers</h2>
      <ul className="amenities-grid">
        {amenities.map((a, idx) => {
          const iconName = (a || '').toString().toLowerCase().replace(/\s+/g, '')
          return (
            <li key={idx} className="amenity-item">
              <SvgIcon iconName={iconName} className="amenity-icon" />
              <span>{a}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
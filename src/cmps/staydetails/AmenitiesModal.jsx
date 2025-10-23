import { SvgIcon } from '../SvgIcon'

export function AmenitiesModal({ amenities, onClose, AMENITY_ICON_MAP }) {
    const normalize = str => str.toLowerCase().trim()
    const categories = {
        'Connectivity': ['wifi', 'internet', 'ethernet connection'],
        'Comfort': ['air conditioning', 'heating', 'essentials', 'hot water', 'bed linens'],
        'Kitchen': ['kitchen', 'microwave', 'coffee maker', 'refrigerator', 'oven', 'stove', 'dishwasher'],
        'Laundry': ['washer', 'dryer', 'iron', 'hangers'],
        'Entertainment': ['tv', 'cable tv', 'smart tv'],
        'Safety': ['smoke detector', 'carbon monoxide detector', 'fire extinguisher', 'first aid kit'],
        'Outdoor': ['balcony', 'pool', 'terrace', 'patio or balcony'],
        'Family': ['family/kid friendly', 'crib', 'long term stays allowed', 'luggage dropoff allowed'],
        'Access & Check-in': ['lockbox', 'self check-in', '24-hour check-in', 'doorman', 'private entrance'],
        'Workspace': ['workspace', 'laptop friendly workspace', 'desk'],
        'Other': []
    }

    // Group amenities by category
    const grouped = {}
    amenities.forEach(a => {
        const lower = normalize(a)
        let found = false
        for (const [cat, items] of Object.entries(categories)) {
            if (items.includes(lower)) {
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push(a)
                found = true
                break
            }
        }
        if (!found) {
            if (!grouped['Other']) grouped['Other'] = []
            grouped['Other'].push(a)
        }
    })

    return (
        <div className="amenities-modal-backdrop" onClick={onClose}>
            <div className="amenities-modal" onClick={(ev) => ev.stopPropagation()}>
                <button className="close-modal-btn" onClick={onClose}>×</button>

                {/* all scrollable content goes inside this wrapper */}
                <div className="amenities-modal-content">
                    <h2 className="amenity-header">All amenities</h2>

                    {Object.entries(grouped).map(([category, list]) => (
                        <div key={category} className="amenity-category">
                            <h3>{category}</h3>
                            <ul className="amenities-grid full">
                                {list.map((a, idx) => {
                                    const iconName = AMENITY_ICON_MAP[normalize(a)] || 'showall'
                                    return (
                                        <li key={idx} className="amenity-item">
                                            <SvgIcon iconName={iconName} className="amenity-icon" />
                                            <span>{a}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
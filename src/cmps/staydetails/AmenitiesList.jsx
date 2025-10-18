import { SvgIcon } from '../SvgIcon'

export function AmenitiesList({ amenities }) {
    if (!amenities || !amenities.length) return null

    const AMENITY_ICON_MAP = {
        // Connectivity
        'WiFi': 'wifi',

        // Comfort
        'Air conditioning': 'airconditioning',
        'Heating': 'airconditioning',

        // Kitchen & Dining
        'Kitchen': 'kitchen',
        'Kitchenette': 'kitchen',
        'Refrigerator': 'refrigerator',

        // Laundry
        'Washer': 'cleanliness',
        'Dryer': 'cleanliness',

        // Entertainment
        'Smart TV': 'music',

        // Parking & Access
        'Parking': 'parking',
        'Garage': 'parking',
        'Elevator': 'schedule',

        // Workspace & Business
        'Workspace': 'workspace',
        'Desk': 'workspace',

        // Outdoor
        'Balcony': 'balcony',
        'Patio': 'balcony',
        'Terrace': 'balcony',
        'Pool': 'pool',

        // Family & Kids
        'Family friendly': 'briefcase',
        'Playground': 'nature',

        // Safety
        'Smoke alarm installed': 'smokeAlarm',
        'CO alarm installed': 'coAlarm',
        'First aid kit available': 'schedule',
        'Smoke Alarm (missing)': 'noSmoke',
        'Carbon Monoxide Alarm (missing)': 'noCo',

        // Scenic
        'Lake view': 'mapmarker',
        'City view': 'cityview',
        'Great views': 'cityview',
    }

    return (
        <section className="stay-amenities">
            <h2>What this place offers</h2>
            <ul className="amenities-grid">
                {amenities.map((amenity, idx) => {
                    const iconName = AMENITY_ICON_MAP[amenity] || 'showall'
                    return (
                        <li key={idx} className="amenity-item">
                            <SvgIcon iconName={iconName} className="amenity-icon" />
                            <span className="amenity-label">{amenity}</span>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
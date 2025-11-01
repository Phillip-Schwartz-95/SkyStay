import React from 'react'
import { SvgIcon } from '../SvgIcon'
import { AmenitiesModal } from './AmenitiesModal'

export function AmenitiesList({ amenities = [] }) {
    if (!amenities || !amenities.length) return null

    const [isModalOpen, setIsModalOpen] = React.useState(false)

    const AMENITY_ICON_MAP = {

        // Connectivity
        'wifi': 'wifi',
        'internet': 'wifi',
        'ethernet connection': 'wifi',
        'high speed wifi': 'wifi',

        // Comfort & Essentials
        'air conditioning': 'airconditioning',
        'ac': 'airconditioning',
        'heating': 'airconditioning',
        'essentials': 'cleanliness',
        'shampoo': 'cleanliness',
        'hair dryer': 'cleanliness',
        'iron': 'cleanliness',
        'hangers': 'cleanliness',
        'hot water': 'cleanliness',
        'bed linens': 'cleanliness',
        'extra pillows and blankets': 'cleanliness',
        'towels': 'cleanliness',
        'body soap': 'cleanliness',

        // Laundry
        'washer': 'cleanliness',
        'dryer': 'cleanliness',
        'laundry': 'cleanliness',

        // Kitchen & Dining
        'kitchen': 'kitchen',
        'dishwasher': 'kitchen',
        'microwave': 'kitchen',
        'coffee maker': 'kitchen',
        'refrigerator': 'refrigerator',
        'fridge': 'refrigerator',
        'dishes and silverware': 'kitchen',
        'cooking basics': 'kitchen',
        'oven': 'kitchen',
        'stove': 'kitchen',
        'kitchenette': 'kitchen',
        'toaster': 'kitchen',
        'freezer': 'refrigerator',

        // Entertainment
        'tv': 'music',
        'cable tv': 'music',
        'smart tv': 'music',
        'netflix': 'music',
        'sound system': 'music',

        // Parking & Accessibility
        'free parking on premises': 'parking',
        'paid parking on premises': 'parking',
        'paid parking off premises': 'parking',
        'free street parking': 'parking',
        'garage': 'parking',
        'parking': 'parking',
        'elevator': 'schedule',
        'wheelchair accessible': 'schedule',
        'step-free access': 'schedule',
        'wide doorway': 'schedule',
        'well-lit path to entrance': 'schedule',
        'disabled parking spot': 'schedule',
        'accessible-height bed': 'schedule',
        'accessible-height toilet': 'schedule',

        // Safety
        'smoke detector': 'smokeAlarm',
        'smoke alarm': 'smokeAlarm',
        'smoke alarm installed': 'smokeAlarm',
        'smoke detector installed': 'smokeAlarm',
        'carbon monoxide detector': 'coAlarm',
        'carbon monoxide alarm': 'coAlarm',
        'co alarm installed': 'coAlarm',
        'co detector installed': 'coAlarm',
        'fire extinguisher': 'schedule',
        'first aid kit': 'schedule',
        'safety card': 'schedule',

        // Outdoor & Scenic
        'balcony': 'balcony',
        'patio or balcony': 'balcony',
        'patio': 'balcony',
        'terrace': 'balcony',
        'pool': 'pool',
        'waterfront': 'mapmarker',
        'beachfront': 'mapmarker',
        'lake view': 'cityview',
        'city view': 'cityview',
        'garden view': 'nature',
        'mountain view': 'nature',

        // Family & Stays
        'family/kid friendly': 'briefcase',
        'crib': 'briefcase',
        'luggage dropoff allowed': 'briefcase',
        'long term stays allowed': 'briefcase',
        'long-term stays allowed': 'briefcase',

        // Workspace
        'workspace': 'workspace',
        'desk': 'workspace',
        'laptop friendly workspace': 'workspace',
        'dedicated workspace': 'workspace',

        // Check-in & Access
        '24-hour check-in': 'key',
        'self check-in': 'key',
        'lockbox': 'key',
        'private entrance': 'mapmarker',
        'doorman': 'key',
        'host greets you': 'lively',
        'smart lock': 'key',

        // Misc comfort
        'gym': 'lively',
        'hot tub': 'teacup',
        'sauna': 'teacup',

        // Missing alarms
        'no smoke alarm': 'noSmoke',
        'no carbon monoxide alarm': 'noCo',

        // Fallback for unknown
        'translation missing: en.hosting_amenity_49': 'showall',
        'translation missing: en.hosting_amenity_50': 'showall',
    }

    const normalized = amenities.map(a => a.toLowerCase().trim())

    const hasSmoke = normalized.some(a =>
        a.includes('smoke alarm') || a.includes('smoke detector')
    )

    const hasCO = normalized.some(a =>
        a.includes('carbon monoxide detector') || a.includes('carbon monoxide alarm') || a.includes('co alarm') || a.includes('co detector')
    )

    const filtered = normalized.filter(a => {
        if (hasSmoke && a.includes('no smoke alarm')) return false
        if (hasCO && a.includes('no carbon monoxide alarm')) return false
        return true
    })

    const unique = [...new Set(filtered)]

    const previewAmenities = unique.slice(0, 8)
    const hasExtra = unique.length > 8

    const normalize = str => str.toLowerCase().trim()

    const renderAmenity = (amenity, idx) => {
        const normalized = normalize(amenity)
        const iconName = AMENITY_ICON_MAP[normalized] || 'showall'
        return (
            <li key={idx} className="amenity-item">
                <SvgIcon iconName={iconName} className="amenity-icon" size={22} />
                <span className="amenity-label">{amenity}</span>
            </li>
        )
    }

    return (
        <section className="stay-amenities">
            <h2>What this place offers</h2>

            <ul className="amenities-grid">
                {previewAmenities.map(renderAmenity)}
            </ul>

            {hasExtra && (
                <button className="show-all-btn" onClick={() => setIsModalOpen(true)}>
                    Show all amenities
                </button>
            )}

            {isModalOpen && (
                <AmenitiesModal
                    amenities={[...unique]}
                    onClose={() => setIsModalOpen(false)}
                    AMENITY_ICON_MAP={AMENITY_ICON_MAP}
                />
            )}
        </section>

    )
}

export default AmenitiesList

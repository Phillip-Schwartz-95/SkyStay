import React from 'react'

export const AMENITY_KEYS = [
    'wifi',
    'kitchen',
    'washer',
    'dryer',
    'ac',
    'heating',
    'workspace',
    'tv',
    'hair_dryer',
    'iron',
    'pool',
    'hot_tub',
    'free_parking',
    'ev_charger',
    'crib',
    'grill',
    'breakfast',
    'indoor_fireplace',
    'private_entrance',
    'pets',
    'smoke_alarm',
    'co_alarm',
    'first_aid',
    'fire_extinguisher',
    'beach_access',
    'waterfront',
    'lake_view',
    'mountain_view',
    'garden_view',
    'piano',
    'gym',
    'sauna',
    'self_check_in',
    'free_cancellation'
]

export function AmenityIcon({ name, size = 40, color = '#000', strokeWidth = 1.5 }) {
    const Comp = AMENITY_SVGS[name]
    if (!Comp) return null
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            role="img"
            focusable="false"
        >
            <Comp />
        </svg>
    )
}

export const AMENITY_SVGS = {
    wifi: () => (
        <>
            <path d="M2 8.5c6.5-6 13.5-6 20 0" />
            <path d="M5 11.5c4.5-4.2 9.5-4.2 14 0" />
            <path d="M8 14.5c2.5-2.4 5.5-2.4 8 0" />
            <circle cx="12" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
        </>
    ),
    kitchen: () => (
        <>
            <rect x="4" y="3" width="16" height="6" rx="1" />
            <rect x="4" y="11" width="16" height="10" rx="1" />
            <path d="M8 3v18M16 3v18" />
        </>
    ),
    washer: () => (
        <>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <circle cx="12" cy="13" r="4.5" />
            <path d="M8 6h2M12 6h2" />
        </>
    ),
    dryer: () => (
        <>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <circle cx="12" cy="13" r="4.5" />
            <path d="M9 11c1.2 1.5 3.8 1.5 6 0" />
        </>
    ),
    ac: () => (
        <>
            <rect x="3" y="5" width="18" height="6" rx="1" />
            <path d="M6 17c0-1.5 1-2 2.5-2S11 16 11 17s-1 2-1 3M13 17c0-1.5 1-2 2.5-2S18 16 18 17s-1 2-1 3" />
        </>
    ),
    heating: () => (
        <>
            <path d="M7 18c0-3 3-3 3-6s-3-3-3-6M14 18c0-3 3-3 3-6s-3-3-3-6" />
        </>
    ),
    workspace: () => (
        <>
            <rect x="3" y="7" width="18" height="6" rx="1" />
            <path d="M7 13v4M17 13v4M3 17h18" />
        </>
    ),
    tv: () => (
        <>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M8 3l4 3 4-3" />
        </>
    ),
    hair_dryer: () => (
        <>
            <path d="M5 10h8a4 4 0 0 0 0-8H5z" />
            <rect x="5" y="4" width="6" height="4" rx="1" />
            <path d="M13 8l4 4M17 12l-2 2" />
        </>
    ),
    iron: () => (
        <>
            <path d="M4 15c0-4 4-6 9-6h3a4 4 0 0 1 4 4v2z" />
            <path d="M4 15v2h16" />
        </>
    ),
    pool: () => (
        <>
            <path d="M4 17c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
            <path d="M4 13c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
        </>
    ),
    hot_tub: () => (
        <>
            <rect x="3" y="11" width="18" height="6" rx="2" />
            <path d="M7 9c0-2 2-2 2-4M12 9c0-2 2-2 2-4M17 9c0-2 2-2 2-4" />
        </>
    ),
    free_parking: () => (
        <>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 17V7h5a3 3 0 0 1 0 6H8" />
        </>
    ),
    ev_charger: () => (
        <>
            <rect x="6" y="3" width="8" height="14" rx="2" />
            <path d="M10 17v4M8 21h4" />
            <path d="M16 7l3 3M19 7l-3 3" />
        </>
    ),
    crib: () => (
        <>
            <rect x="4" y="8" width="16" height="8" rx="1" />
            <path d="M6 16V8M10 16V8M14 16V8M18 16V8" />
        </>
    ),
    grill: () => (
        <>
            <circle cx="12" cy="9" r="5" />
            <path d="M7 12h10M10 14l-2 6M14 14l2 6" />
        </>
    ),
    breakfast: () => (
        <>
            <rect x="3" y="12" width="14" height="6" rx="2" />
            <path d="M17 14h2a2 2 0 0 1 0 4h-2z" />
            <path d="M7 12V8a3 3 0 0 1 6 0v4" />
        </>
    ),
    indoor_fireplace: () => (
        <>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M12 17c3-2 0-4-1-6 3 1 5 4 3 6-1 1-2 1-2 0z" />
        </>
    ),
    private_entrance: () => (
        <>
            <rect x="6" y="3" width="12" height="18" rx="2" />
            <path d="M12 13v2M9 21h6" />
        </>
    ),
    pets: () => (
        <>
            <circle cx="7" cy="10" r="2" />
            <circle cx="17" cy="10" r="2" />
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <path d="M7 14c3 2 7 2 10 0" />
        </>
    ),
    smoke_alarm: () => (
        <>
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <path d="M6 9h12" />
        </>
    ),
    co_alarm: () => (
        <>
            <rect x="5" y="7" width="14" height="10" rx="2" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
        </>
    ),
    first_aid: () => (
        <>
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M12 9v6M9 12h6" />
        </>
    ),
    fire_extinguisher: () => (
        <>
            <rect x="9" y="7" width="6" height="12" rx="2" />
            <path d="M9 9h-2a2 2 0 0 1 0-4h2" />
            <path d="M12 7V5l5-2" />
        </>
    ),
    beach_access: () => (
        <>
            <path d="M3 21c4-6 10-10 18-12" />
            <path d="M9 8l6 6" />
            <circle cx="18" cy="6" r="2.5" />
        </>
    ),
    waterfront: () => (
        <>
            <path d="M3 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
            <path d="M6 6h12v6H6z" />
        </>
    ),
    lake_view: () => (
        <>
            <path d="M3 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
            <circle cx="8" cy="10" r="2" />
            <circle cx="16" cy="10" r="2" />
            <path d="M6 10c2-2 10-2 12 0" />
        </>
    ),
    mountain_view: () => (
        <>
            <path d="M3 18l6-8 3 4 3-4 6 8z" />
            <path d="M3 18h18" />
        </>
    ),
    garden_view: () => (
        <>
            <path d="M6 18c0-5 4-8 6-12 2 4 6 7 6 12" />
            <path d="M3 18h18" />
        </>
    ),
    piano: () => (
        <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M8 19v-6M12 19v-6M16 19v-6" />
        </>
    ),
    gym: () => (
        <>
            <rect x="3" y="10" width="4" height="4" rx="1" />
            <rect x="17" y="10" width="4" height="4" rx="1" />
            <rect x="8" y="11" width="8" height="2" rx="1" />
        </>
    ),
    sauna: () => (
        <>
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M8 10c0-2 2-2 2-4M14 10c0-2 2-2 2-4" />
            <path d="M6 16h12" />
        </>
    ),
    self_check_in: () => (
        <>
            <rect x="6" y="3" width="10" height="18" rx="2" />
            <path d="M12 13v2M9 21h10" />
            <rect x="17" y="7" width="3" height="6" rx="0.5" />
        </>
    ),
    free_cancellation: () => (
        <>
            <path d="M12 4a8 8 0 1 0 7.75 6" />
            <path d="M12 4v4" />
            <path d="M9 12l2.2 2.2L16 9.5" />
        </>
    )
}

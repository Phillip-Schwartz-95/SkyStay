// src/cmps/PlaceTypeIcons.jsx
import React from 'react'

export const PLACE_TYPE_OPTIONS = [
    { id: 'apartment', label: 'Apartment', icon: 'apartment' },
    { id: 'house', label: 'House', icon: 'house' },
    { id: 'cabin', label: 'Cabin', icon: 'cabin' },
    { id: 'tinyhome', label: 'Tiny home', icon: 'tinyhome' },
    { id: 'villa', label: 'Villa', icon: 'villa' },
    { id: 'cottage', label: 'Cottage', icon: 'cottage' },
    { id: 'loft', label: 'Loft', icon: 'loft' },
    { id: 'bungalow', label: 'Bungalow', icon: 'bungalow' },
    { id: 'chalet', label: 'Chalet', icon: 'chalet' },
    { id: 'farm', label: 'Farm stay', icon: 'farm' },
    { id: 'barn', label: 'Barn', icon: 'barn' },
    { id: 'dome', label: 'Dome', icon: 'dome' },
    { id: 'treehouse', label: 'Treehouse', icon: 'treehouse' },
    { id: 'boat', label: 'Boat', icon: 'boat' },
    { id: 'rv', label: 'Camper/RV', icon: 'rv' },
    { id: 'tent', label: 'Tent', icon: 'tent' },
    { id: 'yurt', label: 'Yurt', icon: 'yurt' }
]

export default function PlaceTypeIcon({ name, size = 28, className, ...rest }) {
    const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className, ...rest }
    const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }

    const icons = {
        apartment: (
            <svg {...p}>
                <rect x="5" y="3" width="14" height="18" rx="2" {...stroke} />
                <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" {...stroke} />
            </svg>
        ),
        house: (
            <svg {...p}>
                <path d="M3 10.5 12 4l9 6.5" {...stroke} />
                <path d="M6 10.5V20h12v-9.5" {...stroke} />
                <path d="M10 20v-5h4v5" {...stroke} />
            </svg>
        ),
        cabin: (
            <svg {...p}>
                <path d="M3 12l9-7 9 7" {...stroke} />
                <path d="M5 12v8h14v-8" {...stroke} />
                <path d="M8 20v-4h4v4" {...stroke} />
                <path d="M7 9h10" {...stroke} />
            </svg>
        ),
        tinyhome: (
            <svg {...p}>
                <path d="M4 12l8-6 8 6" {...stroke} />
                <path d="M6 12v7h12v-7" {...stroke} />
                <rect x="8.5" y="14" width="3" height="5" rx="0.5" {...stroke} />
            </svg>
        ),
        villa: (
            <svg {...p}>
                <path d="M2.5 12.5l9.5-8 9.5 8" {...stroke} />
                <path d="M5 12.5V21h14v-8.5" {...stroke} />
                <path d="M8 21v-5h8v5" {...stroke} />
                <path d="M7 10h10" {...stroke} />
                <path d="M12 6.5v-2" {...stroke} />
            </svg>
        ),
        cottage: (
            <svg {...p}>
                <path d="M3 13l9-7 9 7" {...stroke} />
                <path d="M6 13v7h12v-7" {...stroke} />
                <path d="M9 20v-4h6v4" {...stroke} />
                <path d="M4.5 12h15" {...stroke} />
            </svg>
        ),
        loft: (
            <svg {...p}>
                <rect x="4" y="5" width="16" height="14" rx="2" {...stroke} />
                <path d="M8 5v14M16 5v14" {...stroke} />
                <path d="M8 10h8" {...stroke} />
            </svg>
        ),
        bungalow: (
            <svg {...p}>
                <path d="M2.5 12l9.5-6 9.5 6" {...stroke} />
                <path d="M5 12v8h14v-8" {...stroke} />
                <path d="M9 20v-3h6v3" {...stroke} />
            </svg>
        ),
        chalet: (
            <svg {...p}>
                <path d="M2.5 11.5 12 4l9.5 7.5" {...stroke} />
                <path d="M5 11.5v8.5h14v-8.5" {...stroke} />
                <path d="M7 9h10M9 20v-4h6v4" {...stroke} />
                <path d="M7 14h2M15 14h2" {...stroke} />
            </svg>
        ),
        farm: (
            <svg {...p}>
                <circle cx="6.5" cy="16" r="2.5" {...stroke} />
                <path d="M3 19h7" {...stroke} />
                <path d="M13 20V11l4-3 4 3v9" {...stroke} />
                <path d="M13 16h8" {...stroke} />
            </svg>
        ),
        barn: (
            <svg {...p}>
                <path d="M4 20V11l8-6 8 6v9" {...stroke} />
                <path d="M8 20v-5h8v5" {...stroke} />
                <path d="M9 11h6M9 14h6" {...stroke} />
            </svg>
        ),
        dome: (
            <svg {...p}>
                <path d="M4 18a8 8 0 0 1 16 0" {...stroke} />
                <path d="M3 18h18" {...stroke} />
                <path d="M9 18a3 3 0 1 1 6 0" {...stroke} />
            </svg>
        ),
        treehouse: (
            <svg {...p}>
                <path d="M7 10l5-4 5 4v5H7z" {...stroke} />
                <path d="M12 6V3" {...stroke} />
                <path d="M6 15v5M18 15v5" {...stroke} />
                <path d="M6 18h12" {...stroke} />
            </svg>
        ),
        boat: (
            <svg {...p}>
                <path d="M4 13l8-4 8 4" {...stroke} />
                <path d="M3 16s3 3 9 3 9-3 9-3" {...stroke} />
                <path d="M12 9V4" {...stroke} />
            </svg>
        ),
        rv: (
            <svg {...p}>
                <rect x="3" y="8" width="16" height="8" rx="2" {...stroke} />
                <path d="M19 10h2v4h-2" {...stroke} />
                <circle cx="8" cy="18" r="2" {...stroke} />
                <circle cx="16" cy="18" r="2" {...stroke} />
                <path d="M6 10h5v3H6z" {...stroke} />
            </svg>
        ),
        tent: (
            <svg {...p}>
                <path d="M3 20l9-16 9 16" {...stroke} />
                <path d="M12 8l7 12" {...stroke} />
                <path d="M5 20h14" {...stroke} />
            </svg>
        ),
        yurt: (
            <svg {...p}>
                <ellipse cx="12" cy="10" rx="7" ry="3.5" {...stroke} />
                <path d="M5 10v7h14v-7" {...stroke} />
                <path d="M10 17v-3h4v3" {...stroke} />
            </svg>
        )
    }

    return icons[name] || null
}

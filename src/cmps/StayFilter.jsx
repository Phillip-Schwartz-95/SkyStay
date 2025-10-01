import { useState, useEffect } from 'react'

export function StayFilter({ filterBy, setFilterBy }) {
    const [draft, setDraft] = useState(structuredClone(filterBy || {}))

    useEffect(() => {
        setFilterBy?.(draft)
    }, [draft])

    function onChange(field, value) {
        setDraft(prev => ({ ...prev, [field]: value }))
    }

    return (
        <section className="search-pill">
            <div className="pill-section where">
                <label className="label">Where</label>
                <input
                    className="placeholder-input"
                    type="text"
                    placeholder="Search destinations"
                    value={draft.txt || ''}
                    onChange={ev => onChange('txt', ev.target.value)}
                />
            </div>

            <div className="pill-divider" />

            <div className="pill-section checkin">
                <label className="label">Check in</label>
                <button className="placeholder-btn" type="button">Add dates</button>
            </div>

            <div className="pill-divider" />

            <div className="pill-section checkout">
                <label className="label">Check out</label>
                <button className="placeholder-btn" type="button">Add dates</button>
            </div>

            <div className="pill-divider" />

            <div className="pill-section who">
                <label className="label">Who</label>
                <button className="placeholder-btn" type="button">Add guests</button>
            </div>

            <button className="search-btn" aria-label="Search">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M10.5 3a7.5 7.5 0 1 1 0 15c-1.83 0-3.51-.64-4.82-1.71l-3.49 3.49a1 1 0 1 1-1.41-1.41l3.49-3.49A7.46 7.46 0 0 1 3 10.5 7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11Z" />
                </svg>
            </button>
        </section>
    )
}

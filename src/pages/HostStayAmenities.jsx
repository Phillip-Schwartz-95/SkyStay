import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AmenityIcon, AMENITY_KEYS } from '../cmps/AmenityIcons.jsx'
import '../assets/styles/cmps/hostnew.css'

const BOOKING_OPTIONS = [
    { key: 'selfCheckIn', label: 'Self check-in', icon: 'self_check_in' },
    { key: 'freeCancellation', label: 'Free cancellation', icon: 'free_cancellation' }
]

const AMENITIES = AMENITY_KEYS.map(k => ({ key: k, label: k.replace(/_/g, ' ') }))

export function HostStayAmenities() {
    const navigate = useNavigate()
    const { state } = useLocation()
    const draft = useMemo(() => state?.draft || {}, [state])

    const [options, setOptions] = useState(() => ({
        selfCheckIn: !!draft.selfCheckIn,
        freeCancellation: !!draft.freeCancellation
    }))

    const [selected, setSelected] = useState(() => {
        const prev = Array.isArray(draft.amenities) ? draft.amenities : []
        const known = new Set(AMENITY_KEYS)
        return prev.filter(k => known.has(k))
    })

    function toggleOption(key) {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }))
    }

    function toggleAmenity(key) {
        setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
    }

    function onBack() {
        navigate(-1, { state: { draft: { ...draft, ...options, amenities: selected } } })
    }

    function onNext() {
        navigate('/host/new/step-5', {
            state: {
                draft: {
                    ...draft,
                    ...options,
                    amenities: selected
                }
            }
        })
    }

    return (
        <div className="hostnew-root" style={{ minHeight: '100vh' }}>
            <main
                className="hostnew-main"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}
            >
                <div className="hostnew-stage" style={{ width: '100%', maxWidth: 980 }}>
                    <h1 style={{ marginBottom: 8, color: '#000', textAlign: 'center', fontSize: '2rem' }}>
                        What amenities do you offer?
                    </h1>
                    <p style={{ textAlign: 'center', margin: '0 0 24px', color: '#000' }}>
                        Choose booking options and amenities guests can expect.
                    </p>

                    <section style={{ margin: '0 auto 24px', width: '100%' }}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
                                gap: 12,
                                maxWidth: 560,
                                margin: '0 auto',
                                alignItems: 'stretch',
                                justifyItems: 'stretch'
                            }}
                        >
                            {BOOKING_OPTIONS.map(opt => {
                                const active = !!options[opt.key]
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => toggleOption(opt.key)}
                                        className="hostnew-tile"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: 18,
                                            borderRadius: 16,
                                            border: active ? '2px solid #000' : '1px solid rgba(0,0,0,.12)',
                                            background: '#fff',
                                            color: '#000',
                                            cursor: 'pointer',
                                            minHeight: 120
                                        }}
                                        aria-pressed={active}
                                    >
                                        <AmenityIcon name={opt.icon} size={36} color="#000" />
                                        <div style={{ fontWeight: 700, textAlign: 'center' }}>{opt.label}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section style={{ margin: '0 auto', maxWidth: 920 }}>
                        <h2 style={{ margin: '6px 0 12px', color: '#000', fontSize: '1.25rem', textAlign: 'center' }}>Amenities</h2>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                gap: 14,
                                justifyItems: 'center'
                            }}
                        >
                            {AMENITIES.map(a => {
                                const active = selected.includes(a.key)
                                return (
                                    <button
                                        key={a.key}
                                        type="button"
                                        onClick={() => toggleAmenity(a.key)}
                                        className="hostnew-tile"
                                        style={{
                                            width: '100%',
                                            maxWidth: 260,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 10,
                                            padding: 20,
                                            borderRadius: 16,
                                            border: active ? '2px solid #000' : '1px solid rgba(0,0,0,.12)',
                                            background: '#fff',
                                            color: '#000',
                                            cursor: 'pointer',
                                            minHeight: 150,
                                            textAlign: 'center'
                                        }}
                                        aria-pressed={active}
                                    >
                                        <AmenityIcon name={a.key} size={40} color="#000" />
                                        <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{a.label}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                </div>
            </main>

            <div className="hostnew-bottombar">
                <div className="hostnew-progress" />
                <div className="hostnew-actions">
                    <button className="hostnew-btn hostnew-btn-ghost" onClick={onBack}>Back</button>
                    <button className="hostnew-btn hostnew-btn-primary" onClick={onNext}>Next</button>
                </div>
            </div>
        </div>
    )
}

export default HostStayAmenities

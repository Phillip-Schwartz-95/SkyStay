import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/styles/cmps/hostnew.css'

export function HostStayCapacityRules() {
    const navigate = useNavigate()
    const { state } = useLocation()
    const draft = useMemo(() => state?.draft || {}, [state])

    const [maxGuests, setMaxGuests] = useState(Number(draft.maxGuests) || 1)
    const [bedrooms, setBedrooms] = useState(Number(draft.bedrooms) || 1)
    const [beds, setBeds] = useState(Number(draft.beds) || 1)
    const [bathrooms, setBathrooms] = useState(Number(draft.bathrooms) || 1)

    const [petsAllowed, setPetsAllowed] = useState(!!draft.petsAllowed)
    const [smokingAllowed, setSmokingAllowed] = useState(!!draft.smokingAllowed)
    const [partiesAllowed, setPartiesAllowed] = useState(!!draft.partiesAllowed)
    const [quietHoursStart, setQuietHoursStart] = useState(draft.quietHoursStart || '')
    const [quietHoursEnd, setQuietHoursEnd] = useState(draft.quietHoursEnd || '')
    const [additionalRules, setAdditionalRules] = useState(draft.additionalRules || '')

    function clamp(n, min = 0, max = 100) {
        const v = Number(n)
        if (Number.isNaN(v)) return min
        return Math.max(min, Math.min(max, v))
    }

    function buildHouseRules() {
        const rules = []
        if (petsAllowed) rules.push('Pets allowed')
        if (smokingAllowed) rules.push('Smoking allowed')
        if (partiesAllowed) rules.push('Parties/events allowed')
        if (quietHoursStart && quietHoursEnd) rules.push(`Quiet hours ${quietHoursStart}–${quietHoursEnd}`)
        else if (quietHoursStart) rules.push(`Quiet hours start ${quietHoursStart}`)
        else if (quietHoursEnd) rules.push(`Quiet hours end ${quietHoursEnd}`)
        if (additionalRules && additionalRules.trim()) rules.push(additionalRules.trim())
        return rules
    }

    function buildSafety() {
        const a = Array.isArray(draft.amenities) ? draft.amenities : []
        const safety = []
        if (a.includes('smoke_alarm')) safety.push('Smoke alarm')
        if (a.includes('co_alarm')) safety.push('Carbon monoxide alarm')
        if (a.includes('fire_extinguisher')) safety.push('Fire extinguisher')
        return safety
    }

    function buildCancellationPolicy() {
        if (draft.freeCancellation) return 'Flexible'
        return 'Firm'
    }

    function withThingsToKnow(extra = {}) {
        return {
            ...draft,
            maxGuests,
            bedrooms,
            beds,
            bathrooms,
            petsAllowed,
            smokingAllowed,
            partiesAllowed,
            quietHoursStart,
            quietHoursEnd,
            additionalRules,
            houseRules: buildHouseRules(),
            safety: buildSafety(),
            cancellationPolicy: buildCancellationPolicy(),
            ...extra
        }
    }

    function onBack() {
        navigate(-1, { state: { draft: withThingsToKnow() } })
    }

    function onNext() {
        navigate('/host/new/step-6', { state: { draft: withThingsToKnow() } })
    }

    return (
        <div className="hostnew-root" style={{ minHeight: '100vh' }}>
            <main className="hostnew-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                <div className="hostnew-stage" style={{ width: '100%', maxWidth: 900 }}>
                    <h1 style={{ marginBottom: 8, color: '#000', textAlign: 'center', fontSize: '2rem' }}>
                        Capacity and house rules
                    </h1>
                    <p style={{ textAlign: 'center', margin: '0 0 24px', color: '#000' }}>
                        Tell guests how many people can stay and what rules apply.
                    </p>

                    <section style={{ marginBottom: 28 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                            <Counter label="Guests" value={maxGuests} onChange={v => setMaxGuests(clamp(v, 1, 50))} min={1} max={50} />
                            <Counter label="Bedrooms" value={bedrooms} onChange={v => setBedrooms(clamp(v, 0, 50))} min={0} max={50} />
                            <Counter label="Beds" value={beds} onChange={v => setBeds(clamp(v, 0, 100))} min={0} max={100} />
                            <Counter label="Bathrooms" value={bathrooms} onChange={v => setBathrooms(clamp(v, 0, 50))} min={0} max={50} />
                        </div>
                    </section>

                    <section>
                        <h2 style={{ margin: '0 0 14px', color: '#000', textAlign: 'center', fontSize: '1.25rem' }}>House rules</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                            <ToggleCard label="Pets allowed" active={petsAllowed} onToggle={() => setPetsAllowed(v => !v)} icon={
                                <svg viewBox="0 0 32 32" width="28" height="28"><path fill="currentColor" d="M6.5 14a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm7-2a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm5 0a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm7 2a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zM16 17c6 0 10 3.5 10 8 0 2-1.5 3-3 3H9c-1.5 0-3-1-3-3 0-4.5 4-8 10-8z" /></svg>
                            } />
                            <ToggleCard label="Smoking allowed" active={smokingAllowed} onToggle={() => setSmokingAllowed(v => !v)} icon={
                                <svg viewBox="0 0 32 32" width="28" height="28"><path fill="currentColor" d="M3 23h18v2H3v-2zm20 0h2v2h-2v-2zm3 0h3v2h-3v-2zM23 7a3 3 0 0 1 2.12.88A3 3 0 0 1 27 10v2h-2v-2a1 1 0 0 0-1-1h-1a3 3 0 0 1 0-6h1v2h-1a1 1 0 1 0 0 2z" /></svg>
                            } />
                            <ToggleCard label="Parties allowed" active={partiesAllowed} onToggle={() => setPartiesAllowed(v => !v)} icon={
                                <svg viewBox="0 0 32 32" width="28" height="28"><path fill="currentColor" d="M4 28l10-4 10 4-10-18L4 28zm18-17a2 2 0 1 1 2-3.464A2 2 0 0 1 22 11zM27 6a1 1 0 1 1 2-1 1 1 0 0 1-2 1zM19 4a1 1 0 1 1 2-1 1 1 0 0 1-2 1z" /></svg>
                            } />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 16 }}>
                            <div className="hostnew-tile" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: 16 }}>
                                <div style={{ fontWeight: 700, marginBottom: 8, color: '#000' }}>Quiet hours start</div>
                                <input
                                    type="time"
                                    value={quietHoursStart}
                                    onChange={e => setQuietHoursStart(e.target.value)}
                                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,.2)' }}
                                />
                            </div>
                            <div className="hostnew-tile" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: 16 }}>
                                <div style={{ fontWeight: 700, marginBottom: 8, color: '#000' }}>Quiet hours end</div>
                                <input
                                    type="time"
                                    value={quietHoursEnd}
                                    onChange={e => setQuietHoursEnd(e.target.value)}
                                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,.2)' }}
                                />
                            </div>
                        </div>

                        <div className="hostnew-tile" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: 16, marginTop: 14 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8, color: '#000' }}>Additional rules</div>
                            <textarea
                                value={additionalRules}
                                onChange={e => setAdditionalRules(e.target.value)}
                                rows={5}
                                placeholder="Add any extra details guests should know"
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,.2)', resize: 'vertical' }}
                            />
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

function Counter({ label, value, onChange, min = 0, max = 100 }) {
    const btnStyle = {
        width: 36,
        height: 36,
        borderRadius: 999,
        border: '1px solid rgba(0,0,0,.2)',
        background: '#fff',
        color: '#000',
        fontWeight: 700,
        fontSize: 18,
        lineHeight: '18px'
    }

    return (
        <div
            className="hostnew-tile"
            style={{
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,.12)',
                background: '#fff',
                color: '#000',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                minHeight: 96
            }}
        >
            <div style={{ fontWeight: 700 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                    type="button"
                    className="hostnew-btn"
                    style={btnStyle}
                    onClick={() => onChange(Math.max(min, value - 1))}
                    disabled={value <= min}
                >
                    −
                </button>
                <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, color: '#000' }}>{value}</div>
                <button
                    type="button"
                    className="hostnew-btn"
                    style={btnStyle}
                    onClick={() => onChange(Math.min(max, value + 1))}
                    disabled={value >= max}
                >
                    +
                </button>
            </div>
        </div>
    )
}

function ToggleCard({ label, active, onToggle, icon }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="hostnew-tile"
            aria-pressed={active}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: 18,
                borderRadius: 16,
                border: active ? '2px solid #000' : '1px solid rgba(0,0,0,.12)',
                background: '#fff',
                color: '#000',
                cursor: 'pointer',
                minHeight: 96,
                width: '100%'
            }}
        >
            {icon ? <span aria-hidden="true">{icon}</span> : null}
            <div style={{ fontWeight: 700 }}>{label}</div>
        </button>
    )
}

export default HostStayCapacityRules

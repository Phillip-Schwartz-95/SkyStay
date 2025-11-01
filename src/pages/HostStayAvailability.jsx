import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/styles/cmps/hostnew.css'

function isValidRange(from, to) {
    if (!from || !to) return false
    return new Date(from) <= new Date(to)
}

export function HostStayAvailability() {
    const navigate = useNavigate()
    const { state } = useLocation()
    const draft = useMemo(() => state?.draft || {}, [state])

    const [allDatesAvailable, setAllDatesAvailable] = useState(Boolean(draft.allDatesAvailable))
    const [availableFrom, setAvailableFrom] = useState(draft.availableFrom || '')
    const [availableTo, setAvailableTo] = useState(draft.availableTo || '')
    const [checkInTime, setCheckInTime] = useState(draft.checkInTime || '')
    const [checkOutTime, setCheckOutTime] = useState(draft.checkOutTime || '')

    const validWindow = isValidRange(availableFrom, availableTo)

    function onBack() {
        navigate(-1)
    }

    function onNext() {
        if (!allDatesAvailable && !validWindow) return
        const payload = allDatesAvailable
            ? { allDatesAvailable: true, availableFrom: '', availableTo: '' }
            : { allDatesAvailable: false, availableFrom, availableTo }
        navigate('/host/new/step-4', {
            state: {
                draft: {
                    ...draft,
                    ...payload,
                    checkInTime,
                    checkOutTime
                }
            }
        })
    }

    return (
        <div className="hostnew-root" style={{ minHeight: '100vh' }}>
            <main className="hostnew-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                <div className="hostnew-stage" style={{ width: '100%', maxWidth: 720 }}>
                    <h1 style={{ marginBottom: 8, color: '#000', textAlign: 'center', fontSize: '2rem' }}>
                        When is your place available?
                    </h1>
                    <p style={{ textAlign: 'center', margin: '0 0 24px', color: '#000' }}>
                        Choose an availability window, or mark all dates as available.
                    </p>

                    <div style={{ display: 'grid', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#000' }}>
                            <input
                                type="checkbox"
                                checked={allDatesAvailable}
                                onChange={(e) => setAllDatesAvailable(e.target.checked)}
                            />
                            All dates available
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, opacity: allDatesAvailable ? 0.5 : 1 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: '#000', marginBottom: 6 }}>Available from</label>
                                <input
                                    type="date"
                                    className="hostloc-search"
                                    value={availableFrom}
                                    onChange={(e) => setAvailableFrom(e.target.value)}
                                    disabled={allDatesAvailable}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: '#000', marginBottom: 6 }}>Available until</label>
                                <input
                                    type="date"
                                    className="hostloc-search"
                                    value={availableTo}
                                    min={availableFrom || undefined}
                                    onChange={(e) => setAvailableTo(e.target.value)}
                                    disabled={allDatesAvailable}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="hostnew-tile" style={{ border: '1px solid rgba(0,0,0,.12)', borderRadius: 12, padding: 16, background: '#fff' }}>
                                <div style={{ fontWeight: 700, marginBottom: 6, color: '#000' }}>
                                    {checkInTime ? `Check-in before ${checkInTime}` : 'Check-in time'}
                                </div>
                                <input
                                    type="time"
                                    className="hostloc-search"
                                    value={checkInTime}
                                    onChange={(e) => setCheckInTime(e.target.value)}
                                />
                            </div>

                            <div className="hostnew-tile" style={{ border: '1px solid rgba(0,0,0,.12)', borderRadius: 12, padding: 16, background: '#fff' }}>
                                <div style={{ fontWeight: 700, marginBottom: 6, color: '#000' }}>
                                    {checkOutTime ? `Check-out before ${checkOutTime}` : 'Check-out time'}
                                </div>
                                <input
                                    type="time"
                                    className="hostloc-search"
                                    value={checkOutTime}
                                    onChange={(e) => setCheckOutTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {!allDatesAvailable && !validWindow && (
                            <div className="hostloc-error" style={{ textAlign: 'center' }}>
                                Select a valid date range to continue.
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <div className="hostnew-bottombar">
                <div className="hostnew-progress" />
                <div className="hostnew-actions">
                    <button className="hostnew-btn hostnew-btn-ghost" onClick={onBack}>Back</button>
                    <button
                        className="hostnew-btn hostnew-btn-primary"
                        onClick={onNext}
                        disabled={!allDatesAvailable && !validWindow}
                        aria-disabled={!allDatesAvailable && !validWindow}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}

export default HostStayAvailability

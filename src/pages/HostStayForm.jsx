import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import PlaceTypeIcon, { PLACE_TYPE_OPTIONS } from '../cmps/PlaceTypeIcons'
import '../assets/styles/cmps/hostnew.css'

export function HostStayForm() {
    const user = useSelector(s => s.userModule.user)
    const navigate = useNavigate()

    const [placeType, setPlaceType] = useState('')

    useEffect(() => {
        window.dispatchEvent(new Event('open-login-modal'))
    }, [user, navigate])

    function onBack() {
        navigate(-1)
    }

    function onNext() {
        if (!placeType) return
        navigate('/host/new/step-2', { state: { draft: { placeType } } })
    }

    return (
        <div className="hostnew-root" style={{ minHeight: '100vh' }}>
            <main className="hostnew-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                <div className="hostnew-stage" style={{ width: '100%', maxWidth: 960 }}>
                    <h1 style={{ marginBottom: 28, color: '#000', textAlign: 'center', fontSize: '2rem' }}>
                        Which of these best describes your place?
                    </h1>

                    <div
                        className="place-grid"
                        style={{
                            margin: '0 auto',
                            width: '100%',
                            maxWidth: 900,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 16,
                            alignItems: 'stretch',
                            justifyItems: 'center'
                        }}
                    >
                        {PLACE_TYPE_OPTIONS.map(opt => {
                            const selected = placeType === opt.id
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setPlaceType(opt.id)}
                                    aria-pressed={selected}
                                    className={`place-card${selected ? ' is-selected' : ''}`}
                                    style={{
                                        width: '100%',
                                        maxWidth: 280,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '24px 18px',
                                        borderRadius: 16,
                                        border: selected ? '2px solid #222' : '1px solid rgba(0,0,0,.12)',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        color: '#000',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div style={{ width: 84, height: 84, display: 'grid', placeItems: 'center' }}>
                                        <PlaceTypeIcon name={opt.icon} size={72} />
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{opt.label}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </main>

            <div className="hostnew-bottombar">
                <div className="hostnew-progress"></div>
                <div className="hostnew-actions">
                    <button className="hostnew-btn hostnew-btn-ghost" onClick={onBack}>Back</button>
                    <button
                        className="hostnew-btn hostnew-btn-primary"
                        onClick={onNext}
                        disabled={!placeType}
                        aria-disabled={!placeType}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}

export default HostStayForm

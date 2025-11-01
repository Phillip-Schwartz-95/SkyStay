import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { stayService } from '../services/stay'
import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { ImgUploader } from '../cmps/ImgUploader.jsx'
import '../assets/styles/cmps/hostnew.css'

export function HostStayPricingMedia() {
    const navigate = useNavigate()
    const { state } = useLocation()
    const draft = useMemo(() => state?.draft || {}, [state])
    const user = useSelector(s => s.userModule.user)

    const [price, setPrice] = useState(Number(draft.price) || 100)
    const [summary, setSummary] = useState(draft.summary || '')
    const [imgs, setImgs] = useState(Array.isArray(draft.imgs) ? draft.imgs : [])
    const [imgUrl, setImgUrl] = useState('')

    function onAddUrl() {
        const url = imgUrl.trim()
        if (!url) return
        setImgs(prev => [...prev, url])
        setImgUrl('')
    }

    function onUploaded({ secure_url }) {
        if (!secure_url) return
        setImgs(prev => [...prev, secure_url])
    }

    function onRemoveImg(idx) {
        setImgs(prev => prev.filter((_, i) => i !== idx))
    }

    function onBack() {
        navigate(-1, {
            state: {
                draft: {
                    ...draft,
                    price,
                    summary,
                    imgs
                }
            }
        })
    }

    async function onFinish() {
        try {
            if (!user) {
                showErrorMsg('Please log in to publish a listing')
                navigate('/auth/login')
                return
            }
            const placeType = draft.placeType || 'Apartment'
            const city = draft.city || ''
            const country = draft.country || ''
            const address = draft.address || ''
            const lat = draft.lat ?? null
            const lng = draft.lng ?? null

            const maxGuests = Number(draft.maxGuests) || 1
            const bedrooms = Number(draft.bedrooms) || 1
            const beds = Number(draft.beds) || 1
            const bathrooms = Number(draft.bathrooms) || 1

            const amenities = Array.isArray(draft.amenities) ? draft.amenities : []
            const booking = {
                selfCheckIn: !!draft.selfCheckIn,
                freeCancellation: !!draft.freeCancellation
            }

            const availability = {
                allDatesAvailable: !!draft.allDatesAvailable,
                blockedRanges: Array.isArray(draft.blockedRanges) ? draft.blockedRanges : []
            }

            const rules = {
                petsAllowed: !!draft.petsAllowed,
                smokingAllowed: !!draft.smokingAllowed,
                partiesAllowed: !!draft.partiesAllowed,
                quietHoursStart: draft.quietHoursStart || '',
                quietHoursEnd: draft.quietHoursEnd || '',
                additionalRules: draft.additionalRules || ''
            }

            const title = draft.title || `${placeType} in ${city || 'your city'}`
            const payload = {
                title,
                type: placeType,
                price: Number(price) || 0,
                summary: String(summary || '').slice(0, 1200),
                imgs: imgs.length ? imgs : ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
                maxGuests,
                bedRooms: bedrooms,
                beds,
                baths: bathrooms,
                amenities,
                booking,
                availability,
                houseRules: rules,
                loc: {
                    country,
                    city,
                    address,
                    lat,
                    lng
                },
                host: user
            }

            const saved = await stayService.save(payload)
            showSuccessMsg('Listing created')
            navigate('/hosting', { replace: true, state: { createdId: saved?._id } })
        } catch (err) {
            showErrorMsg('Could not create listing')
            console.error(err)
        }
    }

    return (
        <div className="hostnew-root" style={{ minHeight: '100vh' }}>
            <main className="hostnew-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                <div className="hostnew-stage" style={{ width: '100%', maxWidth: 900 }}>
                    <h1 style={{ marginBottom: 8, color: '#000', textAlign: 'center', fontSize: '2rem' }}>
                        Final details
                    </h1>
                    <p style={{ textAlign: 'center', margin: '0 0 24px', color: '#000' }}>
                        Set your nightly price, describe your place, and add photos.
                    </p>

                    <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                        <div className="hostnew-tile" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: 16 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8, color: '#000' }}>Price per night</div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontWeight: 700 }}>$</span>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,.2)' }}
                                />
                            </div>
                        </div>

                        <div className="hostnew-tile" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: 16 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8, color: '#000' }}>Description</div>
                            <textarea
                                rows={6}
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                placeholder="Describe what makes your place special"
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,.2)', resize: 'vertical', color: '#000' }}
                            />
                        </div>

                        <div className="hostnew-tile" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: 16 }}>
                            <div style={{ fontWeight: 700, marginBottom: 12, color: '#000' }}>Photos</div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 12 }}>
                                <input
                                    type="url"
                                    placeholder="Paste image URL"
                                    value={imgUrl}
                                    onChange={e => setImgUrl(e.target.value)}
                                    style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,.2)' }}
                                />
                                <button
                                    type="button"
                                    className="hostnew-btn"
                                    onClick={onAddUrl}
                                    style={{ borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(0,0,0,.2)', background: '#fff', color: '#000' }}
                                >
                                    Add URL
                                </button>
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <ImgUploader onUploaded={onUploaded} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                                {imgs.map((src, idx) => (
                                    <div key={idx} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,.1)' }}>
                                        <img src={src} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                                        <button
                                            type="button"
                                            onClick={() => onRemoveImg(idx)}
                                            style={{
                                                position: 'absolute',
                                                top: 6,
                                                right: 6,
                                                width: 28,
                                                height: 28,
                                                borderRadius: 999,
                                                border: '1px solid rgba(0,0,0,.2)',
                                                background: '#fff',
                                                color: '#000',
                                                fontWeight: 700,
                                                lineHeight: '26px',
                                                textAlign: 'center',
                                                cursor: 'pointer'
                                            }}
                                            aria-label="Remove image"
                                            title="Remove image"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <div className="hostnew-bottombar">
                <div className="hostnew-progress" />
                <div className="hostnew-actions">
                    <button className="hostnew-btn hostnew-btn-ghost" onClick={onBack}>Back</button>
                    <button className="hostnew-btn hostnew-btn-primary" onClick={onFinish}>Finish</button>
                </div>
            </div>
        </div>
    )
}

export default HostStayPricingMedia

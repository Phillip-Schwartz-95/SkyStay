import { useRef, useMemo } from 'react'
import { userService } from '../services/user'
import { StayPreview } from './StayPreview'

const CARD_W = 250
const GAP = 10

export function StayList({ stays = [], onRemoveStay, onUpdateStay }) {
    const rowRef = useRef(null)

    const hasStays = useMemo(() => Array.isArray(stays) && stays.length > 0, [stays])

    function shouldShowActionBtns(stay) {
        const user = userService.getLoggedinUser()
        if (!user) return false
        if (user.isAdmin) return true
        return stay?.host?._id === user._id
    }

    function scrollRow(dir) {
        const track = rowRef.current
        if (!track) return
        const visible = Math.max(1, Math.floor(track.clientWidth / (CARD_W + GAP)))
        const delta = (CARD_W + GAP) * visible * (dir === 'right' ? 1 : -1)
        track.scrollBy({ left: delta, behavior: 'smooth' })
    }

    if (!hasStays) {
        return (
            <section>
                <ul className="stay-list">
                    <li className="empty">No stays found</li>
                </ul>
            </section>
        )
    }

    return (
        <section className="recommendation-rows">
            <div className="recommendation-row">
                <div className="row-arrows">
                    <button type="button" className="row-arrow" aria-label="Previous" onClick={() => scrollRow('left')}>‹</button>
                    <button type="button" className="row-arrow" aria-label="Next" onClick={() => scrollRow('right')}>›</button>
                </div>

                <div className="stay-track" ref={rowRef}>
                    <ul className="stay-list row-list">
                        {stays.map((stay, idx) => (
                            <li key={(stay?._id || 'stay') + '-' + idx} className="stay-item">
                                <StayPreview stay={stay} />
                                {shouldShowActionBtns(stay) && (
                                    <div className="actions">
                                        {onUpdateStay && <button onClick={() => onUpdateStay(stay)}>Edit</button>}
                                        {onRemoveStay && <button onClick={() => onRemoveStay(stay._id)}>x</button>}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}

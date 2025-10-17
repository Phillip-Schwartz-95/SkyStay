import { useRef, useMemo, useEffect, useState } from 'react'
import { userService } from '../services/user'
import { StayPreview } from './StayPreview'

export function StayList({ stays = [], onRemoveStay, onUpdateStay }) {
    const rowRef = useRef(null)
    const [canScroll, setCanScroll] = useState({ any: false, left: false, right: false })

    const hasStays = useMemo(() => Array.isArray(stays) && stays.length > 0, [stays])

    function shouldShowActionBtns(stay) {
        const user = userService.getLoggedinUser()
        if (!user) return false
        if (user.isAdmin) return true
        return stay?.host?._id === user._id
    }

    function updateScrollState() {
        const el = rowRef.current
        if (!el) return
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
        setCanScroll({
            any: maxScroll > 0,
            left: el.scrollLeft > 0,
            right: el.scrollLeft < maxScroll - 1
        })
    }

    function scrollRow(dir) {
        const track = rowRef.current
        if (!track) return
        const delta = track.clientWidth * (dir === 'right' ? 1 : -1)
        track.scrollBy({ left: delta, behavior: 'smooth' })
    }

    useEffect(() => {
        updateScrollState()
        const el = rowRef.current
        let ro
        if ('ResizeObserver' in window && el) {
            ro = new ResizeObserver(updateScrollState)
            ro.observe(el)
        } else {
            const onResize = () => updateScrollState()
            window.addEventListener('resize', onResize)
            return () => window.removeEventListener('resize', onResize)
        }
        return () => { if (ro) ro.disconnect() }
    }, [stays])

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
                {canScroll.any && (
                    <div className="row-arrows">
                        <button
                            type="button"
                            className="row-arrow"
                            aria-label="Previous"
                            onClick={() => scrollRow('left')}
                            disabled={!canScroll.left}
                            style={{ visibility: canScroll.left ? 'visible' : 'hidden' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" className="arrow-svg left">
                                <path fill="none" d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28"></path>
                            </svg>
                        </button>
                        <button
                            type="button"
                            className="row-arrow"
                            aria-label="Next"
                            onClick={() => scrollRow('right')}
                            disabled={!canScroll.right}
                            style={{ visibility: canScroll.right ? 'visible' : 'hidden' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" className="arrow-svg right">
                                <path fill="none" d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28"></path>
                            </svg>
                        </button>
                    </div>
                )}

                <div
                    className="stay-track"
                    ref={rowRef}
                    onScroll={updateScrollState}
                >
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

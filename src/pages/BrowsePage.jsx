import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { loadStays } from '../store/actions/stay.actions'
import { showErrorMsg } from '../services/event-bus.service'
import { stayService } from '../services/stay'
import { StayBrowsePreview } from '../cmps/staybrowsepreview'
import GoogleMapPane from '../cmps/GoogleMapPane'
import '../assets/styles/cmps/Browse.css'
import '../assets/styles/cmps/stay/StayPreview.css'

const PER_PAGE = 18

function collectImages(s) {
    const out = []
    if (!s) return out
    if (typeof s.coverImg === 'string') out.push(s.coverImg)
    if (typeof s.previewImg === 'string') out.push(s.previewImg)
    if (Array.isArray(s.previewImgs)) for (let i = 0; i < s.previewImgs.length; i++) if (typeof s.previewImgs[i] === 'string') out.push(s.previewImgs[i])
    if (Array.isArray(s.imgs)) for (let j = 0; j < s.imgs.length; j++) if (typeof s.imgs[j] === 'string') out.push(s.imgs[j])
    if (typeof s.imgUrl === 'string') out.push(s.imgUrl)
    if (Array.isArray(s.imgUrls)) for (let k = 0; k < s.imgUrls.length; k++) if (typeof s.imgUrls[k] === 'string') out.push(s.imgUrls[k])
    const seen = {}
    const unique = []
    for (let u = 0; u < out.length; u++) { const url = out[u]; if (!seen[url]) { seen[url] = 1; unique.push(url) } }
    return unique
}

function primaryImg(s) {
    const imgs = collectImages(s)
    return imgs[0] || ''
}

function isInBounds(lat, lng, b) {
    if (!b) return true
    if (typeof lat !== 'number' || typeof lng !== 'number') return false
    const withinLat = lat <= b.north && lat >= b.south
    const crossesIDL = b.east < b.west
    const withinLng = crossesIDL ? (lng >= b.west || lng <= b.east) : (lng <= b.east && lng >= b.west)
    return withinLat && withinLng
}

export default function BrowsePage() {
    const [params] = useSearchParams()
    const type = params.get('type') || 'city'
    const label = params.get('label') || ''
    const [page, setPage] = useState(1)
    const [hoveredStayId, setHoveredStayId] = useState(null)
    const [visibleCount, setVisibleCount] = useState(0)
    const [dockOffset, setDockOffset] = useState(0)
    const resultsPaneRef = useRef(null)

    const filterBy = useSelector(s => s.stayModule.filterBy) || stayService.getDefaultFilter()
    const staysRaw = useSelector(s => s.stayModule.stays) || []

    useEffect(() => {
        const key = 'browse:reloadCount'
        const count = Number(sessionStorage.getItem(key) || '0')
        if (count < 2) {
            sessionStorage.setItem(key, String(count + 1))
            window.location.reload()
        } else {
            sessionStorage.removeItem(key)
        }
    }, [])

    useEffect(() => {
        if (!Array.isArray(staysRaw) || staysRaw.length === 0) {
            loadStays(filterBy).catch(() => showErrorMsg('Cannot load stays'))
        }
    }, [staysRaw, filterBy])

    useEffect(() => { setPage(1) }, [type, label])

    const allMatches = useMemo(() => {
        if (!Array.isArray(staysRaw)) return []
        if (!label.trim()) return staysRaw
        if (type === 'country') return staysRaw.filter(s => (s?.loc?.country || s?.address?.country || '').trim().toLowerCase() === label.trim().toLowerCase())
        return staysRaw.filter(s => (s?.loc?.city || s?.address?.city || '').trim().toLowerCase() === label.trim().toLowerCase())
    }, [staysRaw, type, label])

    useEffect(() => {
        setVisibleCount(allMatches.length)
    }, [allMatches])

    const pageCount = Math.max(1, Math.ceil(allMatches.length / PER_PAGE))
    const safePage = Math.min(Math.max(page, 1), pageCount)
    useEffect(() => { if (page !== safePage) setPage(safePage) }, [safePage])
    useEffect(() => { setHoveredStayId(null) }, [safePage])

    const startIdx = (safePage - 1) * PER_PAGE
    const pageItems = allMatches.slice(startIdx, startIdx + PER_PAGE)

    const mapMarkersAll = useMemo(
        () =>
            (Array.isArray(staysRaw) ? staysRaw : [])
                .map(s => {
                    const lat = s?.loc?.lat ?? s?.address?.lat
                    const lng = s?.loc?.lng ?? s?.address?.lng
                    return {
                        id: s?._id || s?.id,
                        lat,
                        lng,
                        title: s?.title || (s?.loc?.city || s?.address?.city ? `Home in ${s?.loc?.city || s?.address?.city}` : 'Home'),
                        price: typeof s?.price === 'number' ? s.price : undefined,
                        currency: s?.currency || '₪',
                        img: primaryImg(s),
                        images: collectImages(s),
                        desc: s?.summary || s?.description || s?.desc || '',
                        href: `/stay/${s?._id || s?.id || ''}`
                    }
                })
                .filter(m => typeof m.lat === 'number' && typeof m.lng === 'number'),
        [staysRaw]
    )

    const fitTo = useMemo(() => {
        return (Array.isArray(allMatches) ? allMatches : [])
            .map(s => ({ lat: s?.loc?.lat ?? s?.address?.lat, lng: s?.loc?.lng ?? s?.address?.lng }))
            .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
    }, [allMatches])

    const fitKey = `${type}:${label}:${fitTo.length}:${safePage}`

    function handleViewportChange(payload) {
        const b = payload && payload.bounds
        if (!b) return
        const count = mapMarkersAll.reduce((acc, m) => acc + (isInBounds(m.lat, m.lng, b) ? 1 : 0), 0)
        setVisibleCount(count)
    }

    function onHoverFactory(id) {
        return function onHover(isOn) {
            setHoveredStayId(isOn ? id : null)
        }
    }

    function goPage(n) {
        setPage(n)
        if (resultsPaneRef.current) resultsPaneRef.current.scrollTop = 0
    }

    useEffect(() => {
        function updateDock() {
            const isMobile = window.matchMedia('(max-width: 980px)').matches
            if (isMobile) { setDockOffset(0); return }
            const footer = document.querySelector('.app-footer')
            if (!footer) { setDockOffset(0); return }
            const rect = footer.getBoundingClientRect()
            const vh = window.innerHeight || 0
            const overlap = Math.max(0, vh - rect.top)
            const footerH = footer.offsetHeight || 64
            const clamped = Math.min(overlap, footerH)
            setDockOffset(clamped)
        }
        updateDock()
        window.addEventListener('scroll', updateDock, { passive: true })
        window.addEventListener('resize', updateDock)
        const mo = new MutationObserver(updateDock)
        const footerEl = document.querySelector('.app-footer')
        if (footerEl) mo.observe(footerEl, { attributes: true, childList: true, subtree: true })
        return () => {
            window.removeEventListener('scroll', updateDock)
            window.removeEventListener('resize', updateDock)
            mo.disconnect()
        }
    }, [])

    return (
        <section className="browse-page">
            <div className="browse-grid">
                <div className="results-pane" ref={resultsPaneRef}>
                    <header className="results-header">
                        <h1>{visibleCount} homes within map area</h1>
                    </header>
                    <ul className="results-grid">
                        {pageItems.map((s, i) => (
                            <li key={(s?._id || 's') + '-' + i} className="result-card">
                                <StayBrowsePreview stay={s} onHover={onHoverFactory(s?._id || s?.id)} />
                            </li>
                        ))}
                    </ul>
                    <nav className="pager">
                        <ul>
                            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                                <li key={'p' + n}>
                                    <button className={n === safePage ? 'active' : ''} onClick={() => goPage(n)}>
                                        {n}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <div className="map-pane" style={{ transform: `translateY(-${dockOffset}px)` }}>
                    <GoogleMapPane
                        label={label}
                        markers={mapMarkersAll}
                        fitTo={fitTo}
                        fitKey={fitKey}
                        activeId={hoveredStayId}
                        onViewportChange={handleViewportChange}
                        defaultColors
                    />
                </div>
            </div>
        </section>
    )
}

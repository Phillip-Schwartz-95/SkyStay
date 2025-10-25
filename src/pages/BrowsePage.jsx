import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { loadStays } from '../store/actions/stay.actions'
import { showErrorMsg } from '../services/event-bus.service'
import { stayService } from '../services/stay'
import { StayBrowsePreview } from '../cmps/staybrowsepreview'
import GoogleMapPane from '../cmps/GoogleMapPane'
import '../assets/styles/cmps/browse.css'
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

export default function BrowsePage() {
    const [params] = useSearchParams()
    const type = params.get('type') || 'city'
    const label = params.get('label') || ''
    const [page, setPage] = useState(1)
    const [hoveredStayId, setHoveredStayId] = useState(null)
    const resultsPaneRef = useRef(null)

    const filterBy = useSelector(s => s.stayModule.filterBy) || stayService.getDefaultFilter()
    const staysRaw = useSelector(s => s.stayModule.stays) || []

    useEffect(() => {
        loadStays(filterBy).catch(() => showErrorMsg('Cannot load stays'))
    }, [filterBy])

    useEffect(() => { setPage(1) }, [type, label])

    const allMatches = useMemo(() => {
        if (!Array.isArray(staysRaw)) return []
        if (type === 'country') return staysRaw.filter(s => (s?.loc?.country || '').trim().toLowerCase() === label.trim().toLowerCase())
        return staysRaw.filter(s => (s?.loc?.city || '').trim().toLowerCase() === label.trim().toLowerCase())
    }, [staysRaw, type, label])

    const pageCount = Math.max(1, Math.ceil(allMatches.length / PER_PAGE))
    const safePage = Math.min(Math.max(page, 1), pageCount)
    useEffect(() => { if (page !== safePage) setPage(safePage) }, [safePage])
    useEffect(() => { setHoveredStayId(null) }, [safePage])

    const startIdx = (safePage - 1) * PER_PAGE
    const pageItems = allMatches.slice(startIdx, startIdx + PER_PAGE)

    const mapMarkersAll = useMemo(
        () =>
            (Array.isArray(staysRaw) ? staysRaw : [])
                .map(s => ({
                    id: s?._id || s?.id,
                    lat: s?.loc?.lat,
                    lng: s?.loc?.lng,
                    title: s?.title || (s?.loc?.city ? `Home in ${s.loc.city}` : 'Home'),
                    price: typeof s?.price === 'number' ? s.price : undefined,
                    currency: s?.currency || '₪',
                    img: primaryImg(s),
                    images: collectImages(s),
                    desc: s?.summary || s?.description || s?.desc || '',
                    href: `/stay/${s?._id || s?.id || ''}`
                }))
                .filter(m => typeof m.lat === 'number' && typeof m.lng === 'number'),
        [staysRaw]
    )

    const fitTo = useMemo(() => {
        return (Array.isArray(allMatches) ? allMatches : [])
            .map(s => ({ lat: s?.loc?.lat, lng: s?.loc?.lng }))
            .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
    }, [allMatches])

    const fitKey = `${type}:${label}:${fitTo.length}:${safePage}`

    function handleMapDragEnd(payload) {
        console.log('Map drag end:', payload)
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

    return (
        <section className="browse-page">
            <div className="browse-grid">
                <div className="results-pane" ref={resultsPaneRef}>
                    <header className="results-header">
                        <h1>Homes in {label}</h1>
                        <div className="results-meta">{allMatches.length} stays</div>
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

                <div className="map-pane">
                    <GoogleMapPane
                        label={label}
                        markers={mapMarkersAll}
                        fitTo={fitTo}
                        fitKey={fitKey}
                        activeId={hoveredStayId}
                        onMapDragEnd={handleMapDragEnd}
                    />
                </div>
            </div>
        </section>
    )
}

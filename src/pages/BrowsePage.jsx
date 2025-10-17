import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { loadStays } from '../store/actions/stay.actions'
import { showErrorMsg } from '../services/event-bus.service'
import { stayService } from '../services/stay'
import { StayPreview } from '../cmps/StayPreview'
import GoogleMapPane from '../cmps/GoogleMapPane'
import '../assets/styles/cmps/browse.css'
import '../assets/styles/cmps/stay/StayPreview.css'

const PER_PAGE = 18

export default function BrowsePage() {
    const [params] = useSearchParams()
    const type = params.get('type') || 'city'
    const label = params.get('label') || ''
    const [page, setPage] = useState(1)

    const filterBy = useSelector(s => s.stayModule.filterBy) || stayService.getDefaultFilter()
    const staysRaw = useSelector(s => s.stayModule.stays) || []

    useEffect(() => {
        loadStays(filterBy).catch(() => showErrorMsg('Cannot load stays'))
    }, [filterBy])

    useEffect(() => { setPage(1) }, [type, label])

    const allMatches = useMemo(() => {
        if (!Array.isArray(staysRaw)) return []
        if (type === 'country') {
            return staysRaw.filter(s => (s?.loc?.country || '').trim().toLowerCase() === label.trim().toLowerCase())
        }
        return staysRaw.filter(s => (s?.loc?.city || '').trim().toLowerCase() === label.trim().toLowerCase())
    }, [staysRaw, type, label])

    const pageCount = Math.max(1, Math.ceil(allMatches.length / PER_PAGE))
    const startIdx = (page - 1) * PER_PAGE
    const pageItems = allMatches.slice(startIdx, startIdx + PER_PAGE)

    const mapMarkers = useMemo(() => pageItems.map(s => ({
        lat: s?.loc?.lat,
        lng: s?.loc?.lng,
        title: s?.title || (s?.loc?.city ? `Home in ${s.loc.city}` : 'Home'),
        price: typeof s?.price === 'number' ? s.price : undefined,
        currency: s?.currency || '₪'
    })), [pageItems])

    return (
        <section className="browse-page">
            <div className="browse-grid">
                <div className="results-pane">
                    <header className="results-header">
                        <h1>Homes in {label}</h1>
                        <div className="results-meta">{allMatches.length} stays</div>
                    </header>

                    <ul className="results-grid">
                        {pageItems.map((s, i) => (
                            <li key={(s?._id || 's') + '-' + i} className="result-card">
                                <StayPreview stay={s} />
                            </li>
                        ))}
                    </ul>

                    <nav className="pager">
                        <ul>
                            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                                <li key={'p' + n}>
                                    <button className={n === page ? 'active' : ''} onClick={() => setPage(n)}>
                                        {n}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <div className="map-pane">
                    <GoogleMapPane label={label} markers={mapMarkers} />
                </div>
            </div>
        </section>
    )
}

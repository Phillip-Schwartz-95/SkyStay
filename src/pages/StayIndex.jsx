import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { loadStays, updateStay, removeStay } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { stayService } from '../services/stay'
import { StayList } from '../cmps/StayList'
import '../assets/styles/cmps/stay/StayList.css'
import '../assets/styles/cmps/stay/StayPreview.css'

function calcRating(stay) {
    if (stay?.ratings && typeof stay.ratings.overall === 'number') return stay.ratings.overall
    if (stay?.host && typeof stay.host.rating === 'number') return stay.host.rating
    if (typeof stay?.rating === 'number') return stay.rating
    if (Array.isArray(stay?.reviews) && stay.reviews.length) {
        const sum = stay.reviews.reduce((s, r) => s + (r && typeof r.rating === 'number' ? r.rating : 0), 0)
        return sum / stay.reviews.length
    }
    return 0
}

function norm(v) {
    return String(v ?? '').trim().toLowerCase()
}

function applyFilter(items, f) {
    if (!Array.isArray(items) || !items.length) return []
    if (!f) return items

    const txt = norm(f.txt)
    const country = norm(f?.loc?.country)
    const city = norm(f?.loc?.city)
    const minPrice = typeof f?.price?.min === 'number' ? f.price.min : null
    const maxPrice = typeof f?.price?.max === 'number' ? f.price.max : null
    const amen = Array.isArray(f?.amenities) ? f.amenities.filter(Boolean) : []

    return items.filter(s => {
        const sTitle = norm(s?.title)
        const sCity = norm(s?.loc?.city)
        const sCountry = norm(s?.loc?.country)
        const sPrice = typeof s?.price === 'number' ? s.price : null

        if (txt && !(sTitle.includes(txt) || sCity.includes(txt) || sCountry.includes(txt))) return false
        if (country && sCountry !== country) return false
        if (city && sCity !== city) return false
        if (minPrice !== null && (sPrice === null || sPrice < minPrice)) return false
        if (maxPrice !== null && (sPrice === null || sPrice > maxPrice)) return false

        if (amen.length) {
            const hasList = Array.isArray(s?.amenities) ? s.amenities.filter(Boolean) : []
            for (const a of amen) if (!hasList.includes(a)) return false
        }

        return true
    })
}

function sortByCountryCityTitle(a, b) {
    const ac = a?.loc?.country || ''
    const bc = b?.loc?.country || ''
    if (ac.toLowerCase() < bc.toLowerCase()) return -1
    if (ac.toLowerCase() > bc.toLowerCase()) return 1
    const aCity = a?.loc?.city || ''
    const bCity = b?.loc?.city || ''
    if (aCity.toLowerCase() < bCity.toLowerCase()) return -1
    if (aCity.toLowerCase() > bCity.toLowerCase()) return 1
    const at = a?.title || ''
    const bt = b?.title || ''
    if (at.toLowerCase() < bt.toLowerCase()) return -1
    if (at.toLowerCase() > bt.toLowerCase()) return 1
    return 0
}

const keyOf = v => String(v || '').trim().toLowerCase()

function hardNavigateToBrowse(type, label) {
    const t = type || 'city'
    const q = (label || '').trim()
    const url = q
        ? `#/browse?type=${encodeURIComponent(t)}&label=${encodeURIComponent(q)}`
        : '#/browse'
    window.location.href = url
}

export function StayIndex() {
    const filterBy = useSelector(s => s.stayModule.filterBy) || stayService.getDefaultFilter()
    const staysRaw = useSelector(s => s.stayModule.stays) || []
    const location = useLocation()
    const isHomePage = location.pathname === '/'

    useEffect(() => {
        loadStays(filterBy).catch(() => showErrorMsg('Cannot load stays'))
    }, [filterBy])

    const staysFiltered = useMemo(() => applyFilter(staysRaw, filterBy), [staysRaw, filterBy])
    const staysSorted = useMemo(() => [...staysFiltered].sort(sortByCountryCityTitle), [staysFiltered])

    const candidateRows = useMemo(() => {
        const cityMap = new Map()
        const countryMap = new Map()
        for (const s of staysSorted) {
            const country = s?.loc?.country || 'Other'
            const city = s?.loc?.city || ''
            const cKey = keyOf(country)
            const ctKey = keyOf(city) + '|' + cKey
            if (!countryMap.has(cKey)) countryMap.set(cKey, { type: 'country', label: country.trim(), items: [] })
            countryMap.get(cKey).items.push(s)
            if (city) {
                if (!cityMap.has(ctKey)) cityMap.set(ctKey, { type: 'city', label: city.trim(), items: [] })
                cityMap.get(ctKey).items.push(s)
            }
        }
        const score = g => {
            const avg = g.items.length ? g.items.reduce((p, x) => p + calcRating(x), 0) / g.items.length : 0
            const sizeBoost = Math.log2(g.items.length + 1)
            return avg * 1 + sizeBoost * 0.5
        }
        const topCities = Array.from(cityMap.values()).sort((a, b) => score(b) - score(a))
        const topCountries = Array.from(countryMap.values()).sort((a, b) => score(b) - score(a))
        const merged = []
        const used = new Set()
        let i = 0
        let j = 0
        while ((i < topCities.length || j < topCountries.length) && merged.length < 24) {
            if (i < topCities.length) {
                const r = topCities[i++]
                const k = 'city|' + keyOf(r.label)
                if (!used.has(k)) { merged.push(r); used.add(k) }
            }
            if (j < topCountries.length) {
                const r = topCountries[j++]
                const k = 'country|' + keyOf(r.label)
                if (!used.has(k)) { merged.push(r); used.add(k) }
            }
        }
        return merged
    }, [staysSorted])

    const rowsLimited = useMemo(
        () => candidateRows.filter(r => Array.isArray(r.items) && r.items.length > 0).slice(0, 9),
        [candidateRows]
    )

    const phrasesCity = ['Popular homes in', 'Available in', 'Stay in', 'Explore']
    const phrasesCountry = ['Popular homes in', 'Available in', 'Stay in', 'Homes in']

    const isFilterActive =
        !isHomePage && (
            (filterBy.txt && filterBy.txt.trim() !== '') ||
            (filterBy.city && filterBy.city.trim() !== '') ||
            (filterBy.loc?.city && filterBy.loc.city.trim() !== '') ||
            (filterBy.loc?.country && filterBy.loc.country.trim() !== '') ||
            (typeof filterBy.minPrice === 'number' && filterBy.minPrice > 0) ||
            (typeof filterBy.capacity === 'number' && filterBy.capacity > 0)
        )

    if (isFilterActive) {
        return (
            <section className="stay-index">
                <header className="row-header">
                    <h2>Explore stays {filterBy.txt ? `in ${filterBy.txt}` : ''}</h2>
                </header>

                <StayList
                    stays={staysSorted}
                    layout="grid"
                    onRemoveStay={async id => {
                        try { await removeStay(id); showSuccessMsg('Stay removed') }
                        catch { showErrorMsg('Cannot remove stay') }
                    }}
                    onUpdateStay={async st => {
                        const price = +prompt('New price per night?', st.price) || st.price
                        if (price === st.price) return
                        try {
                            const saved = await updateStay({ ...st, price })
                            showSuccessMsg(`Stay updated, new price: ${saved.price}`)
                        } catch {
                            showErrorMsg('Cannot update stay')
                        }
                    }}
                />
            </section>
        )
    }

    return (
        <section className="stay-index">
            <div className="recommendation-rows" data-count={rowsLimited.length}>
                {rowsLimited.map((row, idx) => (
                    <section key={`${row.type}-${row.label}-${idx}`} className="recommendation-row">
                        <header className="row-header">
                            <h2 className="row-title">
                                <a
                                    href={`/browse?type=${encodeURIComponent(row.type)}&label=${encodeURIComponent(row.label)}`}
                                    className="row-title-link"
                                    onClick={(e) => { e.preventDefault(); hardNavigateToBrowse(row.type, row.label) }}
                                >
                                    {(row.type === 'city'
                                        ? phrasesCity[idx % phrasesCity.length]
                                        : phrasesCountry[idx % phrasesCountry.length])}{' '}
                                    {row.label}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 5.33333, overflow: 'visible', marginLeft: '4px', transform: 'translateY(2px)' }}>
                                        <path fill="none" d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28"></path>
                                    </svg>
                                </a>
                            </h2>
                        </header>
                        <StayList
                            stays={row.items.slice(0, 8)}
                            onRemoveStay={async id => {
                                try { await removeStay(id); showSuccessMsg('Stay removed') }
                                catch { showErrorMsg('Cannot remove stay') }
                            }}
                            onUpdateStay={async st => {
                                const price = +prompt('New price per night?', st.price) || st.price
                                if (price === st.price) return
                                try { const saved = await updateStay({ ...st, price }); showSuccessMsg(`Stay updated, new price: ${saved.price}`) }
                                catch { showErrorMsg('Cannot update stay') }
                            }}
                        />
                    </section>
                ))}
            </div>
        </section>
    )
}

export default StayIndex

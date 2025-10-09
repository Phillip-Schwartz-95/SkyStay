import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { loadStays, addStay, updateStay, removeStay } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { stayService } from '../services/stay'
import { StayList } from '../cmps/StayList'
import { AppFooter } from '../cmps/AppFooter'
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

function applyFilter(items, f) {
    if (!Array.isArray(items)) return []
    if (!f) return items
    return items.filter(s => {
        let ok = true
        if (f.txt && typeof f.txt === 'string') {
            const t = f.txt.toLowerCase()
            const inTitle = s?.title?.toLowerCase().includes(t)
            const inCity = s?.loc?.city?.toLowerCase().includes(t)
            const inCountry = s?.loc?.country?.toLowerCase().includes(t)
            ok = ok && (inTitle || inCity || inCountry)
        }
        if (f.loc?.country) ok = ok && s?.loc?.country === f.loc.country
        if (f.loc?.city) ok = ok && s?.loc?.city === f.loc.city
        if (typeof f?.price?.min === 'number') ok = ok && typeof s.price === 'number' && s.price >= f.price.min
        if (typeof f?.price?.max === 'number') ok = ok && typeof s.price === 'number' && s.price <= f.price.max
        if (Array.isArray(f.amenities) && f.amenities.length) ok = ok && Array.isArray(s.amenities) && f.amenities.every(a => s.amenities.includes(a))
        return ok
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

export function StayIndex() {
    const filterBy = useSelector(s => s.stayModule.filterBy) || stayService.getDefaultFilter()
    const staysRaw = useSelector(s => s.stayModule.stays) || []

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

    return (
        <section className="stay-index">
            <div className="recommendation-rows" data-count={rowsLimited.length}>
                {rowsLimited.map((row, idx) => (
                    <section key={`${row.type}-${row.label}-${idx}`} className="recommendation-row">
                        <header className="row-header">
                            <h2>
                                {(row.type === 'city'
                                    ? phrasesCity[idx % phrasesCity.length]
                                    : phrasesCountry[idx % phrasesCountry.length])}{' '}
                                {row.label}
                            </h2>
                        </header>
                        <StayList
                            stays={row.items.slice(0, 7)}
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
            <AppFooter />
        </section>
    )
}

export default StayIndex

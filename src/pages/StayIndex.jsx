import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { loadStays, addStay, updateStay, removeStay } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { stayService } from '../services/stay'
import { userService } from '../services/user'
import { StayList } from '../cmps/StayList'
import '../assets/styles/cmps/stay/StayList.css'
import '../assets/styles/cmps/stay/StayPreview.css'

function calcRating(stay) {
    if (stay && stay.ratings && typeof stay.ratings.overall === 'number') return stay.ratings.overall
    if (stay && stay.host && typeof stay.host.rating === 'number') return stay.host.rating
    if (stay && typeof stay.rating === 'number') return stay.rating
    if (stay && Array.isArray(stay.reviews) && stay.reviews.length) {
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
            const inTitle = s && s.title && s.title.toLowerCase().includes(t)
            const inCity = s && s.loc && s.loc.city && s.loc.city.toLowerCase().includes(t)
            const inCountry = s && s.loc && s.loc.country && s.loc.country.toLowerCase().includes(t)
            ok = ok && (inTitle || inCity || inCountry)
        }
        if (f.loc && f.loc.country) ok = ok && s && s.loc && s.loc.country === f.loc.country
        if (f.loc && f.loc.city) ok = ok && s && s.loc && s.loc.city === f.loc.city
        if (f.price && typeof f.price.min === 'number') ok = ok && typeof s.price === 'number' && s.price >= f.price.min
        if (f.price && typeof f.price.max === 'number') ok = ok && typeof s.price === 'number' && s.price <= f.price.max
        if (Array.isArray(f.amenities) && f.amenities.length) ok = ok && Array.isArray(s.amenities) && f.amenities.every(a => s.amenities.includes(a))
        return ok
    })
}

function sortByCountryCityTitle(a, b) {
    const ac = a && a.loc && a.loc.country ? a.loc.country : ''
    const bc = b && b.loc && b.loc.country ? b.loc.country : ''
    if (ac.toLowerCase() < bc.toLowerCase()) return -1
    if (ac.toLowerCase() > bc.toLowerCase()) return 1
    const aCity = a && a.loc && a.loc.city ? a.loc.city : ''
    const bCity = b && b.loc && b.loc.city ? b.loc.city : ''
    if (aCity.toLowerCase() < bCity.toLowerCase()) return -1
    if (aCity.toLowerCase() > bCity.toLowerCase()) return 1
    const at = a && a.title ? a.title : ''
    const bt = b && b.title ? b.title : ''
    if (at.toLowerCase() < bt.toLowerCase()) return -1
    if (at.toLowerCase() > bt.toLowerCase()) return 1
    return 0
}

export function StayIndex() {
    const filterBy = useSelector(state => state.stayModule.filterBy) || stayService.getDefaultFilter()
    const staysRaw = useSelector(state => state.stayModule.stays) || []

    useEffect(() => { loadStays(filterBy) }, [filterBy])

    const staysFiltered = useMemo(() => applyFilter(staysRaw, filterBy), [staysRaw, filterBy])
    const staysSorted = useMemo(() => [...staysFiltered].sort(sortByCountryCityTitle), [staysFiltered])

    const groups = useMemo(() => {
        const map = new Map()
        for (const s of staysSorted) {
            const c = s && s.loc && s.loc.country ? s.loc.country : 'Other'
            if (!map.has(c)) map.set(c, [])
            map.get(c).push(s)
        }
        return Array.from(map.entries())
    }, [staysSorted])

    const phrases = ['Popular homes in', 'Available in', 'Stay in', 'Homes in']

    async function onRemoveStay(stayId) {
        try {
            await removeStay(stayId)
            showSuccessMsg('Stay removed')
        } catch {
            showErrorMsg('Cannot remove stay')
        }
    }

    async function onAddStay() {
        const stay = stayService.getEmptyStay()
        stay.title = prompt('Title?', 'Cozy studio') || ''
        try {
            const savedStay = await addStay(stay)
            showSuccessMsg(`Stay added (id: ${savedStay._id})`)
        } catch {
            showErrorMsg('Cannot add stay')
        }
    }

    async function onUpdateStay(stay) {
        const price = +prompt('New price per night?', stay.price) || stay.price
        if (price === stay.price) return
        const stayToSave = { ...stay, price }
        try {
            const savedStay = await updateStay(stayToSave)
            showSuccessMsg(`Stay updated, new price: ${savedStay.price}`)
        } catch {
            showErrorMsg('Cannot update stay')
        }
    }

    return (
        <section className="stay-index">
            {groups.map(([country, list], idx) => (
                <section key={country} className="country-row">
                    <header className="row-header">
                        <h2>{`${phrases[idx % phrases.length]} ${country}`}</h2>
                    </header>
                    <StayList
                        stays={list.slice(0, 8)}
                        onRemoveStay={onRemoveStay}
                        onUpdateStay={onUpdateStay}
                    />
                </section>
            ))}
        </section>
    )
}

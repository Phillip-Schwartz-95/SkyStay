import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import { setFilter } from '../store/actions/stay.actions'
import { GuestCounter } from './staydetails/GuestCounter'

export function StayFilter({ isScrolledDown }) {
    const filterBy = useSelector(storeState => storeState.stayModule.filterBy)

    const [activeMenu, setActiveMenu] = useState(null)
    const [draft, setDraft] = useState({
        ...filterBy,
        adults: 1,
        children: 0,
        infants: 0,
        pets: 0,
        capacity: filterBy.capacity || 0,
        coords: filterBy.coords || null,
        city: filterBy.city || '',
        txt: filterBy.txt || ''
    })
    const [isFixedMenuOpen, setIsFixedMenuOpen] = useState(false)
    const [overlayPos, setOverlayPos] = useState({ top: 0, left: 0 })

    const inputRefs = useRef({})
    const pillRefs = useRef({})
    const wrapperRef = useRef(null)
    const overlayRef = useRef(null)

    useEffect(() => {
        if (!isScrolledDown) setIsFixedMenuOpen(false)
    }, [isScrolledDown])

    useEffect(() => {
        setDraft({
            ...filterBy,
            adults: filterBy.adults || 1,
            children: filterBy.children || 0,
            infants: filterBy.infants || 0,
            pets: filterBy.pets || 0,
            coords: filterBy.coords || null,
            city: filterBy.city || '',
            txt: filterBy.txt || '',
            startDate: filterBy.startDate ? formatDateForInput(filterBy.startDate) : '',
            endDate: filterBy.endDate ? formatDateForInput(filterBy.endDate) : '',
            capacity: filterBy.capacity || 0
        })
    }, [filterBy])

    useEffect(() => {
        if (!activeMenu) return
        const el = inputRefs.current[activeMenu]
        if (!el) return
        setTimeout(() => el?.focus?.(), 0)
    }, [activeMenu])

    useEffect(() => {
        if (!activeMenu) return
        const handleReposition = () => {
            const el = pillRefs.current[activeMenu]
            if (!el) return
            const r = el.getBoundingClientRect()
            setOverlayPos({ top: Math.round(r.bottom + 8), left: Math.round(r.left) })
        }
        handleReposition()
        window.addEventListener('resize', handleReposition)
        window.addEventListener('scroll', handleReposition, true)
        return () => {
            window.removeEventListener('resize', handleReposition)
            window.removeEventListener('scroll', handleReposition, true)
        }
    }, [activeMenu])

    useEffect(() => {
        if (!activeMenu && !isFixedMenuOpen) return
        function onDocMouseDown(ev) {
            const wrap = wrapperRef.current
            const overlay = overlayRef.current
            const insideWrapper = wrap && wrap.contains(ev.target)
            const insideOverlay = overlay && overlay.contains(ev.target)
            if (insideWrapper || insideOverlay) return
            setActiveMenu(null)
            setIsFixedMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocMouseDown)
        return () => document.removeEventListener('mousedown', onDocMouseDown)
    }, [activeMenu, isFixedMenuOpen])

    function onChange(field, value) {
        const newValue = field === 'capacity' ? +value : value
        setDraft(prev => ({ ...prev, [field]: newValue }))
    }

    function normalizePlace(txt) {
        const s = String(txt || '').trim()
        if (!s) return null
        const parts = s.split(',').map(x => x.trim()).filter(Boolean)
        if (parts.length >= 2) {
            return { type: 'city', label: parts[0] }
        }
        const countries = ['israel', 'usa', 'united states', 'spain', 'france', 'italy', 'germany', 'uk', 'united kingdom', 'australia', 'canada']
        const lower = s.toLowerCase()
        if (countries.includes(lower)) return { type: 'country', label: s }
        return { type: 'city', label: s }
    }

    function hardNavigateToBrowse(type, label) {
        const t = type || 'city'
        const q = (label || '').trim()
        const url = q
            ? `#/browse?type=${encodeURIComponent(t)}&label=${encodeURIComponent(q)}`
            : '#/browse'
        window.location.hash = url
    }

    function goToBrowseFromDraft(d) {
        if (d.coords && !d.city && !d.txt) {
            hardNavigateToBrowse('city', 'Nearby')
            return
        }
        const target = normalizePlace(d.city || d.txt)
        if (target) {
            hardNavigateToBrowse(target.type, target.label)
        } else {
            hardNavigateToBrowse()
        }
    }

    function onSearch(ev) {
        ev.preventDefault()
        const guests = Math.max(1, (draft.adults || 0) + (draft.children || 0))
        const final = {
            ...draft,
            startDate: draft.startDate || null,
            endDate: draft.endDate || null,
            capacity: guests
        }
        setFilter(final)
        setActiveMenu(null)
        setTimeout(() => goToBrowseFromDraft(final), 0)
    }

    function onPillClick(menuName) {
        if (isScrolledDown && !isFixedMenuOpen) setIsFixedMenuOpen(true)
        const next = activeMenu === menuName ? null : menuName
        setActiveMenu(next)
        if (next) {
            const el = pillRefs.current[menuName]
            if (el) {
                const r = el.getBoundingClientRect()
                setOverlayPos({ top: Math.round(r.bottom + 8), left: Math.round(r.left) })
            }
        }
    }

    function onChildClick(ev) {
        ev.stopPropagation()
    }

    function closeFixedMenu() {
        setIsFixedMenuOpen(false)
        setActiveMenu(null)
    }

    function handleGuestChange(type, delta) {
        setDraft(prevDraft => {
            const newCount = Math.max(0, (prevDraft[type] || 0) + delta)
            const next = { ...prevDraft, [type]: newCount }
            const guests = Math.max(1, (next.adults || 0) + (next.children || 0))
            return { ...next, capacity: guests }
        })
    }

    function formatDateForInput(dateValue) {
        if (!dateValue) return ''
        const date = new Date(dateValue)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    function formatMiniDate(dateStr) {
        if (!dateStr) return null
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    function handleNearbySearch() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords
                    const newFilter = {
                        ...draft,
                        txt: draft.txt || '',
                        city: '',
                        coords: { lat: latitude, lng: longitude }
                    }
                    setDraft(newFilter)
                    setFilter(newFilter)
                    setActiveMenu(null)
                    setTimeout(() => hardNavigateToBrowse('city', 'Nearby'), 0)
                },
                () => {
                    alert('Could not get your location for Nearby search')
                    setActiveMenu(null)
                }
            )
        } else {
            alert('Geolocation is not supported by this browser for Nearby search')
            setActiveMenu(null)
        }
    }

    function onLocationSelect(location) {
        if (location.isNearby) {
            handleNearbySearch()
        } else {
            const next = {
                ...draft,
                txt: location.title,
                city: location.searchCity || location.title,
                coords: null
            }
            setDraft(next)
            setFilter(next)
            setActiveMenu(null)
            setTimeout(() => goToBrowseFromDraft(next), 0)
        }
    }

    const showFullSearch = !isScrolledDown || (isScrolledDown && isFixedMenuOpen)

    const fixedSearchText = draft.txt ? draft.txt : 'Anywhere'
    const fixedSearchDate =
        draft.startDate && draft.endDate
            ? `${formatMiniDate(draft.startDate)} - ${formatMiniDate(draft.endDate)}`
            : 'Anytime'
    const fixedSearchGuests = draft.capacity > 0 ? `${draft.capacity} guests` : 'Add guests'

    const isFullHeaderSearch = showFullSearch && !isFixedMenuOpen
    const searchPillClasses = `${isFullHeaderSearch ? 'search-pill' : 'search-pill-in-overlay'} ${activeMenu ? 'has-active-menu' : ''}`

    const recentSearch = {
        title: 'Sydney',
        subtitle: 'Explore the Harbour',
        searchCity: 'Sydney',
        imgUrl: 'https://www.svgrepo.com/show/220980/sydney-opera-house-sydney.svg'
    }
    const suggestedDestinations = [
        { title: 'Nearby', subtitle: `Find what's around you`, isNearby: true, searchCity: '', imgUrl: 'https://a0.muscache.com/im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-hawaii-autosuggest-destination-icons-2/original/ea5e5ee3-e9d8-48a1-b7e9-1003bf6fe850.png' },
        { title: 'Tel Aviv-Yafo', subtitle: 'Popular beach destination', searchCity: 'Tel Aviv', imgUrl: 'https://a0.muscache.com/im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-hawaii-autosuggest-destination-icons-1/original/eede907b-881f-4c1f-abeb-6379d89a74b6.png' },
        { title: 'Barcelona, Spain', subtitle: 'Gaudi architecture & beach life', searchCity: 'Barcelona', imgUrl: 'https://a0.muscache.com/im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-hawaii-autosuggest-destination-icons-2/original/aeba68c0-44ba-4ee6-9835-da23d7fb0a65.png' },
        { title: 'New York, USA', subtitle: 'Iconic city that never sleeps', searchCity: 'New York', imgUrl: 'https://www.svgrepo.com/show/317308/new-york.svg' }
    ]

    return (
        <div className="filter-wrapper" ref={wrapperRef}>
            {showFullSearch && (
                <form onSubmit={onSearch} className={searchPillClasses}>
                    <div
                        className={`pill-section where ${activeMenu === 'where' ? 'active' : ''}`}
                        onClick={() => onPillClick('where')}
                        ref={el => (pillRefs.current.where = el)}
                    >
                        <label className="label" htmlFor="whereInput">Where</label>
                        <input
                            className="placeholder-input"
                            type="text"
                            id="whereInput"
                            placeholder="Search destinations"
                            value={draft.txt || ''}
                            onChange={ev => onChange('txt', ev.target.value)}
                            onClick={onChildClick}
                            ref={el => (inputRefs.current.where = el)}
                        />
                    </div>

                    <div className="pill-divider" />

                    <div
                        className={`pill-section checkin ${activeMenu === 'checkin' ? 'active' : ''}`}
                        onClick={() => onPillClick('checkin')}
                        ref={el => (pillRefs.current.checkin = el)}
                    >
                        <label className="label" htmlFor="chekinInput">Check in</label>
                        {activeMenu === 'checkin' ? (
                            <input
                                className="date-input"
                                type="date"
                                id="chekinInput"
                                value={draft.startDate || ''}
                                onChange={ev => onChange('startDate', ev.target.value)}
                                onClick={onChildClick}
                                ref={el => (inputRefs.current.checkin = el)}
                            />
                        ) : (
                            <span className="placeholder-btn">Add dates</span>
                        )}
                    </div>

                    <div className="pill-divider" />

                    <div
                        className={`pill-section checkout ${activeMenu === 'checkout' ? 'active' : ''}`}
                        onClick={() => onPillClick('checkout')}
                        ref={el => (pillRefs.current.checkout = el)}
                    >
                        <label className="label" htmlFor="checkoutInput">Check out</label>
                        {activeMenu === 'checkout' ? (
                            <input
                                className="date-input"
                                type="date"
                                id="checkoutInput"
                                value={draft.endDate || ''}
                                onChange={ev => onChange('endDate', ev.target.value)}
                                onClick={onChildClick}
                                ref={el => (inputRefs.current.checkout = el)}
                            />
                        ) : (
                            <span className="placeholder-btn">Add dates</span>
                        )}
                    </div>

                    <div className="pill-divider" />

                    <div
                        className={`pill-section who ${activeMenu === 'who' ? 'active' : ''}`}
                        onClick={() => onPillClick('who')}
                        ref={el => (pillRefs.current.who = el)}
                    >
                        <label className="label" htmlFor="whoInput">Who</label>
                        {activeMenu === 'who' ? (
                            <input
                                className="capacity-input"
                                type="number"
                                id="whoInput"
                                placeholder="Add guests"
                                value={draft.capacity === 0 ? '' : draft.capacity}
                                min="0"
                                onChange={ev => onChange('capacity', ev.target.value)}
                                onClick={onChildClick}
                                ref={el => (inputRefs.current.who = el)}
                            />
                        ) : (
                            <span className="placeholder-btn">
                                {draft.capacity > 0 ? `${draft.capacity} guests` : 'Add guests'}
                            </span>
                        )}

                        <button className="search-btn" type="submit" aria-label="Search">
                            <svg
                                viewBox="0 0 32 32"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                                role="presentation"
                                focusable="false"
                                style={{ display: 'block', fill: 'none', height: '14px', width: '14px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible', transform: 'scaleX(-1) rotate(90deg)', transformOrigin: 'center' }}
                            >
                                <path d="m20.666 20.666 10 10"></path>
                                <path d="m24.0002 12.6668c0 6.2593-5.0741 11.3334-11.3334 11.3334-6.2592 0-11.3333-5.0741-11.3333-11.3334 0-6.2592 5.0741-11.3333 11.3333-11.3333 6.2593 0 11.3334 5.0741 11.3334 11.3333z" fill="none"></path>
                            </svg>
                        </button>
                    </div>
                </form>
            )}

            {isScrolledDown && !isFixedMenuOpen && (
                <div className="mini-search-pill" onClick={() => onPillClick('where')}>
                    <div className="mini-search-content">
                        <img className="mini-home-img" src="https://a0.muscache.com/im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-search-bar-icons/original/4aae4ed7-5939-4e76-b100-e69440ebeae4.png?im_w=240" alt="" />
                        <span className="mini-search-where">{fixedSearchText}</span>
                        <div className="pill-divider" />
                        <span className="mini-search-when">{fixedSearchDate}</span>
                        <div className="pill-divider" />
                        <span className="mini-search-who">{fixedSearchGuests}</span>
                    </div>
                    <div className="mini-search-icon">
                        <svg
                            viewBox="0 0 32 32"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            role="presentation"
                            focusable="false"
                            style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible', transform: 'scaleX(-1) rotate(90deg)', transformOrigin: 'center' }}
                        >
                            <path d="m20.666 20.666 10 10"></path>
                            <path d="m24.0002 12.6668c0 6.2593-5.0741 11.3334-11.3334 11.3334-6.2592 0-11.3333-5.0741-11.3333-11.3334 0-6.2592 5.0741-11.3333 11.3333-11.3333 6.2593 0 11.3334 5.0741 11.3334 11.3333z" fill="none"></path>
                        </svg>
                    </div>
                </div>
            )}

            {(activeMenu || isFixedMenuOpen) &&
                createPortal(
                    <div
                        ref={overlayRef}
                        className={`search-dropdown-overlay ${isScrolledDown ? 'fixed-overlay' : ''} ${activeMenu}-overlay`}
                        style={{ position: 'fixed', top: overlayPos.top, left: overlayPos.left, transform: 'none' }}
                    >
                        {isScrolledDown && isFixedMenuOpen && (
                            <div className="fixed-menu-header">
                                <button className="close-btn" onClick={closeFixedMenu}>X</button>
                            </div>
                        )}

                        {activeMenu === 'where' && (
                            <div className="where-menu">
                                <div className="recent-searchs">
                                    <h4 className="menu-header">Recent searches</h4>
                                    <button
                                        className="recent-item"
                                        onClick={() => onLocationSelect(recentSearch)}
                                    >
                                        <div className="item-icon">
                                            <img src={recentSearch.imgUrl} alt={`${recentSearch.title} icon`} className="location-icon" />
                                        </div>
                                        <div className="item-details">
                                            <p className="item-title">{recentSearch.title}</p>
                                            <span className="item-subtitle">{recentSearch.subtitle}</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="suggested-destinations">
                                    <h4 className="menu-header">Suggested destinations</h4>
                                    {suggestedDestinations.map(item => (
                                        <button
                                            className="suggestion-item"
                                            key={item.title}
                                            onClick={() => onLocationSelect(item)}
                                        >
                                            <div className="item-icon">
                                                <img src={item.imgUrl} alt={`${item.title} icon`} className="location-icon" />
                                            </div>
                                            <div className="item-details">
                                                <p className="item-title">{item.title}</p>
                                                <span className="item-subtitle">{item.subtitle}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeMenu === 'who' && (
                            <div className="who-menu" onClick={onChildClick}>
                                <GuestCounter
                                    title="Adults"
                                    subtitle="Ages 13 or above"
                                    count={draft.adults}
                                    onIncrease={() => handleGuestChange('adults', 1)}
                                    onDecrease={() => handleGuestChange('adults', -1)}
                                    min={1}
                                />
                                <GuestCounter
                                    title="Children"
                                    subtitle="Ages 2–12"
                                    count={draft.children}
                                    onIncrease={() => handleGuestChange('children', 1)}
                                    onDecrease={() => handleGuestChange('children', -1)}
                                    min={0}
                                />
                                <GuestCounter
                                    title="Infants"
                                    subtitle="Under 2"
                                    count={draft.infants}
                                    onIncrease={() => handleGuestChange('infants', 1)}
                                    onDecrease={() => handleGuestChange('infants', -1)}
                                    min={0}
                                />
                                <GuestCounter
                                    title="Pets"
                                    subtitle="Bringing a service animal?"
                                    count={draft.pets}
                                    onIncrease={() => handleGuestChange('pets', 1)}
                                    onDecrease={() => handleGuestChange('pets', -1)}
                                    min={0}
                                />
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    )
}

export default StayFilter

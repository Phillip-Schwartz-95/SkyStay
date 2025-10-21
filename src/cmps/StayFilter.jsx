import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { setFilter } from '../store/actions/stay.actions'
import { GuestCounter } from './GuestCounter'

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
        city: filterBy.city || ''
    })
    const [isFixedMenuOpen, setIsFixedMenuOpen] = useState(false)

    const inputRefs = useRef({})

    useEffect(() => {
        if (!isScrolledDown) {
            setIsFixedMenuOpen(false)
        }
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
            startDate: filterBy.startDate ? formatDateForInput(filterBy.startDate) : '',
            endDate: filterBy.endDate ? formatDateForInput(filterBy.endDate) : '',
            capacity: filterBy.capacity || 0,
        })
    }, [filterBy])

    useEffect(() => {
        if (activeMenu && inputRefs.current[activeMenu]) {
            setTimeout(() => {
                inputRefs.current[activeMenu].focus()
            }, 0)
        }
    }, [activeMenu])

    function onChange(field, value) {
        const newValue = field === 'capacity' ? +value : value
        setDraft(prev => ({ ...prev, [field]: newValue }))
    }

    function onSearch(ev) {
        ev.preventDefault()

        const finalSearchTxt = draft.city || draft.txt

        const finalFilter = {
            ...draft,
            txt: finalSearchTxt,
            coords: draft.coords || null,
            startDate: draft.startDate || null,
            endDate: draft.endDate || null,
            capacity: draft.capacity > 0 ? draft.capacity : 0,
            city: '',
        }

        setFilter(finalFilter)
        console.log('Filter set globally:', finalFilter)

        setActiveMenu(null)
    }

    function onPillClick(menuName) {
        if (isScrolledDown && !isFixedMenuOpen) {
            setIsFixedMenuOpen(true)
        }

        setActiveMenu(activeMenu === menuName ? null : menuName)
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
            const newCount = Math.max(0, prevDraft[type] + delta)
            const newDraft = { ...prevDraft, [type]: newCount }
            const newCapacity = newDraft.adults + newDraft.children

            return { ...newDraft, capacity: newCapacity }
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
                (position) => {
                    const { latitude, longitude } = position.coords
                    const newFilter = {
                        ...draft,
                        txt: 'Nearby',
                        city: '',
                        coords: { lat: latitude, lng: longitude }
                    }
                    setDraft(newFilter)
                    setActiveMenu(null)
                    setFilter(newFilter)
                },
                (error) => {
                    console.error('Geolocation error:', error)
                    alert('Could not get your location for Nearby search')
                    setActiveMenu(null)
                }
            )
        } else {
            alert('Geolocation is not supported by this browser for Nearby search')
            setActiveMenu(null)
        }
    }

    function onLocationSelecet(location) {
        if (location.isNearby) {
            handleNearbySearch()
        } else {
            setDraft(prev => ({
                ...prev,
                txt: location.title,
                city: location.searchCity || location.title,
                coords: null
            }))
        }
    }

    const showFullSearch = !isScrolledDown || (isScrolledDown && isFixedMenuOpen)

    const fixedSearchText = draft.txt ? draft.txt : 'Anywhere'
    const fixedSearchDate =
        (draft.startDate && draft.endDate)
            ? `${formatMiniDate(draft.startDate)} - ${formatMiniDate(draft.endDate)}`
            : 'Anytime'
    const fixedSearchGuests = draft.capacity > 0 ? `${draft.capacity} guests` : 'Add guests'

    const isFullHeaderSearch = showFullSearch && !isFixedMenuOpen
    const searchPillClasses = `${isFullHeaderSearch ? 'search-pill' : 'search-pill-in-overlay'} ${activeMenu ? 'has-active-menu' : ''}`

    const recentSearch = { title: 'Sydney', subtitle: 'Explore the Harbour', searchCity: 'Sydney' } // For now, hard coded
    const suggestedDestinations = [
        { title: 'Nearby', subtitle: `Find what's around you`, isNearby: true, searchCity: '' },
        { title: 'Tel Aviv-Yafo', subtitle: 'Popular beach destination', searchCity: 'Tel Aviv' },
        { title: 'Barcelona, Spain', subtitle: 'Gaudi architecture & beach life', searchCity: 'Barcelona' },
        { title: 'New York, USA', subtitle: 'Iconic city that never sleeps', searchCity: 'New York' },
    ]

    return (
        <div className="filter-wrapper">

            {showFullSearch && (
                <form onSubmit={onSearch} className={searchPillClasses}>

                    <div
                        className={`pill-section where ${activeMenu === 'where' ? 'active' : ''}`}
                        onClick={() => onPillClick('where')}
                    >
                        <label className="label" htmlFor="whereInput">Where</label>
                        <input
                            className="placeholder-input"
                            type="text"
                            id="whereInput"
                            placeholder="Search destinations"
                            // readOnly={activeMenu !== 'where'}
                            value={draft.txt || ''}
                            onChange={ev => onChange('txt', ev.target.value)}
                            onClick={onChildClick}
                            ref={el => inputRefs.current.where = el}
                        />
                    </div>

                    <div className="pill-divider" />

                    <div
                        className={`pill-section checkin ${activeMenu === 'checkin' ? 'active' : ''}`}
                        onClick={() => onPillClick('checkin')}
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
                                ref={el => inputRefs.current.checkin = el}
                            />
                        ) : (
                            <span className="placeholder-btn">Add dates</span>
                        )}
                    </div>

                    <div className="pill-divider" />

                    <div
                        className={`pill-section checkout ${activeMenu === 'checkout' ? 'active' : ''}`}
                        onClick={() => onPillClick('checkout')}
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
                                ref={el => inputRefs.current.checkout = el}
                            />
                        ) : (
                            <span className="placeholder-btn">Add dates</span>
                        )}
                    </div>

                    <div className="pill-divider" />

                    <div
                        className={`pill-section who ${activeMenu === 'who' ? 'active' : ''}`}
                        onClick={() => onPillClick('who')}
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
                                ref={el => inputRefs.current.who = el}
                            />
                        ) : (
                            <span className="placeholder-btn">
                                {draft.capacity > 0 ? `${draft.capacity} guests` : 'Add guests'}
                            </span>
                        )}

                        <button className="search-btn" type="submit" aria-label="Search">
                            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="currentColor" d="M10.5 3a7.5 7.5 0 1 1 0 15c-1.83 0-3.51-.64-4.82-1.71l-3.49 3.49a1 1 0 1 1-1.41-1.41l3.49-3.49A7.46 7.46 0 0 1 3 10.5 7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11Z" />
                            </svg>
                        </button>
                    </div>
                </form>
            )}

            {isScrolledDown && !isFixedMenuOpen && (
                <div
                    className="mini-search-pill"
                    onClick={() => onPillClick('where')}
                >
                    <div className="mini-search-content">
                        <span className="mini-search-main">{fixedSearchText}</span>
                        <span className="mini-search-secondary">{fixedSearchDate} · {fixedSearchGuests}</span>
                    </div>
                    <div className="mini-search-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10.5 3a7.5 7.5 0 1 1 0 15c-1.83 0-3.51-.64-4.82-1.71l-3.49 3.49a1 1 0 1 1-1.41-1.41l3.49-3.49A7.46 7.46 0 0 1 3 10.5 7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11Z" />
                        </svg>
                    </div>
                </div>
            )}

            {(activeMenu || isFixedMenuOpen) && (
                <div className={`search-dropdown-overlay ${isScrolledDown ? 'fixed-overlay' : ''} ${activeMenu}-overlay`}>

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
                                    onClick={() => onLocationSelecet(recentSearch)}>
                                    <div className="item-icon">
                                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '20px', width: '20px', fill: 'currentcolor' }}><path d="M16 3C8.83 3 3 8.83 3 16s5.83 13 13 13 13-5.83 13-13S23.17 3 16 3zm0 2c6.08 0 11 4.92 11 11s-4.92 11-11 11S5 22.08 5 16 9.92 5 16 5zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fillRule="evenodd"></path></svg>
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
                                        onClick={() => onLocationSelecet(item)}
                                    >
                                        <div className="item-icon">
                                            {item.isNearby ? (
                                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '24px', width: '24px', fill: 'currentcolor' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" fillRule="evenodd"></path></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '24px', width: '24px', fill: 'currentcolor' }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fillRule="evenodd"></path></svg>
                                            )}
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
                                min={1}
                            />
                            <GuestCounter
                                title="Pets"
                                subtitle="Bringing a service animal?"
                                count={draft.pets}
                                onIncrease={() => handleGuestChange('pets', 1)}
                                onDecrease={() => handleGuestChange('pets', -1)}
                                min={1}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

import { useEffect, useState } from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { reservationService } from '../../services/reservations/reservation.service.local'

export function BookingCard({
    stayId, userId, pricePerNight, maxGuests,
    checkIn, setCheckIn, checkOut, setCheckOut,
    reservedDates, setReservedDates
}) {
    const [guests, setGuests] = useState({
        adults: 1,
        children: 0,
        infants: 0,
        pets: 0
    })
    const [confirmationMsg, setConfirmationMsg] = useState('')
    // for guests box
    const [showGuests, setShowGuests] = useState(false)

    // load reservations for this stay
    useEffect(() => {
        loadReservations()
    }, [stayId])

    async function loadReservations() {
        try {
            const reservations = await reservationService.query({ stayId })
            const dates = []
            reservations.forEach(r => {
                let current = new Date(r.checkIn)
                const end = new Date(r.checkOut)
                while (current <= end) {
                    const formatted = current.toISOString().split("T")[0]  // store as string
                    dates.push(formatted)
                    current.setDate(current.getDate() + 1)
                }
            })
            setReservedDates(dates)
            console.log("Reserved dates:", dates)
        } catch (err) {
            console.error('Failed to load reservations', err)
        }
    }

    function updateGuests(type, diff) {
        setGuests(prev => {
            const key = type.toLowerCase()
            const min = key === 'adults' ? 1 : 0   // adults can't go below 1
            const newVal = Math.max(min, prev[key] + diff)
            return { ...prev, [key]: newVal }
        })
    }

    function calcTotalPrice() {
        if (!checkIn || !checkOut) return 0
        const start = new Date(checkIn)
        const end = new Date(checkOut)
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        return nights * pricePerNight
    }

    async function onBook() {
        if (!checkIn || !checkOut) {
            setConfirmationMsg("Please select dates")
            setTimeout(() => setConfirmationMsg(""), 2000)
            return
        }

        // Build selected range
        const selectedRange = []
        let current = new Date(checkIn)
        const end = new Date(checkOut)
        while (current <= end) {
            selectedRange.push(current.toISOString().split('T')[0])
            current.setDate(current.getDate() + 1)
        }

        // Check overlap
        const overlap = selectedRange.some(date => reservedDates.includes(date))
        if (overlap) {
            setConfirmationMsg("These dates have been booked")
            setTimeout(() => setConfirmationMsg(""), 2000)
            return
        }

        try {
            await reservationService.add({
                stayId,
                userId,
                checkIn: checkIn.toISOString().split("T")[0],
                checkOut: checkOut.toISOString().split("T")[0],
                guests,
                totalPrice: calcTotalPrice(),
            })
            setConfirmationMsg("Your stay has been booked!")
            setTimeout(() => setConfirmationMsg(""), 2000)
            setCheckIn(null)
            setCheckOut(null)
            setGuests({
                adults: 1,
                children: 0,
                infants: 0,
                pets: 0
            })
            loadReservations()
        } catch (err) {
            setConfirmationMsg("Failed to book stay")
            setTimeout(() => setConfirmationMsg(""), 2000)
        }
    }

    function handleMouseMove(e) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        e.currentTarget.style.setProperty('--x', `${x}%`)
        e.currentTarget.style.setProperty('--y', `${y}%`)
    }

    function handleMouseLeave(e) {
        e.currentTarget.style.removeProperty('--x')
        e.currentTarget.style.removeProperty('--y')
    }

    return (
        <>
            <aside className="booking-card">
                <div className="booking-header">
                    {checkIn && checkOut ? (
                        <>
                            <span className="price">${calcTotalPrice()}</span>
                            <span className="nights"> for {Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))} nights</span>
                        </>
                    ) : (
                        <>
                            <span className="price">${pricePerNight}</span> / night
                        </>
                    )}
                </div>

                <div className="booking-form">
                    {/* Dates */}
                    <div className="input-group">
                        <div className='date-inputs'>
                            <div className="date-box">
                                <label>CHECK-IN</label>
                                <DatePicker
                                    selected={checkIn}
                                    onChange={(date) => setCheckIn(date)}
                                    excludeDates={reservedDates.map(d => new Date(d))}
                                    minDate={new Date()}
                                    dateFormat="MM/dd/yyyy"
                                    selectsStart
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    placeholderText="Add date"
                                    calendarClassName="airbnb-calendar"
                                />
                            </div>
                            <div className="date-box">
                                <label>CHECKOUT</label>
                                <DatePicker
                                    selected={checkOut}
                                    onChange={(date) => setCheckOut(date)}
                                    excludeDates={reservedDates.map(d => new Date(d))}
                                    minDate={checkIn || new Date()}
                                    dateFormat="MM/dd/yyyy"
                                    selectsEnd
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    placeholderText="Add date"
                                    calendarClassName="airbnb-calendar"

                                />
                            </div>
                        </div>

                        {/* Guests */}
                        <div className="guest-dropdown">
                            <div className="guest-summary" onClick={() => setShowGuests(!showGuests)}>
                                <div className="guest-left">
                                    <label>GUESTS</label>
                                    <p>
                                        {guests.adults + guests.children > 0
                                            ? `${guests.adults + guests.children} guest${guests.adults + guests.children > 1 ? 's' : ''}`
                                            : '1 guest'}
                                    </p>
                                </div>
                                {/* Airbnb chevron SVG */}
                                <svg
                                    className={`guest-chevron ${showGuests ? 'open' : ''}`}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 32 32"
                                    aria-hidden="true"
                                    role="presentation"
                                    focusable="false"
                                >
                                    <path
                                        fill="none"
                                        d="M28 12 16.7 23.3a1 1 0 0 1-1.4 0L4 12"
                                    ></path>
                                </svg>
                            </div>

                            {showGuests && (
                                <div className="guest-menu">
                                    {['Adults', 'Children', 'Infants', 'Pets'].map((type, idx) => {
                                        const key = type.toLowerCase()
                                        const value = guests[key]

                                        return (
                                            <div key={idx} className="guest-row">
                                                <div className="guest-label">
                                                    <p>{type}</p>
                                                    {type === 'Adults' && <span>Age 13+</span>}
                                                    {type === 'Children' && <span>Ages 2–12</span>}
                                                    {type === 'Infants' && <span>Under 2</span>}
                                                    {type === 'Pets' && <span>Bringing a service animal?</span>}
                                                </div>
                                                <div className="guest-counter">
                                                    <button
                                                        onClick={() => updateGuests(type, -1)}
                                                        disabled={key === 'adults' ? value === 1 : value === 0}
                                                    >
                                                        −
                                                    </button>
                                                    <span>{value}</span>
                                                    <button onClick={() => updateGuests(type, 1)}>+</button>
                                                </div>
                                            </div>
                                        )
                                    })}

                                </div>
                            )}
                        </div>

                        {/* Reserve */}
                        <button
                            className="reserve-btn"
                            onClick={onBook}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                        >
                            Reserve
                        </button>

                        <p className="charge-note">You won't be charged yet</p>
                    </div>
                </div>

            </aside>

            {/* Confirmation modal */}
            {confirmationMsg && (
                <>
                    <div className="modal-backdrop show"></div>
                    <div className="confirmation-modal show">
                        <p>{confirmationMsg}</p>
                    </div>
                </>
            )}
        </>
    )
}
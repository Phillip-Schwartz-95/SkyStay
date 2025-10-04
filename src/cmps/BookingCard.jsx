import { useEffect, useState } from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { reservationService } from '../services/reservations/reservation.service.local'

export function BookingCard({
    stayId, userId, pricePerNight, maxGuests,
    checkIn, setCheckIn, checkOut, setCheckOut
}) {
    const [guests, setGuests] = useState(1)
    const [reservedDates, setReservedDates] = useState([])
    const [confirmationMsg, setConfirmationMsg] = useState('')

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
                    dates.push(current.toISOString().split('T')[0]) // store just YYYY-MM-DD
                    current.setDate(current.getDate() + 1)
                }
            })
            setReservedDates(dates)
        } catch (err) {
            console.error('Failed to load reservations', err)
        }
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
            setCheckIn(null)
            setCheckOut(null)
            setGuests(1)
            loadReservations()
        } catch (err) {
            setConfirmationMsg("Failed to book stay")
        }
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
                        <div className="guests-box">
                            <label>GUESTS</label>
                            <select value={guests} onChange={(e) => setGuests(+e.target.value)}>
                                {Array.from({ length: maxGuests }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {i + 1} guest{i > 0 ? 's' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Reserve */}
                    <button className="reserve-btn" onClick={onBook}>
                        Reserve
                    </button>
                    <p className="charge-note">You won't be charged yet</p>
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
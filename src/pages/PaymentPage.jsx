import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { reservationService } from '../services/reservations/reservation.service.local'
import '../assets/styles/cmps/stay/payment.css'

export default function PaymentPage() {
    useEffect(() => {
        document.body.classList.add('payment-page')
        return () => {
            document.body.classList.remove('payment-page')
        }
    }, [])

    const navigate = useNavigate()
    const { state } = useLocation() || {}
    const loggedInUser = useSelector(store => store.userModule?.user || store.userModule?.loggedinUser || null)

    const {
        stay = {},
        checkIn = null,
        checkOut = null,
        guests = 1,
        currency = 'USD',
        nightlyPrice = 0,
        nights = 0,
    } = state || {}

    const safeNights = Math.max(1, Number(nights) || 0)
    const serviceFee = Math.round((Number(nightlyPrice) || 0) * safeNights * 0.05)
    const total = (Number(nightlyPrice) * safeNights) + Number(serviceFee)

    const fmtDate = d =>
        d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''

    const fmtMoney = n =>
        new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0)

    const toIso = d => {
        if (!d) return ''
        const dt = new Date(d)
        return isNaN(dt) ? '' : dt.toISOString().split('T')[0]
    }

    async function handleConfirm() {
        if (!loggedInUser) {
            navigate('/auth/login')
            return
        }
        try {
            await reservationService.add({
                userId: loggedInUser._id || loggedInUser.id,
                stayId: stay.id || stay._id || '',
                stayName: stay.name || stay.title || 'Stay',
                imgUrl: stay.imgUrl || stay.coverImg || (stay.imgs && stay.imgs[0]) || '',
                hostFullname: stay.hostFullname || (stay.host && (stay.host.fullname || stay.host.name)) || '',
                checkIn: toIso(checkIn),
                checkOut: toIso(checkOut),
                guests,
                currency,
                nightlyPrice: Number(nightlyPrice) || 0,
                nights: safeNights,
                serviceFee,
                totalPrice: total,
                status: 'pending',
                bookedOn: Date.now(),
                stay: stay,
            })
            navigate('/trips', { replace: true })
            window.location.reload()
        } catch {
            navigate('/trips', { replace: true })
            window.location.reload()
        }
    }

    return (
        <section className="payment-page">
            <header className="payment-page__title">
                <button
                    type="button"
                    className="arrow-btn"
                    onClick={() => {
                        navigate(-1)
                        window.location.reload()
                    }}
                    aria-label="Back"
                >
                    <svg
                        className="arrow-img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 32 32"
                        aria-hidden="true"
                        role="presentation"
                        focusable="false"
                        style={{ display: 'block', fill: 'none', height: 22, width: 22, stroke: '#000', strokeWidth: 2.6667, overflow: 'visible', transform: 'scaleX(-1)' }}
                    >
                        <path fill="none" d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28"></path>
                    </svg>
                </button>
                <h2>Request to book</h2>
            </header>

            <main className="payment-layout">
                <section className="order-details">
                    <div className="trip-details">
                        <h3 className="your-trip">Your trip</h3>
                        <div className="trip-row">
                            <h4 className="trip-subheader">Dates</h4>
                            <h5 className="trip-details-data">{fmtDate(checkIn)} - {fmtDate(checkOut)}</h5>
                        </div>
                        <div className="trip-row">
                            <h4 className="trip-subheader">Guests</h4>
                            <h5 className="trip-details-data">{guests} {guests === 1 ? 'guest' : 'guests'}</h5>
                        </div>
                    </div>

                    <div className="order-user">
                        <button className="btn-square-color_btnSquareColor__vA+xX" onClick={handleConfirm}>
                            Confirm
                        </button>
                    </div>
                </section>

                <section className="summary-card">
                    <div className="stay-details flex border-buttom">
                        <img className="stay-img" src={stay.imgUrl} alt="staypreview" />
                        <div className="stay-desc">
                            <div>
                                <h4 className="stay-type">{stay.type || 'Private room'}</h4>
                                <h4 className="stay-name">{stay.name || stay.title || 'Stay'}</h4>
                            </div>
                            <div className="rating-review">
                                <span className="avg-rating">
                                    <span className="avg-rating" style={{ display: 'flex', flexWrap: 'nowrap' }}>
                                        <span className="total-avg-star">
                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path>
                                            </svg>
                                        </span>
                                        <span className="total-avg-rating" style={{ paddingLeft: 4 }}>{stay.rating || '4.77'}</span>
                                    </span>
                                </span>
                                <span className="avg-rating-seperator">•</span>
                                <span className="reviews">(5<span className="avg-rating-reviews"> reviews</span>)</span>
                            </div>
                        </div>
                    </div>

                    <div className="price-details">
                        <h3 className="price-details-header">Price details</h3>
                        <div className="cost-breakdown">
                            <div className="cost-details">
                                <div className="base-cost">
                                    <span className="cost-calc">{fmtMoney(nightlyPrice)} x {safeNights} nights</span>
                                    <span>{fmtMoney(nightlyPrice * safeNights)}</span>
                                </div>
                                <div className="base-cost service">
                                    <span className="cost-calc">Service fee</span>
                                    <span>{fmtMoney(serviceFee)}</span>
                                </div>
                            </div>
                            <div className="total-container">
                                <div className="cost-total">
                                    <span>Total <span style={{ textDecoration: 'underline' }}>({currency})</span></span>
                                    <span>{fmtMoney(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </section>
    )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { reservationService } from '../services/reservations/reservation.service.local'
import '../assets/styles/cmps/stay/mytrips.css'


const COLUMNS = [
    { key: 'destination', label: 'Destination', align: 'is-left' },
    { key: 'host', label: 'Host', align: 'is-left' },
    { key: 'checkIn', label: 'Check-in', align: 'is-left' },
    { key: 'checkOut', label: 'Checkout', align: 'is-left' },
    { key: 'bookedOn', label: 'Booked', align: 'is-left' },
    { key: 'totalPrice', label: 'Total Price', align: 'is-left' },
    { key: 'status', label: 'Status', align: 'is-right' },
]

function fmtDate(d) {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt)) return d
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function fmtMoney(n, currency = 'USD') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 })
        .format(Number(n) || 0)
}

function statusClass(s) {
    const v = String(s || '').toLowerCase()
    if (v === 'accepted' || v === 'confirmed' || v === 'paid') return 'confirmed'
    if (v === 'rejected' || v === 'canceled' || v === 'cancelled') return 'canceled'
    return 'pending'
}

function statusLabel(s) {
    const v = String(s || 'pending')
    return v.charAt(0).toUpperCase() + v.slice(1)
}

export function MyTrips() {
    const loggedInUser =
        useSelector(s => s.userModule?.user || s.userModule?.loggedinUser || null)

    const [trips, setTrips] = useState([])
    const [loading, setLoading] = useState(true)
    const [isCancelling, setIsCancelling] = useState(null)

    useEffect(() => {
        if (!loggedInUser?._id) {
            setTrips([])
            setLoading(false)
            return
        }
        loadTrips(loggedInUser._id)
    }, [loggedInUser?._id])

    async function loadTrips(userId) {
        setLoading(true)
        try {
            const res = await reservationService.query({ userId })
            const base = res.map(r => {
                const stay = r.stay || {}
                const imgUrl = r.imgUrl || stay.imgUrl || stay.coverImg || (stay.imgs && stay.imgs[0]) || ''
                const stayName = r.stayName || stay.name || stay.title || ''
                const hostFullname = r.hostFullname || stay.hostFullname || stay.host?.fullname || ''
                const hostImg = r.hostImg || stay.hostImg || stay.host?.imgUrl || ''
                const currency = r.currency || 'USD'
                const nights =
                    r.nights ||
                    Math.max(
                        1,
                        Math.ceil((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60 * 24))
                    )
                const nightly = Number(r.nightlyPrice ?? r.pricePerNight ?? 0)
                const serviceFee = Number(r.serviceFee ?? 0)
                const computedTotal = nights * nightly + serviceFee
                const totalPrice =
                    typeof r.totalPrice === 'number' ? r.totalPrice : (Number(r.totalPrice) || computedTotal)

                return {
                    id: r._id || `${r.stayId || stay._id || stay.id}-${r.checkIn}-${r.checkOut}`,
                    resId: r._id || null,
                    stayId: r.stayId || stay.id || stay._id || '',
                    imgUrl,
                    stayName,
                    hostFullname,
                    hostImg,
                    checkIn: r.checkIn,
                    checkOut: r.checkOut,
                    bookedOn: r.bookedOn || r.createdAt || Date.now(),
                    totalPrice,
                    currency,
                    status: r.status || 'pending',
                }
            })

            const enriched = await Promise.all(
                base.map(async t => {
                    if (!t.stayId) return t
                    if (t.imgUrl && t.stayName && t.hostFullname && t.hostImg) return t
                    try {
                        const resp = await fetch(`/api/stay/${t.stayId}`)
                        if (!resp.ok) return t
                        const s = await resp.json()
                        return {
                            ...t,
                            imgUrl: t.imgUrl || s?.imgs?.[0] || s?.imgUrl || '',
                            stayName: t.stayName || s?.title || s?.name || 'Stay',
                            hostFullname: t.hostFullname || s?.host?.fullname || '',
                            hostImg: t.hostImg || s?.host?.imgUrl || ''
                        }
                    } catch {
                        return t
                    }
                })
            )

            setTrips(enriched)
        } catch (err) {
            console.error('Failed to load trips', err)
            setTrips([])
        } finally {
            setLoading(false)
        }
    }

    async function onCancel(reservationId, rowId) {
        if (isCancelling) return
        setIsCancelling(rowId)
        try {
            await reservationService.remove(reservationId || rowId)
            setTrips(prev => prev.filter(t => t.id !== rowId))
        } catch (err) {
            console.error('Failed to cancel reservation', err)
        } finally {
            setIsCancelling(null)
        }
    }

    const hasTrips = trips.length > 0
    const tripsLabel = !loggedInUser
        ? 'Log in to view trips'
        : hasTrips
            ? `${trips.length} trip${trips.length === 1 ? '' : 's'}`
            : 'No trips yet'

    return (
        <section className="dashboard-listings">
            <div className="page-title">
                <h1>Trips</h1>
            </div>

            <div className="listing-title">
                <div>{tripsLabel}</div>
            </div>

            {!loggedInUser ? null : (
                <div
                    className="el-table--fit el-table--enable-row-hover el-table--enable-row-transition el-table el-table--layout-fixed is-scrolling-none"
                    data-prefix="el"
                    align="left"
                >
                    <div className="el-table__inner-wrapper">
                        <div className="hidden-columns">
                            {COLUMNS.map((_, i) => <div key={i} />)}
                        </div>

                        <div className="el-table__header-wrapper">
                            <table className="el-table__header" border="0" cellPadding="0" cellSpacing="0">
                                <colgroup>
                                    {COLUMNS.map((_, i) => <col key={i} />)}
                                </colgroup>
                                <thead>
                                    <tr>
                                        {COLUMNS.map(col => (
                                            <th key={col.key} className={`${col.align} is-leaf el-table__cell`}>
                                                <div className="cell">{col.label}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                            </table>
                        </div>

                        <div className="el-table__body-wrapper">
                            <div className="el-scrollbar">
                                <div className="el-scrollbar__wrap el-scrollbar__wrap--hidden-default">
                                    <div className="el-scrollbar__view" style={{ display: 'block', verticalAlign: 'middle' }}>
                                        <table className="el-table__body" cellSpacing="0" cellPadding="0" border="0" style={{ tableLayout: 'fixed', width: '100%' }}>
                                            <colgroup>
                                                {COLUMNS.map((_, i) => <col key={i} />)}
                                            </colgroup>
                                            <tbody>
                                                {loading && (
                                                    <tr className="el-table__row">
                                                        <td className="el-table__cell" colSpan={COLUMNS.length}>
                                                            <div className="cell" style={{ textAlign: 'center', color: '#737373' }}>Loading…</div>
                                                        </td>
                                                    </tr>
                                                )}

                                                {!loading && trips.length === 0 && (
                                                    <tr className="el-table__row">
                                                        <td className="el-table__cell" colSpan={COLUMNS.length}>
                                                            <div className="cell" style={{ textAlign: 'center', color: '#737373' }} />
                                                        </td>
                                                    </tr>
                                                )}

                                                {trips.map(t => (
                                                    <tr key={t.id} className="el-table__row">
                                                        <td className="is-left el-table__cell">
                                                            <div className="cell">
                                                                <Link to={`/stay/${t.stayId}`} className="">
                                                                    <div className="listing-preview">
                                                                        {t.imgUrl ? (
                                                                            <img src={t.imgUrl} alt="listing preview" />
                                                                        ) : (
                                                                            <div style={{ width: 96, height: 72, background: '#eee', borderRadius: 8 }} />
                                                                        )}
                                                                        <h3 className="listing-name">{t.stayName || 'Stay'}</h3>
                                                                    </div>
                                                                </Link>
                                                            </div>
                                                        </td>

                                                        <td className="is-left el-table__cell">
                                                            <div className="cell">
                                                                <div className="host-preview" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    {t.hostImg ? (
                                                                        <img
                                                                            src={t.hostImg}
                                                                            alt={t.hostFullname || 'Host'}
                                                                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            style={{
                                                                                width: 32, height: 32, borderRadius: '50%',
                                                                                background: '#eee', display: 'inline-flex',
                                                                                alignItems: 'center', justifyContent: 'center',
                                                                                fontSize: 12, fontWeight: 700, color: '#555'
                                                                            }}
                                                                        >
                                                                            {(t.hostFullname || 'H').slice(0, 1).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <h3 className="renter-fullname handle-overflow">{t.hostFullname}</h3>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="is-left el-table__cell"><div className="cell">{fmtDate(t.checkIn)}</div></td>
                                                        <td className="is-left el-table__cell"><div className="cell">{fmtDate(t.checkOut)}</div></td>
                                                        <td className="is-left el-table__cell"><div className="cell">{fmtDate(t.bookedOn)}</div></td>
                                                        <td className="is-left el-table__cell"><div className="cell">{fmtMoney(t.totalPrice, t.currency)}</div></td>
                                                        <td className="is-right el-table__cell">
                                                            <div className="cell" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                                                                <span className={`order-status badge ${statusClass(t.status)}`} data-status={statusClass(t.status)}>
                                                                    {statusLabel(t.status)}
                                                                </span>
                                                                {statusClass(t.status) === 'pending' && (
                                                                    <button
                                                                        type="button"
                                                                        className="cancel-btn"
                                                                        disabled={isCancelling === t.id}
                                                                        onClick={() => onCancel(t.resId, t.id)}
                                                                    >
                                                                        {isCancelling === t.id ? 'Cancelling…' : 'Cancel'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="el-scrollbar__bar is-horizontal" style={{ display: 'none' }}>
                                    <div className="el-scrollbar__thumb" />
                                </div>
                                <div className="el-scrollbar__bar is-vertical" style={{ display: 'none' }}>
                                    <div className="el-scrollbar__thumb" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="el-table__column-resize-proxy" style={{ display: 'none' }} />
                </div>
            )}
        </section>
    )
}

export default MyTrips

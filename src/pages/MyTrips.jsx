import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { reservationService } from '../services/reservations/reservation.service.local'
import { AppFooter } from '../cmps/AppFooter'
import '../assets/styles/cmps/stay/mytrips.css'

function fmtDate(d) {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function fmtMoney(n, currency = 'USD') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0)
}

export function MyTrips() {
    const user = useSelector(s => s.userModule?.user || s.userModule?.loggedinUser || null)
    const [trips, setTrips] = useState([])
    const currency = 'USD'

    useEffect(() => {
        let ignore = false
        async function load() {
            try {
                if (!user) { setTrips([]); return }
                const res = await reservationService.query({ userId: user._id || user.id })
                if (!ignore) setTrips(Array.isArray(res) ? res : [])
            } catch {
                if (!ignore) setTrips([])
            }
        }
        load()
        return () => { ignore = true }
    }, [user])

    const rows = useMemo(() => {
        return trips.map(r => {
            const nights = Number(r.nights) || Math.max(1, Math.ceil((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60 * 24)))
            const nightly = Number(r.nightlyPrice) || 0
            const serviceFee = Number(r.serviceFee) || Math.round(nightly * nights * 0.05)
            const total = Number(r.totalPrice) || nightly * nights + serviceFee
            return {
                id: r._id || `${r.userId}-${r.stayId}-${r.checkIn || ''}`,
                imgUrl: r.imgUrl || r.stay?.imgUrl || '',
                name: r.stayName || r.stay?.name || r.stay?.title || 'Stay',
                host: r.hostFullname || r.stay?.hostFullname || '',
                checkIn: r.checkIn,
                checkOut: r.checkOut,
                guests: r.guests || 1,
                nightly,
                nights,
                total,
                status: (r.status || 'pending').toLowerCase()
            }
        })
    }, [trips])

    async function onCancel(id) {
        const getKey = r => r._id || `${r.userId}-${r.stayId}-${r.checkIn || ''}`
        setTrips(prev => prev.filter(r => getKey(r) !== id))
        try {
            await reservationService.remove(id)
        } catch {
            try {
                const res = await reservationService.query({})
                setTrips(Array.isArray(res) ? res : [])
            } catch {
                setTrips([])
            }
        }
    }

    return (
        <div style={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }}>
            <section className="dashboard-listings" style={{ flex: '1 0 auto', margin: 0, paddingBottom: 0 }}>
                <div className="page-title" style={{ marginTop: 0, marginBottom: 0 }}>
                    <h1 style={{ margin: 0 }}>Trips</h1>
                </div>

                <div className="listing-title" style={{ marginTop: 12, marginBottom: 0 }}>
                    {rows.length ? `${rows.length} reservations` : 'No trips yet'}
                </div>

                <div className="el-table el-table--fit" style={{ marginBottom: 0 }}>
                    <div className="el-table__header-wrapper">
                        <table className="el-table__header" cellPadding="0" cellSpacing="0" border="0">
                            <colgroup>
                                <col /><col /><col /><col /><col /><col /><col />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="el-table__cell"><div className="cell">Listing</div></th>
                                    <th className="el-table__cell"><div className="cell">Dates</div></th>
                                    <th className="el-table__cell"><div className="cell">Guests</div></th>
                                    <th className="el-table__cell"><div className="cell">Nightly</div></th>
                                    <th className="el-table__cell"><div className="cell">Nights</div></th>
                                    <th className="el-table__cell"><div className="cell">Total</div></th>
                                    <th className="el-table__cell is-right"><div className="cell">Actions</div></th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    <div className="el-table__body-wrapper">
                        <table className="el-table__body" cellPadding="0" cellSpacing="0" border="0">
                            <colgroup>
                                <col /><col /><col /><col /><col /><col /><col />
                            </colgroup>
                            <tbody>
                                {rows.map(r => (
                                    <tr className="el-table__row" key={r.id}>
                                        <td className="el-table__cell">
                                            <div className="cell">
                                                <div className="listing-preview">
                                                    <img src={r.imgUrl || 'https://via.placeholder.com/70'} alt="" />
                                                    <p className="listing-name">{r.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="el-table__cell">
                                            <div className="cell">{fmtDate(r.checkIn)} – {fmtDate(r.checkOut)}</div>
                                        </td>
                                        <td className="el-table__cell">
                                            <div className="cell">{r.guests}</div>
                                        </td>
                                        <td className="el-table__cell">
                                            <div className="cell">{fmtMoney(r.nightly, currency)}</div>
                                        </td>
                                        <td className="el-table__cell">
                                            <div className="cell">{r.nights}</div>
                                        </td>
                                        <td className="el-table__cell is-right">
                                            <div className="cell">{fmtMoney(r.total, currency)}</div>
                                        </td>
                                        <td className="el-table__cell is-right">
                                            <div className="cell">
                                                <span className={`status ${r.status}`} data-status={r.status}>
                                                    {r.status}
                                                </span>
                                                <button
                                                    className="cancel-btn"
                                                    onClick={() => onCancel(r.id)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default MyTrips

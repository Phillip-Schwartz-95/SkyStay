import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { reservationService } from '../services/reservations/reservation.service.local'
import { showErrorMsg } from '../services/event-bus.service'
import '../assets/styles/cmps/stay/mytrips.css'

function fmtDate(date) {
    if (!date) return ''
    try {
        return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
        return String(date)
    }
}

export function MyTrips() {
    const [trips, setTrips] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        let mounted = true
        setLoading(true)
        reservationService.query()
            .then(res => {
                if (!mounted) return
                setTrips(Array.isArray(res) ? res : [])
            })
            .catch(err => {
                showErrorMsg('Cannot load trips')
                console.error('MyTrips load error', err)
            })
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [])

    function onCancel(reservationId) {
        reservationService.updateStatus(reservationId, 'canceled')
            .then(() => {
                setTrips(prev => prev.map(t => t._id === reservationId ? { ...t, status: 'canceled' } : t))
            })
            .catch(() => showErrorMsg('Cannot cancel reservation'))
    }

    return (
        <section className="dashboard-listings mytrips-page">
            <div className="page-title">
                <h1>Trips</h1>
            </div>

            <div className="listing-title">
                {loading ? 'Loading trips...' : (trips.length ? `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}` : 'No trips yet')}
            </div>

            <div className="el-table el-table--fit">
                <div className="el-table__header-wrapper">
                    <table>
                        <colgroup>
                            <col width="35.466%" />
                            <col width="15.127%" />
                            <col width="10.085%" />
                            <col width="10.085%" />
                            <col width="10.085%" />
                            <col width="11.102%" />
                            <col width="8.051%" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="el-table__cell"><div className="cell">Listing</div></th>
                                <th className="el-table__cell"><div className="cell">Host</div></th>
                                <th className="el-table__cell"><div className="cell">Dates</div></th>
                                <th className="el-table__cell"><div className="cell">Guests</div></th>
                                <th className="el-table__cell"><div className="cell">Price</div></th>
                                <th className="el-table__cell is-right"><div className="cell">Status</div></th>
                                <th className="el-table__cell is-right"><div className="cell">Actions</div></th>
                            </tr>
                        </thead>
                    </table>
                </div>

                <div className="el-table__body-wrapper">
                    <table>
                        <colgroup>
                            <col width="35.466%" />
                            <col width="15.127%" />
                            <col width="10.085%" />
                            <col width="10.085%" />
                            <col width="10.085%" />
                            <col width="11.102%" />
                            <col width="8.051%" />
                        </colgroup>
                        <tbody>
                            {trips.map((t) => (
                                <tr key={t._id} className="el-table__row">
                                    <td className="el-table__cell">
                                        <div className="cell listing-preview">
                                            <img src={t.imgUrl || t.stay?.imgUrl || '/assets/img/fallback.jpg'} alt={t.stay?.name || 'listing'} />
                                            <div>
                                                <div className="listing-name"><Link to={`/stay/${t.stayId || t.stay?.id || ''}`}>{t.stayName || t.stay?.name || 'Listing'}</Link></div>
                                                <div className="listing-sub">{t.stay?.type || 'Private room'}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="el-table__cell">
                                        <div className="cell">
                                            <div style={{ fontWeight: 600 }}>{t.hostFullname || (t.stay && t.stay.hostFullname) || 'Host'}</div>
                                            <div className="tiny muted">{t.hostEmail || ''}</div>
                                        </div>
                                    </td>

                                    <td className="el-table__cell">
                                        <div className="cell">
                                            <div>{fmtDate(t.checkIn)} — {fmtDate(t.checkOut)}</div>
                                            <div className="tiny muted">{Math.max(1, t.nights || 1)} nights</div>
                                        </div>
                                    </td>

                                    <td className="el-table__cell">
                                        <div className="cell">{t.guests || 1}</div>
                                    </td>

                                    <td className="el-table__cell">
                                        <div className="cell">{t.currency || 'USD'} {Number(t.totalPrice || t.total || 0).toFixed(2)}</div>
                                    </td>

                                    <td className="el-table__cell">
                                        <div className="cell is-right">
                                            <span className={`status-badge ${t.status ? t.status.toLowerCase() : ''}`}>{t.status || 'pending'}</span>
                                        </div>
                                    </td>

                                    <td className="el-table__cell">
                                        <div className="cell is-right">
                                            <button className="cancel-btn" onClick={() => onCancel(t._id)} disabled={t.status === 'canceled' || t.status === 'paid'}>Cancel</button>
                                            <button className="view-btn" onClick={() => navigate(`/stay/${t.stayId || t.stay?._id}`)}>View</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!loading && trips.length === 0 && (
                                <tr>
                                    <td className="el-table__cell" colSpan="7">
                                        <div className="cell">No trips found.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}

export default MyTrips

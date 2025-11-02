import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { reservationService } from '../services/reservations/reservation.service.remote'
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

function truncateWords(str, n) {
    const s = String(str || '').trim()
    if (!s) return ''
    const words = s.split(/\s+/)
    if (words.length <= n) return s
    return words.slice(0, n).join(' ') + '…'
}

// Normalize various id shapes (string, ObjectId-like, {$oid})
function toId(v) {
    if (v == null) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'object' && v.$oid) return v.$oid
    return String(v)
}

export function HostPending() {
    const user = useSelector(s => s.userModule?.user || s.userModule?.loggedinUser || null)
    const [reservations, setReservations] = useState([])
    const [savingId, setSavingId] = useState('')
    const currency = 'USD'

    useEffect(() => {
        let ignore = false
        async function load() {
            try {
                if (!user) {
                    window.dispatchEvent(new Event('open-login-modal'))
                    setReservations([]);
                    return
                }

                const hostId = user._id || user.id
                const res = await reservationService.query({ hostId })
                if (!ignore) setReservations(Array.isArray(res) ? res : [])
            } catch {
                if (!ignore) setReservations([])
            }
        }
        load()
        return () => { ignore = true }
    }, [user])

    const rows = useMemo(() => {
        return reservations.map(r => {
            const status = String(r.status || 'pending').toLowerCase()

            const checkIn = r.checkIn ?? r.startDate ?? r.from ?? r.dateFrom ?? r.beginDate ?? ''
            const checkOut = r.checkOut ?? r.endDate ?? r.to ?? r.dateTo ?? r.finishDate ?? ''
            const tIn = new Date(checkIn).getTime()
            const tOut = new Date(checkOut).getTime()
            const ms = (Number.isFinite(tIn) && Number.isFinite(tOut)) ? (tOut - tIn) : NaN

            const nights = Number.isFinite(ms) && ms > 0
                ? Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
                : (Number(r.nights) || 1)

            const nightly = Number(r.nightlyPrice ?? r.pricePerNight ?? r.price) || 0
            const serviceFee = Number(r.serviceFee) || Math.round(nightly * nights * 0.05)
            const total = Number(r.totalPrice ?? r.total) || nightly * nights + serviceFee

            const idStr = toId(r._id || r.id)

            return {
                _id: r._id,
                id: idStr,
                imgUrl: r.imgUrl || r.stay?.imgUrl || '',
                name: r.stayName || r.stay?.name || r.stay?.title || 'Stay',
                guestName: r.userFullname || r.guestFullname || r.user?.fullname || '',
                checkIn,
                checkOut,
                guests: r.guests || r.numGuests || 1,
                nightly,
                nights,
                total,
                status
            }
        })
    }, [reservations])

    async function reloadAll() {
        try {
            const hostId = user?._id || user?.id
            const res = await reservationService.query({ hostId })
            setReservations(Array.isArray(res) ? res : [])
        } catch {
            setReservations([])
        }
    }

    async function setStatus(id, status) {
        const idStr = toId(id)
        const norm = String(status).toLowerCase()

        // Optimistic UI
        setSavingId(idStr)
        setReservations(prev =>
            prev.map(r => (toId(r._id || r.id) === idStr ? { ...r, status: norm } : r))
        )

        try {
            // Persist
            await reservationService.updateStatus(idStr, norm)
            // Re-sync from server (overwrite any drift)
            await reloadAll()
        } catch {
            // On error, re-fetch to revert the optimistic change
            await reloadAll()
        } finally {
            setSavingId('')
        }
    }

    const btnBlack = {
        padding: '6px 10px',
        borderRadius: 20,
        border: '1px solid #000',
        background: '#000',
        color: '#fff',
        minWidth: 92,
        cursor: 'pointer',
        fontSize: '.82rem',
        lineHeight: 1.1
    }
    const btnBlackDisabled = { ...btnBlack, opacity: 0.6, cursor: 'not-allowed' }

    const cellTight = { paddingTop: 6, paddingBottom: 6, fontSize: '.88rem' }

    const listingWrap = {
        display: 'grid',
        gridTemplateColumns: '44px 1fr',
        alignItems: 'center',
        gap: 6,
        minWidth: 0
    }
    const thumb = { width: 44, height: 44, borderRadius: 8, objectFit: 'cover', background: '#f3f3f3' }
    const nameClamp = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, fontSize: '.9rem', lineHeight: 1.2 }

    const wrapLeftNarrow = { maxWidth: 1100, marginLeft: 0, marginRight: 'auto' }

    const cols = [
        { width: '20%' },
        { width: 'calc(16% + 30px)' },
        { width: 'calc(7% + 30px)' },
        { width: 'calc(10% + 30px)' },
        { width: 'calc(7% + 30px)' },
        { width: 'calc(12% + 30px)' },
        { width: 'calc(8% + 30px)' },
        { width: '20%' }
    ]

    return (
        <div className="host-pending" style={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }}>
            <section className="dashboard-listings" style={{ flex: '1 0 auto', margin: 0, paddingBottom: 0 }}>
                <div className="page-title" style={{ marginTop: 0, marginBottom: 0 }}>
                    <h1 style={{ margin: 0 }}>Pending</h1>
                </div>

                <div className="listing-title" style={{ marginTop: 12, marginBottom: 0 }}>
                    {rows.length ? `${rows.filter(r => (r.status || '').toLowerCase() === 'pending').length} pending requests` : 'No requests'}
                </div>

                <div className="el-table el-table--fit" style={{ marginBottom: 0 }}>
                    <div className="el-table__header-wrapper" style={wrapLeftNarrow}>
                        <table className="el-table__header" cellPadding="0" cellSpacing="0" border="0">
                            <colgroup>
                                {cols.map((c, i) => <col key={'h' + i} style={{ width: c.width }} />)}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="el-table__cell"><div className="cell">Listing</div></th>
                                    <th className="el-table__cell"><div className="cell">Dates</div></th>
                                    <th className="el-table__cell"><div className="cell">Guests</div></th>
                                    <th className="el-table__cell"><div className="cell">Nightly</div></th>
                                    <th className="el-table__cell"><div className="cell">Nights</div></th>
                                    <th className="el-table__cell"><div className="cell">Total</div></th>
                                    <th className="el-table__cell"><div className="cell">Status</div></th>
                                    <th className="el-table__cell is-right">
                                        <div className="cell" style={{ textAlign: 'right', paddingRight: 20 }}>Action</div>
                                    </th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    <div className="el-table__body-wrapper" style={wrapLeftNarrow}>
                        <table className="el-table__body" cellPadding="0" cellSpacing="0" border="0">
                            <colgroup>
                                {cols.map((c, i) => <col key={'b' + i} style={{ width: c.width }} />)}
                            </colgroup>
                            <tbody>
                                {rows.map(r => {
                                    const displayName = truncateWords(r.name, 5)
                                    const isPending = (r.status || '').toLowerCase() === 'pending'
                                    const rowId = toId(r.id)
                                    const isSaving = savingId === rowId

                                    return (
                                        <tr className="el-table__row" key={rowId}>
                                            <td className="el-table__cell" style={cellTight}>
                                                <div className="cell" style={listingWrap}>
                                                    <img src={r.imgUrl || 'https://via.placeholder.com/44'} alt="" style={thumb} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className="listing-name" style={nameClamp}>
                                                            {displayName}{r.guestName ? ` — ${r.guestName}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="el-table__cell" style={cellTight}>
                                                <div className="cell" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                                                    <span>{fmtDate(r.checkIn)}</span>
                                                    <span>{fmtDate(r.checkOut)}</span>
                                                </div>
                                            </td>

                                            <td className="el-table__cell" style={cellTight}><div className="cell">{r.guests}</div></td>
                                            <td className="el-table__cell" style={cellTight}><div className="cell">{fmtMoney(r.nightly, currency)}</div></td>
                                            <td className="el-table__cell" style={cellTight}><div className="cell">{r.nights}</div></td>

                                            <td className="el-table__cell" style={cellTight}>
                                                <div className="cell" style={{ textAlign: 'left' }}>{fmtMoney(r.total, currency)}</div>
                                            </td>

                                            <td className="el-table__cell" style={cellTight}>
                                                <div className="cell">
                                                    <span
                                                        className={`status ${r.status}`}
                                                        data-status={r.status}
                                                        style={{ textTransform: 'capitalize' }}
                                                    >
                                                        {r.status}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="el-table__cell is-right" style={cellTight}>
                                                <div
                                                    className="cell"
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6,
                                                        alignItems: 'flex-end',
                                                        justifyContent: 'flex-end'
                                                    }}
                                                >
                                                    <button
                                                        className="btn-approve"
                                                        disabled={isSaving || !isPending}
                                                        onClick={() => setStatus(rowId, 'approved')}
                                                        style={isSaving || !isPending ? { ...btnBlack, opacity: 0.6, cursor: 'not-allowed' } : btnBlack}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="btn-decline"
                                                        disabled={isSaving || !isPending}
                                                        onClick={() => setStatus(rowId, 'declined')}
                                                        style={isSaving || !isPending ? { ...btnBlack, opacity: 0.6, cursor: 'not-allowed' } : btnBlack}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default HostPending

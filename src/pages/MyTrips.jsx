import React from 'react'
import { Link } from 'react-router-dom'
import '../assets/styles/cmps/stay/mytrips.css'

export default function MyTrips() {
    const trips = [
        {
            id: 't1',
            stayId: '622f337a75c7d36e498aab00',
            img: 'http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436993/yzxnnw83e9qyas022au4.jpg',
            name: 'Monte dos Burgos - Cosy Room',
            host: 'Patrícia Sousa Casimiro',
            checkIn: '10/26/2025',
            checkOut: '10/27/2025',
            bookedOn: '10/26/2025',
            totalPrice: 30,
            status: 'Pending'
        }
    ]

    return (
        <section className="dashboard-listings">
            <div className="page-title">
                <h1>Trips</h1>
            </div>

            <div className="listing-title">
                <div>{trips.length} {trips.length === 1 ? 'trip' : 'trips'}</div>
            </div>

            <div className="el-table el-table--fit el-table--enable-row-hover el-table--layout-fixed">
                <div className="el-table__inner-wrapper">
                    <div className="el-table__header-wrapper">
                        <table className="el-table__header" cellPadding="0" cellSpacing="0" style={{ width: 2360 }}>
                            <colgroup>
                                <col width="837" />
                                <col width="357" />
                                <col width="238" />
                                <col width="238" />
                                <col width="238" />
                                <col width="262" />
                                <col width="190" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="el-table__cell is-left"><div className="cell">Destination</div></th>
                                    <th className="el-table__cell is-left"><div className="cell">Host</div></th>
                                    <th className="el-table__cell is-left"><div className="cell">Check-in</div></th>
                                    <th className="el-table__cell is-left"><div className="cell">Checkout</div></th>
                                    <th className="el-table__cell is-left"><div className="cell">Booked</div></th>
                                    <th className="el-table__cell is-left"><div className="cell">Total Price</div></th>
                                    <th className="el-table__cell is-right"><div className="cell">Status</div></th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    <div className="el-table__body-wrapper">
                        <div className="el-scrollbar">
                            <div className="el-scrollbar__wrap el-scrollbar__wrap--hidden-default">
                                <div className="el-scrollbar__view" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                    <table className="el-table__body" cellSpacing="0" cellPadding="0" style={{ tableLayout: 'fixed', width: 2360 }}>
                                        <colgroup>
                                            <col width="837" />
                                            <col width="357" />
                                            <col width="238" />
                                            <col width="238" />
                                            <col width="238" />
                                            <col width="262" />
                                            <col width="190" />
                                        </colgroup>
                                        <tbody>
                                            {trips.map(t => (
                                                <tr key={t.id} className="el-table__row">
                                                    <td className="el-table__cell is-left">
                                                        <div className="cell">
                                                            <Link to={`/stay/${t.stayId}`} className="listing-preview">
                                                                <img src={t.img} alt="listing preview" />
                                                                <div className="listing-copy">
                                                                    <h3 className="listing-name">{t.name}</h3>
                                                                    <span className="listing-city">View stay</span>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    </td>
                                                    <td className="el-table__cell is-left">
                                                        <div className="cell">
                                                            <h3 className="renter-fullname handle-overflow">{t.host}</h3>
                                                        </div>
                                                    </td>
                                                    <td className="el-table__cell is-left"><div className="cell">{t.checkIn}</div></td>
                                                    <td className="el-table__cell is-left"><div className="cell">{t.checkOut}</div></td>
                                                    <td className="el-table__cell is-left"><div className="cell">{t.bookedOn}</div></td>
                                                    <td className="el-table__cell is-left"><div className="cell">${t.totalPrice.toFixed(2)}</div></td>
                                                    <td className="el-table__cell is-right">
                                                        <div className="cell">
                                                            <span className={`order-status badge ${t.status.toLowerCase()}`}>{t.status}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="el-scrollbar__bar is-horizontal" style={{ display: 'none' }}><div className="el-scrollbar__thumb" /></div>
                            <div className="el-scrollbar__bar is-vertical" style={{ display: 'none' }}><div className="el-scrollbar__thumb" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

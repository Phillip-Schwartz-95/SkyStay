import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { stayService } from '../services/stay'
import { Link } from 'react-router-dom'

export function HostingDashboard() {
    const user = useSelector(storeState => storeState.userModule.user)
    const [myStays, setMyStays] = useState([])

    useEffect(() => {
        loadMyStays()
    }, [])

    async function loadMyStays() {
        const allStays = await stayService.query()
        const hostStays = allStays.filter(stay => stay.host.fullname === user.fullname)
        setMyStays(hostStays)
    }

    if (!user?.isHost) {
        return (
            <section className="hosting-dashboard">
                <h2>You’re not a host yet!</h2>
                <Link to="/host/start">Become a host</Link>
            </section>
        )
    }

    return (
        <section className="hosting-dashboard container">
            <h2>Here are your current listings {user.fullname}</h2>

            {!myStays.length ? (
                <div>
                    <p>You haven’t added any stays yet.</p>
                    <Link to="/host/new" className="btn-primary">Add your first stay</Link>
                </div>
            ) : (
                <ul className="my-stays-list">
                    {myStays.map(stay => (
                        <li key={stay._id} className="my-stay-item">
                            <img src={stay.imgs[0]} alt={stay.title} />
                            <div>
                                <h4>{stay.title}</h4>
                                <p>{stay.loc.city}, {stay.loc.country}</p>
                                <p>${stay.price} / night</p>
                                <Link to={`/stay/${stay._id}`}>View</Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

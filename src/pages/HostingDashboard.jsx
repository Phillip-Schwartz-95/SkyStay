import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { stayService } from '../services/stay'
import { StayPreview } from '../cmps/StayPreview.jsx'

export function HostingDashboard() {
    const user = useSelector(storeState => storeState.userModule.user)
    const [myStays, setMyStays] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        if (!user) {
            navigate('/auth/login')
            return
        }
        loadMyStays(user._id)
    }, [user, navigate])

    async function loadMyStays(userId) {
        try {
            const stays = await stayService.query({ hostId: userId })
            setMyStays(Array.isArray(stays) ? stays : [])
        } finally {
            setIsLoading(false)
        }
    }

    if (!user) return null

    const isHostDerived = Boolean(user.isHost) || myStays.length > 0

    if (!isHostDerived) {
        return (
            <section className="hosting-dashboard container">
                <h2>You’re not a host yet</h2>
                <Link to="/host/start" className="btn-primary">Become a host</Link>
            </section>
        )
    }

    return (
        <section className="hosting-dashboard container">
            <header className="hosting-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Your listings</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'var(--gray2)' }}>{myStays.length} {myStays.length === 1 ? 'listing' : 'listings'}</span>
                    <Link to="/host/new" className="btn-primary">Create new listing</Link>
                </div>
            </header>

            {isLoading ? (
                <div>Loading…</div>
            ) : myStays.length === 0 ? (
                <div className="empty-state">
                    <p>No listings yet.</p>
                    <Link to="/host/new" className="btn-primary">Create your first listing</Link>
                </div>
            ) : (
                <div className="results-grid">
                    {myStays.map(stay => (
                        <StayPreview key={stay._id} stay={stay} />
                    ))}
                </div>
            )}
        </section>
    )
}

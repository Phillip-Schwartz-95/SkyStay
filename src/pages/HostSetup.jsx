import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { becomeHost } from '../store/actions/user.actions'

export function HostSetup() {
    const user = useSelector(storeState => storeState.userModule.user)
    const navigate = useNavigate()
    const [form, setForm] = useState({
        placeType: '',
        location: '',
        guests: 1,
        agree: false,
    })
    const isValid = form.placeType && form.location && form.guests >= 1 && form.agree

    useEffect(() => {
        if (!user) {
            showErrorMsg('Please log in to become a host')
            navigate('/auth/login')
        }
    }, [user, navigate])

    function handleChange(ev) {
        const { name, value, type, checked } = ev.target
        const v = type === 'checkbox' ? checked : (name === 'guests' ? +value : value)
        setForm(prev => ({ ...prev, [name]: v }))
    }

    async function onSubmit(ev) {
        ev.preventDefault()
        if (!isValid || !user) return
        try {
            await becomeHost(user, form)
            showSuccessMsg('You are now a host')
            navigate('/host/new')
        } catch (err) {
            showErrorMsg('Failed to complete hosting setup')
        }
    }

    return (
        <section className="host-setup container">
            <h2>Become a SkyStay Host</h2>
            <p>Answer a few quick questions to get started hosting.</p>
            <form onSubmit={onSubmit}>
                <label>
                    What kind of place will you host?
                    <input
                        name="placeType"
                        placeholder="Apartment, House, Cabin..."
                        value={form.placeType}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Where is it located?
                    <input
                        name="location"
                        placeholder="City, Country"
                        value={form.location}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    How many guests can stay?
                    <input
                        name="guests"
                        type="number"
                        min="1"
                        max="16"
                        value={form.guests}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label className="agree-box">
                    <input
                        type="checkbox"
                        name="agree"
                        checked={form.agree}
                        onChange={handleChange}
                    />
                    I agree to follow SkyStay’s hosting standards
                </label>
                <button className="btn-primary" disabled={!isValid}>Become a Host</button>
            </form>
        </section>
    )
}

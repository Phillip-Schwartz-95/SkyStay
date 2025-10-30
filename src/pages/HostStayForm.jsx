import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { stayService } from '../services/stay'
import { showSuccessMsg } from '../services/event-bus.service'

export function HostStayForm() {
    const user = useSelector(storeState => storeState.userModule.user)
    const navigate = useNavigate()

    const [stay, setStay] = useState({
        title: '',
        city: '',
        country: '',
        price: '',
        maxGuests: '',
        imgUrl: '',
    })

    function handleChange({ target }) {
        const { name, value } = target
        setStay(prev => ({ ...prev, [name]: value }))
    }

    async function onSaveStay(ev) {
        ev.preventDefault()
        const stayToSave = {
            ...stay,
            price: +stay.price,
            host: user,
            loc: { city: stay.city, country: stay.country },
            imgs: [stay.imgUrl],
        }

        await stayService.save(stayToSave)
        showSuccessMsg('Stay listed successfully!')
        navigate('/hosting')
    }

    return (
        <section className="stay-host-form container">
            <h2>Add a New Stay</h2>

            <form onSubmit={onSaveStay}>
                <label>
                    Title:
                    <input name="title" value={stay.title} onChange={handleChange} required />
                </label>

                <label>
                    City:
                    <input name="city" value={stay.city || ''} onChange={handleChange} required />
                </label>

                <label>
                    Country:
                    <input name="country" value={stay.country || ''} onChange={handleChange} required />
                </label>

                <label>
                    Price per night:
                    <input name="price" type="number" min="1" value={stay.price || ''} onChange={handleChange} required />
                </label>

                <label>
                    Max Guests:
                    <input name="maxGuests" type="number" min="1" max="16" value={stay.maxGuests || ''} onChange={handleChange} />
                </label>

                <label>
                    Image URL:
                    <input name="imgUrl" value={stay.imgUrl || ''} onChange={handleChange} />
                </label>

                <button className="btn-primary">Save Stay</button>
            </form>
        </section>
    )
}

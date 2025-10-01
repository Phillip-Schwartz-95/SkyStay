import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { loadStay, addStayMsg } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'

export function StayDetails() {
  const { stayId } = useParams()
  const stay = useSelector(storeState => storeState.stayModule.stay)
  const [msgTxt, setMsgTxt] = useState('')

  useEffect(() => {
    loadStay(stayId)
  }, [stayId])

  async function onAddStayMsg(ev) {
    ev.preventDefault()
    try {
      await addStayMsg(stayId, msgTxt)
      showSuccessMsg('Message added')
      setMsgTxt('')
    } catch (err) {
      showErrorMsg('Cannot add message')
    }
  }

  if (!stay) return <div>Loading...</div>

  return (
    <section className="stay-details">
      {/* Title */}
      <header className="stay-header">
        <h1 className="stay-title">{stay.title}</h1>
      </header>

      {/* Photo Gallery */}
      <div className="photo-gallery">
        {stay.imgs?.map((img, idx) => (
          <img key={idx} src={img} alt={`Stay image ${idx + 1}`} />
        ))}
      </div>

      {/* Details Layout */}
      <div className="details-layout">
        {/* Left Column */}
        <div className="details-left">
          {/* Host Info */}
          <p className="stay-location">Room in {stay.loc?.city}</p>
          <div className="host-info">
            <span>Hosted by {stay.host?.fullname}</span>
            <p>{stay.host?.reviews} reviews · {stay.host?.rating} average</p>
          </div>

          {/* Listing Highlights */}
          <ul className="listing-highlights">
            <li>Exceptional check-in experience</li>
            <li>Walkable area</li>
            <li>Free cancellation before Dec 4</li>
          </ul>

          {/* Room Description */}
          <section className="room-description">
            <p>
              The Social Space is a nonprofit that transforms abandoned buildings into social hubs.
              This hotel was formerly part of the Brown chain and now serves soldiers until the building is demolished.
              Each room includes a double bed, private bathroom, refrigerator, and TV.
            </p>
          </section>

          {/* Amenities */}
          <section className="stay-amenities">
            <h2>What this place offers</h2>
            <ul>
              {stay.amenities?.map((a, idx) => <li key={idx}>✔ {a}</li>)}
            </ul>
          </section>

          {/* Calendar */}
          <section className="stay-calendar">
            <h2>Insert Calendar</h2>
          </section>
        </div>

        {/* Right Column (Booking Card) */}
        <aside className="details-right booking-card">
          <div className="booking-form">
            <input type="date" />
            <input type="date" />
            <select>
              <option>1 guest</option>
              <option>2 guests</option>
            </select>
            <button className="reserve-btn">Reserve</button>
          </div>
        </aside>
      </div>

      {/* Full-width Sections Below */}
      <section className="stay-reviews">
        <h2>Guest Reviews</h2>
        <ul>
          {stay.msgs?.map(msg => (
            <li key={msg.id}>
              <strong>{msg.by.fullname}</strong>: {msg.txt}
            </li>
          ))}
        </ul>
        <form onSubmit={onAddStayMsg}>
          <input
            type="text"
            value={msgTxt}
            onChange={ev => setMsgTxt(ev.target.value)}
            placeholder="Leave a message..."
          />
          <button type="submit">Send</button>
        </form>
      </section>

      <section className="stay-location-map">
        <h2>Where you'll be</h2>
        <p className="map-location">{stay.loc?.city}, {stay.loc?.country}</p>
        <div id="map"></div>
      </section>

     <section className="meet-your-host">
  <h2>Meet your host</h2>
  <div className="host-card">
    {/* Left Side */}
    <div className="host-left">
      <img src={stay.host?.imgUrl} alt={stay.host?.fullname} className="host-photo" />
      <p className="host-role">{stay.host?.role}</p>
      <p className="host-fact">🎶 {stay.host?.favoritesong}</p>
      <p className="host-bio">{stay.host?.bio}</p>
    </div>

    {/* Right Side */}
    <div className="host-right">
      <div className="host-header">
        <h3>{stay.host?.fullname}</h3>
        {stay.host?.isSuperhost && <span className="superhost-badge">🌟 Superhost</span>}
      </div>
      <p>{stay.host?.monthsHosting} months hosting</p>
      <p>{stay.host?.reviews} reviews · {stay.host?.rating} average rating</p>
      <p>💬 Response rate: {stay.host?.responseRate}%</p>
      <p>⏱️ Responds within: {stay.host?.responseTime}</p>
      <button className="message-host-btn">Message Host</button>
    </div>
  </div>
</section>

    <section className="things-to-know">
  <h2>Things to know</h2>
  <div className="info-grid">
    <div className="info-block">
      <h3>House Rules</h3>
      <ul>
        <li>Check-in after 3:00 PM</li>
        <li>Checkout before 11:00 AM</li>
        <li>2 guests maximum</li>
      </ul>
    </div>

    <div className="info-block">
      <h3>Safety & Property</h3>
      <ul>
        <li>Carbon monoxide alarm not reported</li>
        <li>Smoke alarm not reported</li>
      </ul>
    </div>

    <div className="info-block">
      <h3>Cancellation Policy</h3>
      <ul>
        <li>Free cancellation before Oct 13</li>
        <li>Non-refundable after that</li>
      </ul>
    </div>
  </div>
</section>

    </section>
  )
}
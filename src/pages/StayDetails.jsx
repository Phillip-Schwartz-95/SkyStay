import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { loadStay, addStayMsg } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { reviewService } from '../services/review'
import { ReviewBreakdown } from '../cmps/ReviewBreakdown'


export function StayDetails() {
  const { stayId } = useParams()
  const stay = useSelector(storeState => storeState.stayModule.stay)
  const [msgTxt, setMsgTxt] = useState('')
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    loadStay(stayId)
    loadReviews()
  }, [stayId])

  async function loadReviews() {
    try {
      const res = await reviewService.query({ aboutStayId: stayId })
      setReviews(res)
    } catch (err) {
      console.error('Failed to load reviews', err)
    }
  }

  //calculate ratings from reviews
  const starCounts = reviews.reduce((acc, review) => {
    const stars = review.rating || 5
    acc[stars] = (acc[stars] || 0) + 1
    return acc
  }, {})

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
    <section className='stay-details-wrapper'>
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
            <p className="stay-location">Room in {stay.loc?.city}</p>
            <div className="host-info">
              <span>Hosted by {stay.host?.fullname}</span>
              <p>
                {stay.host?.reviews} reviews · {stay.host?.rating} average
              </p>
            </div>

            <ul className="listing-highlights">
              {stay.highlights?.map((highlight, idx) => (
                <li key={idx}>{highlight}</li>
              ))}
            </ul>

            <section className="room-description">
              <p>{stay.summary}</p>
            </section>

            <section className="stay-amenities">
              <h2>What this place offers</h2>
              <ul>
                {stay.amenities?.map((a, idx) => (
                  <li key={idx}>✔ {a}</li>
                ))}
              </ul>
            </section>

            <section className="stay-calendar">
              <h2>Insert Calendar</h2>
            </section>
          </div>

          {/* Right Column */}
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

        {/* Reviews Section */}
        <section className="stay-reviews">
          <h2 className="reviews-header">
            <span className="star">★</span>
            {stay.host?.rating?.toFixed(1)} · {reviews.length} reviews
          </h2>

          {stay.ratings && (
            <ReviewBreakdown
              ratings={stay.ratings}
              reviewCount={reviews.length}
              starCounts={starCounts}
            />
          )}

          <ul className="review-list">
            {reviews.map(review => (
              <li key={review._id} className="review-card">
                <div className="review-header">
                  <img
                    src={review.byUser.imgUrl}
                    alt={review.byUser.fullname}
                    className="review-avatar"
                  />
                  <div className="review-meta">
                    <strong>{review.byUser.fullname}</strong>
                    <p className="review-tenure">{review.byUser.tenure || 'Airbnb guest'}</p>

                  </div>
                </div>

                <div className="review-info-row">
                  <span className="review-stars">
                    {'★'.repeat(Number(review.rating)) + '☆'.repeat(5 - Number(review.rating))}
                  </span>
                  <span className="review-date">Some time ago {review.date || 'Stayed recently'}</span>
                </div>
                <p className="review-text">{review.txt}</p>

              </li>
            ))}
          </ul>
        </section>

        {/* Map */}
        <section className="stay-location-map">
          <h2>Where you'll be</h2>
          <p className="map-location">
            {stay.loc?.city}, {stay.loc?.country}
          </p>
          <div id="map"></div>
        </section>

        {/* Host */}
        <section className="meet-your-host">
          <h2>Meet your host</h2>
          <div className="host-card">
            <div className="host-left">
              <img
                src={stay.host?.imgUrl}
                alt={stay.host?.fullname}
                className="host-photo"
              />
              <p className="host-role">{stay.host?.role}</p>
              <p className="host-fact">🎶 {stay.host?.favoritesong}</p>
              <p className="host-bio">{stay.host?.bio}</p>
            </div>

            <div className="host-right">
              <div className="host-header">
                <h3>{stay.host?.fullname}</h3>
                {stay.host?.isSuperhost && (
                  <span className="superhost-badge">🌟 Superhost</span>
                )}
              </div>
              <p>{stay.host?.monthsHosting} months hosting</p>
              <p>
                {stay.host?.reviews} reviews · {stay.host?.rating} average rating
              </p>
              <p>💬 Response rate: {stay.host?.responseRate}%</p>
              <p>⏱️ Responds within: {stay.host?.responseTime}</p>
              <button className="message-host-btn">Message Host</button>
            </div>
          </div>
        </section>

        {/* House Rules, Safety, Cancellation */}
        <section className="things-to-know">
          <h2>Things to know</h2>
          <div className="info-grid">
            <div className="info-block">
              <h3>House Rules</h3>
              <ul>
                {stay.houseRules?.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>

            <div className="info-block">
              <h3>Safety & Property</h3>
              <ul>
                {stay.safety?.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="info-block">
              <h3>Cancellation Policy</h3>
              <ul>
                {stay.cancellationPolicy?.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </section>
    </section>
  )
}

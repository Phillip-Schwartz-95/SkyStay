import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { StandaloneSearchBox } from '@react-google-maps/api'

import { loadStay, addStayMsg } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { reviewService } from '../services/review'
import { ReviewBreakdown } from '../cmps/ReviewBreakdown'


export function StayDetails() {
  const { stayId } = useParams()
  const stay = useSelector(storeState => storeState.stayModule.stay)
  const [msgTxt, setMsgTxt] = useState('')
  const [reviews, setReviews] = useState([])
  const mapRef = useRef(null)
  const searchBoxRef = useRef(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  })
  console.log('API KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY)

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

  function onPlacesChanged() {
    const places = searchBoxRef.current.getPlaces()
    if (places.length > 0) {
      const location = places[0].geometry.location
      setCenter({ lat: location.lat(), lng: location.lng() }) // update map center
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

  const zoomBtnStyle = {
    width: '40px',
    height: '40px',
    margin: '2px 0',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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

        {/* Google Maps Section */}
        <section className="stay-location-map">
          <h2>Where you'll be</h2>
          <p className="map-location">
            {stay.loc?.city}, {stay.loc?.country}
          </p>

          {isLoaded && stay.loc?.lat && stay.loc?.lng && (
            <div style={{ position: 'relative', width: '100%', height: '500px' }}>
              <GoogleMap
                center={{ lat: stay.loc.lat, lng: stay.loc.lng }}
                zoom={13}
                onLoad={(map) => (mapRef.current = map)}
                options={{
                  disableDefaultUI: true,      // remove all defaults
                  mapTypeControl: false,       // keep map type hidden
                  fullscreenControl: true,     // show fullscreen
                  streetViewControl: true,     // show pegman
                  zoomControl: false,          // disable default zoom (we add custom)
                }}
                mapContainerStyle={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                {/* Custom Marker (black circle + white house) */}
                <Marker
                  position={{ lat: stay.loc.lat, lng: stay.loc.lng }}
                  icon={{
                    url: `data:image/svg+xml;utf-8,
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="20" fill="black"/>
              <path d="M10 22 L20 12 L30 22 V32 H22 V24 H18 V32 H10 Z" fill="white"/>
            </svg>`,
                    scaledSize: new window.google.maps.Size(40, 40),
                    anchor: new window.google.maps.Point(20, 20),
                  }}
                />
              </GoogleMap>

              {/* Floating Search Box (top-left) */}
              <div className="map-search-box">
                <StandaloneSearchBox
                  onLoad={ref => (searchBoxRef.current = ref)}
                  onPlacesChanged={onPlacesChanged}
                >
                  <input
                    type="text"
                    placeholder="Search location"
                    className="map-search-input"
                  />
                </StandaloneSearchBox>
              </div>

              {/* Custom Zoom Controls (bottom-right) */}
              <div className="custom-zoom-controls">
                <button onClick={() => mapRef.current.setZoom(mapRef.current.getZoom() + 1)}>+</button>
                <button onClick={() => mapRef.current.setZoom(mapRef.current.getZoom() - 1)}>−</button>
              </div>
            </div>
          )}

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
                <p>Response rate: {stay.host?.responseRate}%</p>
                <p> Responds within: {stay.host?.responseTime}</p>
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
    </section>
  )
}

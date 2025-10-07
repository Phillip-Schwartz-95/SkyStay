import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { GoogleMap, Marker, useJsApiLoader, StandaloneSearchBox } from '@react-google-maps/api'
import { FiKey, FiMapPin, FiCalendar } from 'react-icons/fi'
import { FaWifi, FaSnowflake, FaSwimmingPool, FaTv } from 'react-icons/fa'
import { MdKitchen, MdLocalLaundryService } from 'react-icons/md'

import { loadStay, addStayMsg } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { reviewService } from '../services/review'
import { userService } from '../services/user'
import { ReviewBreakdown } from '../cmps/ReviewBreakdown'
import { BookingCard } from '../cmps/BookingCard'
import { StayCalendar } from '../cmps/StayCalendar'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../assets/styles/cmps/stay/StayCalendar.css'

const libraries = ['places']

export function StayDetails() {
  const { stayId } = useParams()
  const stay = useSelector(storeState => storeState.stayModule.stay)
  const [msgTxt, setMsgTxt] = useState('')
  const [reviews, setReviews] = useState([])
  const mapRef = useRef(null)
  const searchBoxRef = useRef(null)
  const [center, setCenter] = useState({ lat: 0, lng: 0 })
  const [checkIn, setCheckIn] = useState(null)
  const [checkOut, setCheckOut] = useState(null)
  const [reservedDates, setReservedDates] = useState([])
  const [hostUser, setHostUser] = useState(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  const iconMap = {
    key: FiKey,
    map: FiMapPin,
    calendar: FiCalendar,
  }

  const amenityIcons = {
    wifi: FaWifi,
    'air conditioning': FaSnowflake,
    pool: FaSwimmingPool,
    kitchen: MdKitchen,
    tv: FaTv,
    laundry: MdLocalLaundryService,
    // Add more mappings as needed:
    // 'free parking': FiKey,
    // washer: MdLocalLaundryService,
    // heating: FiKey,
    // elevator: FiKey,
  }

  useEffect(() => {
    loadStay(stayId)
    loadReviews()
  }, [stayId])

  useEffect(() => {
    if (stay?.loc?.lat && stay?.loc?.lng) {
      setCenter({ lat: stay.loc.lat, lng: stay.loc.lng })
    }
  }, [stay?.loc?.lat, stay?.loc?.lng])

  useEffect(() => {
    if (stay?.host?.fullname) {
      userService.getByFullname(stay.host.fullname).then(setHostUser).catch(() => setHostUser(null))
    }
  }, [stay?.host?.fullname])

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
      setCenter({ lat: location.lat(), lng: location.lng() })
    }
  }

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
    <section className="stay-details-wrapper">
      <section className="stay-details">
        <header className="stay-header">
          <h1 className="stay-title">{stay.title}</h1>
        </header>

        <div className="photo-gallery">
          {stay.imgs?.map((img, idx) => (
            <img key={idx} src={img} alt={`Stay image ${idx + 1}`} />
          ))}
        </div>

        <div className="details-layout">
          <div className="details-left">
            <div className="stay-block">
              <p className="stay-location">{stay.title}</p>

              <div className="basic-details">
                <p>
                  {stay.maxGuests} guests · {stay.bedRooms} bedroom · {stay.baths} baths
                </p>
              </div>

              <p className="rating-row">
                <span className="star">★</span>
                <span className="rating">{Number(stay.host?.rating).toFixed(2)}</span>
                <span> · </span>
                <span className="reviews-link">{stay.host?.reviews} reviews</span>
              </p>
            </div>

            <div className="host-info">
              <img
                src={stay.host?.imgUrl}
                alt={stay.host?.fullname}
                className="host-avatar"
              />
              <div className="host-meta">
                <p className="hosted-by">Hosted by {stay.host?.fullname}</p>
                <p className="host-time">
                  {hostUser?.timeAsUser ??
                    (typeof stay.host?.monthsHosting === 'number'
                      ? (stay.host.monthsHosting >= 12
                        ? `${Math.floor(stay.host.monthsHosting / 12)} years hosting`
                        : `${stay.host.monthsHosting} months hosting`)
                      : '')}
                </p>
              </div>
            </div>

            <ul className="listing-highlights">
              {stay.highlights?.map((h, idx) => {
                if (typeof h === 'string') {
                  const Icon = FiKey
                  return (
                    <li key={idx} className="highlight-item">
                      <Icon className="highlight-icon" />
                      <div>
                        <p className="highlight-title">{h}</p>
                      </div>
                    </li>
                  )
                }
                const Icon = iconMap[h?.icon] || FiKey
                return (
                  <li key={idx} className="highlight-item">
                    <Icon className="highlight-icon" />
                    <div>
                      <p className="highlight-title">{h?.title || ''}</p>
                      <p className="highlight-desc">{h?.desc || ''}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <section className="room-description">
              <p>{stay.summary}</p>
            </section>

            <section className="stay-amenities">
              <h2>What this place offers</h2>
              <ul className="amenities-grid">
                {stay.amenities?.map((a, idx) => {
                  const key = (a || '').toString().toLowerCase()
                  const Icon = amenityIcons[key] || FiKey
                  return (
                    <li key={idx} className="amenity-item">
                      <Icon className="amenity-icon" />
                      <span>{a}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="stay-calendar">
              <h2>
                {checkIn && checkOut
                  ? `${Math.ceil(
                    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
                  )} nights in ${stay.loc?.city}`
                  : 'Select your stay dates'}
              </h2>
              <DatePicker
                selectsRange
                startDate={checkIn}
                endDate={checkOut}
                onChange={(dates) => {
                  const [start, end] = dates
                  setCheckIn(start)
                  setCheckOut(end)
                }}
                monthsShown={2}
                inline
                excludeDates={reservedDates.map(d => new Date(d))}
                minDate={new Date()}
                calendarClassName="airbnb-calendar"
              />
            </section>
          </div>

          <div className="details-right">
            <BookingCard
              stayId={stay._id}
              userId={'u101'}
              pricePerNight={stay.price}
              maxGuests={4}
              checkIn={checkIn}
              checkOut={checkOut}
              setCheckIn={setCheckIn}
              setCheckOut={setCheckOut}
              reservedDates={reservedDates}
              setReservedDates={setReservedDates}
            />
          </div>
        </div>

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
                    <p className="review-tenure">
                      {review.byUser.tenure || 'Airbnb guest'}
                    </p>
                  </div>
                </div>

                <div className="review-info-row">
                  <span className="review-stars">
                    {'★'.repeat(Number(review.rating || 5)) +
                      '☆'.repeat(5 - Number(review.rating || 5))}
                  </span>
                  <span className="review-date">
                    Some time ago {review.date || 'Stayed recently'}
                  </span>
                </div>
                <p className="review-text">{review.txt}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="stay-location-map">
          <h2>Where you'll be</h2>
          <p className="map-location">
            {stay.loc?.city}, {stay.loc?.country}
          </p>

          {isLoaded && stay.loc?.lat && stay.loc?.lng && (
            <div style={{ position: 'relative', width: '100%', height: '500px' }}>
              <GoogleMap
                center={center}
                zoom={13}
                onLoad={(map) => (mapRef.current = map)}
                options={{
                  disableDefaultUI: true,
                  mapTypeControl: false,
                  fullscreenControl: true,
                  streetViewControl: true,
                  zoomControl: false,
                }}
                mapContainerStyle={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
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

              <div className="custom-zoom-controls">
                <button onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() + 1)}>+</button>
                <button onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() - 1)}>−</button>
              </div>
            </div>
          )}
        </section>

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
              <p>Responds within: {stay.host?.responseTime}</p>
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

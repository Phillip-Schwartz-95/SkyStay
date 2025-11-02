import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useJsApiLoader } from '@react-google-maps/api'
import { loadStay } from '../store/actions/stay.actions'
import { reviewService } from '../services/review'
import { userService } from '../services/user'
import { ReviewBreakdown } from '../cmps/ReviewBreakdown'
import { ReviewsList } from '../cmps/ReviewList'
import { StayCalendar } from '../cmps/StayCalendar'
import { PhotoGallery } from '../cmps/staydetails/PhotoGallery'
import { HostInfo } from '../cmps/staydetails/HostInfo'
import { HighlightsList } from '../cmps/staydetails/HighlightsList'
import { AmenitiesList } from '../cmps/staydetails/AmenitiesList'
import { MapSection } from '../cmps/staydetails/MapSection'
import { ThingsToKnow } from '../cmps/staydetails/ThingsToKnow'
import { BookingCard } from '../cmps/staydetails/BookingCard'
import { MeetYourHost } from '../cmps/staydetails/MeetYourHost'
import { StaySubHeader } from '../cmps/staydetails/StaySubHeader'
import '../assets/styles/cmps/stay/StayCalendar.css'

const libraries = ['places']

export function StayDetails() {
  const { stayId } = useParams()
  const stay = useSelector(s => s.stayModule.stay)
  const loggedInUser = useSelector(s => s.userModule?.user || s.userModule?.loggedinUser || null)
  const navigate = useNavigate()
  const location = useLocation()

  const [reviews, setReviews] = useState([])
  const [checkIn, setCheckIn] = useState(null)
  const [checkOut, setCheckOut] = useState(null)
  const [guests, setGuests] = useState(1)
  const [reservedDates, setReservedDates] = useState([])
  const [hostUser, setHostUser] = useState(null)

  const mapRef = useRef(null)
  const searchBoxRef = useRef(null)

  const [showSubHeader, setShowSubHeader] = useState(false)
  const photoSectionRef = useRef(null)
  const amenitiesRef = useRef(null)
  const reviewsRef = useRef(null)
  const locationRef = useRef(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  useEffect(() => {
    document.body.classList.add('details-page')
    return () => document.body.classList.remove('details-page')
  }, [])

  useEffect(() => {
    loadStay(stayId)
    loadReviews()
  }, [stayId])

  useEffect(() => {
    async function fetchHost() {
      if (!stay?.host) {
        setHostUser(null)
        return
      }
      try {
        if (stay.host._id) {
          const u = await userService.getById(stay.host._id)
          setHostUser(u || null)
          return
        }
        if (stay.host.fullname) {
          const u = await userService.getByFullname(stay.host.fullname)
          setHostUser(u || null)
          return
        }
        setHostUser(null)
      } catch {
        setHostUser(null)
      }
    }
    fetchHost()
  }, [stay?.host?._id, stay?.host?.fullname])

  useEffect(() => {
    const el = photoSectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowSubHeader(!entry.isIntersecting),
      { threshold: 0.1, rootMargin: '-120px 0px 0px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [stayId])

  async function loadReviews() {
    try {
      const res = await reviewService.query({ aboutStayId: stayId })
      setReviews(res)
    } catch { }
  }

  const starCounts = reviews.reduce((acc, review) => {
    const stars = review.rating || 5
    acc[stars] = (acc[stars] || 0) + 1
    return acc
  }, {})

  const hostInfo = useMemo(() => {
    const h = stay?.host || {}
    const u = hostUser || {}
    const n = v => {
      const num = Number(v)
      return Number.isFinite(num) ? num : null
    }
    const defaults = {
      fullname: 'Host',
      imgUrl: '',
      isSuperhost: false,
      monthsHosting: 8,
      rating: 4.8,
      reviews: 0,
      responseRate: 95,
      responseTime: 'within an hour',
      role: 'Photographer and host',
      favoritesong: 'Canon in D',
      bio: "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines."
    }
    return {
      _id: h._id || u._id || null,
      fullname: h.fullname || u.fullname || u.username || defaults.fullname,
      imgUrl: h.imgUrl || u.pictureUrl || u.imgUrl || defaults.imgUrl,
      isSuperhost: (h.isSuperhost ?? u.isSuperhost ?? defaults.isSuperhost) ? true : false,
      monthsHosting: n(h.monthsHosting) ?? n(u.monthsHosting) ?? defaults.monthsHosting,
      rating: n(h.rating) ?? n(u.rating) ?? defaults.rating,
      reviews: n(h.reviews) ?? n(u.reviews) ?? defaults.reviews,
      responseRate: n(h.responseRate) ?? n(u.responseRate) ?? defaults.responseRate,
      responseTime: h.responseTime || u.responseTime || defaults.responseTime,
      role: h.role || u.role || defaults.role,
      favoritesong: h.favoritesong || u.favoritesong || defaults.favoritesong,
      bio: h.bio || u.bio || defaults.bio
    }
  }, [stay?.host, hostUser])

  const safeHostRating = hostInfo.rating != null ? hostInfo.rating : null
  const mergedStayForMeet = useMemo(() => ({ ...stay, host: hostInfo }), [stay, hostInfo])

  if (!stay) return <div>Loading...</div>

  const onOpenAllPhotos = () => navigate(`/stay/${stay._id}/photos`)

  const onChangeDates = (start, end) => {
    setCheckIn(start)
    setCheckOut(end)
  }

  function normalizeAmenities(s) {
    const amenities = s.amenities ? [...s.amenities] : []
    const safety = s.safety || []
    const allText = [...amenities, ...safety].map(a => String(a || '').toLowerCase())
    const hasSmoke = allText.some(a => a.includes('smoke alarm') || a.includes('smoke detector'))
    const hasCO = allText.some(a => a.includes('carbon monoxide') || a.includes('co alarm'))
    if (!hasSmoke) amenities.push('Smoke Alarm (missing)')
    if (!hasCO) amenities.push('Carbon Monoxide Alarm (missing)')
    return amenities
  }

  function handleScrollTo(section) {
    const refs = { photos: photoSectionRef, amenities: amenitiesRef, reviews: reviewsRef, location: locationRef }
    refs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function onReserve({ checkIn: ci, checkOut: co, guests: g } = {}) {
    const _checkIn = ci || checkIn
    const _checkOut = co || checkOut
    const _guests = g || guests
    if (!_checkIn || !_checkOut || !_guests) return
    if (!loggedInUser) {
      window.dispatchEvent(new Event('open-login-modal'))
      return
    }
    const nights = Math.max(1, Math.ceil((new Date(_checkOut) - new Date(_checkIn)) / (1000 * 60 * 60 * 24)))
    const nightlyPrice = Number(stay.price) || 0
    const serviceFee = Math.round(nightlyPrice * nights * 0.05)
    const payload = {
      stay: {
        id: stay._id || stay.id,
        name: stay.name || stay.title,
        imgUrl: (stay.imgUrl || stay.coverImg || (stay.imgs && stay.imgs[0])) || '',
        type: stay.roomType || stay.type || 'Private room',
        hostFullname: stay.host?.fullname || stay.host?.name || ''
      },
      checkIn: _checkIn,
      checkOut: _checkOut,
      guests: _guests,
      currency: 'USD',
      nightlyPrice,
      nights,
      serviceFee
    }
    navigate('/payment', { state: payload })
  }

  return (
    <>
      {showSubHeader && (
        <StaySubHeader
          onScrollTo={handleScrollTo}
          className={showSubHeader ? 'show' : ''}
        />
      )}

      <section className="stay-details-wrapper">
        <section className="stay-details">
          <header className="stay-header">
            <h1 className="stay-title">{stay.title}</h1>
          </header>

          <PhotoGallery
            photoRef={photoSectionRef}
            imgs={stay.imgs}
            stayId={stay._id}
            onOpenAll={onOpenAllPhotos}
            className="full"
          />

          <div className="details-layout">
            <div className="details-left">
              <div className="stay-block">
                <p className="stay-location">{stay.title}</p>
                <div className="basic-details">
                  <p>{stay.maxGuests} guests · {stay.bedRooms} bedroom · {stay.baths} baths</p>
                </div>
                <p className="rating-row">
                  <span className="star">★</span>
                  <span className="rating">{safeHostRating != null ? Number(safeHostRating).toFixed(2) : 'New'}</span>
                  <span> · </span>
                  <span className="reviews-link">{hostInfo.reviews || 0} reviews</span>
                </p>
              </div>

              <HostInfo host={hostInfo} hostUser={hostUser} />

              <HighlightsList highlights={stay.highlights} />

              <section className="room-description">
                <p>{stay.summary}</p>
              </section>

              <section ref={amenitiesRef}>
                <AmenitiesList amenities={normalizeAmenities(stay)} />
              </section>

              <StayCalendar
                stay={stay}
                reservedDates={reservedDates}
                checkIn={checkIn}
                setCheckIn={setCheckIn}
                checkOut={checkOut}
                setCheckOut={setCheckOut}
              />
            </div>

            <div className="details-right">
              <BookingCard
                stayId={stay._id}
                userId={loggedInUser?._id}
                pricePerNight={stay.price}
                maxGuests={stay.maxGuests}
                checkIn={checkIn}
                checkOut={checkOut}
                setCheckIn={setCheckIn}
                setCheckOut={setCheckOut}
                reservedDates={reservedDates}
                setReservedDates={setReservedDates}
                onReserve={onReserve}
              />
            </div>
          </div>

          <section className="stay-reviews" ref={reviewsRef}>
            <h2 className="reviews-header">
              <span className="star">★</span>
              {safeHostRating != null ? Number(safeHostRating).toFixed(1) : 'New'} · {reviews.length} reviews
            </h2>

            {stay.ratings && (
              <ReviewBreakdown
                ratings={stay.ratings}
                reviewCount={reviews.length}
                starCounts={starCounts}
              />
            )}

            <ReviewsList reviews={reviews} />
          </section>

          <section ref={locationRef}>
            <MapSection
              isLoaded={isLoaded}
              loc={stay.loc}
              mapRef={mapRef}
              searchBoxRef={searchBoxRef}
            />
          </section>

          <MeetYourHost stay={mergedStayForMeet} />

          <ThingsToKnow
            rules={stay.houseRules}
            safety={stay.safety}
            cancellation={stay.cancellationPolicy}
          />
        </section>
      </section>
    </>
  )
}

export default StayDetails

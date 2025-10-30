import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useJsApiLoader } from '@react-google-maps/api'

import { loadStay } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
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

import stayphotos from '../data/stayphotos.json'
import '../assets/styles/cmps/stay/StayCalendar.css'

const libraries = ['places']

export function StayDetails() {
  const { stayId } = useParams()
  const stay = useSelector(storeState => storeState.stayModule.stay)
  const loggedInUser = useSelector(storeState => storeState.userModule?.user || storeState.userModule?.loggedinUser || null)
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
    if (stay?.host?.fullname) {
      userService.getByFullname(stay.host.fullname)
        .then(setHostUser)
        .catch(() => setHostUser(null))
    }
  }, [stay?.host?.fullname])

  useEffect(() => {
    const el = photoSectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowSubHeader(!entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '-120px 0px 0px 0px'
      }
    )

    observer.observe(el)

    console.log('Observing:', el)
    console.log('showSubHeader:', showSubHeader)

    return () => observer.disconnect()
  }, [stayId])

  async function loadReviews() {
    try {
      const res = await reviewService.query({ aboutStayId: stayId })
      setReviews(res)
    } catch (err) {
      console.error('Failed to load reviews', err)
    }
  }

  const starCounts = reviews.reduce((acc, review) => {
    const stars = review.rating || 5
    acc[stars] = (acc[stars] || 0) + 1
    return acc
  }, {})

  if (!stay) return <div>Loading...</div>

  const onOpenAllPhotos = () => navigate(`/stay/${stay._id}/photos`)

  const onChangeDates = (start, end) => {
    setCheckIn(start)
    setCheckOut(end)
  }

  function normalizeAmenities(stay) {
    const amenities = stay.amenities ? [...stay.amenities] : []
    const safety = stay.safety || []
    const allText = [...amenities, ...safety].map(a => a.toLowerCase())
    const hasSmoke = allText.some(a => a.includes('smoke alarm') || a.includes('smoke detector'))
    const hasCO = allText.some(a => a.includes('carbon monoxide') || a.includes('co alarm'))
    if (!hasSmoke) amenities.push('Smoke Alarm (missing)')
    if (!hasCO) amenities.push('Carbon Monoxide Alarm (missing)')
    return amenities
  }

  function handleScrollTo(section) {
    const refs = {
      photos: photoSectionRef,
      amenities: amenitiesRef,
      reviews: reviewsRef,
      location: locationRef
    }
    refs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function onReserve({ checkIn: ci, checkOut: co, guests: g } = {}) {
    const _checkIn = ci || checkIn
    const _checkOut = co || checkOut
    const _guests = g || guests
    if (!_checkIn || !_checkOut || !_guests) return

    if (!loggedInUser) {
      navigate('/auth/login', { state: { from: location.pathname } })
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
                  <span className="rating">{Number(stay.host?.rating).toFixed(2)}</span>
                  <span> · </span>
                  <span className="reviews-link">{stay.host?.reviews} reviews</span>
                </p>
              </div>

              <HostInfo host={stay.host} hostUser={hostUser} />

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
              {stay.host?.rating?.toFixed(1)} · {reviews.length} reviews
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

          <MeetYourHost stay={stay} />

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

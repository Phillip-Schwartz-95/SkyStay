import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useJsApiLoader } from '@react-google-maps/api'

import { loadStay } from '../store/actions/stay.actions'
import { showSuccessMsg, showErrorMsg } from '../services/event-bus.service'
import { reviewService } from '../services/review'
import { userService } from '../services/user'

//shared components
import { ReviewBreakdown } from '../cmps/ReviewBreakdown'
import { ReviewsList } from '../cmps/ReviewList'
import { StayCalendar } from '../cmps/StayCalendar'

// Subcomponents
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
  const navigate = useNavigate()

  const [reviews, setReviews] = useState([])
  const [checkIn, setCheckIn] = useState(null)
  const [checkOut, setCheckOut] = useState(null)
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

  // Load stay and reviews
  useEffect(() => {
    loadStay(stayId)
    loadReviews()
  }, [stayId])

  // Load host info
  useEffect(() => {
    if (stay?.host?.fullname) {
      userService.getByFullname(stay.host.fullname)
        .then(setHostUser)
        .catch(() => setHostUser(null))
    }
  }, [stay?.host?.fullname])

  // Show sub-header after photos out of view
  useEffect(() => {
    if (!photoSectionRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowSubHeader(!entry.isIntersecting),
      { threshold: 0.1 }
    )

    // small delay ensures the gallery is fully rendered before observing
    const timeout = setTimeout(() => {
      observer.observe(photoSectionRef.current)
    }, 100)

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])

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

  // Handle “Show all photos”
  const onOpenAllPhotos = () => navigate(`/stay/${stay._id}/photos`)

  // Handle date changes in calendar
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

    // Only add if not present
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

          {/* Header */}
          <header className="stay-header">
            <h1 className="stay-title">{stay.title}</h1>
          </header>

          {/* Photo Gallery */}
          <PhotoGallery
            photoRef={photoSectionRef}
            imgs={stay.imgs}
            stayId={stay._id}
            onOpenAll={onOpenAllPhotos}
            className="full"
          />

          {/* Main layout */}
          <div className="details-layout">
            <div className="details-left">

              {/* Stay basic info */}
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

              {/* Host Info */}
              <HostInfo host={stay.host} hostUser={hostUser} />

              {/* Highlights */}
              <HighlightsList highlights={stay.highlights} />

              {/* Description */}
              <section className="room-description">
                <p>{stay.summary}</p>
              </section>

              {/* Amenities */}
              <section ref={amenitiesRef}>
                <AmenitiesList amenities={normalizeAmenities(stay)} />
              </section>

              {/* Calendar */}
              <StayCalendar
                stay={stay}
                reservedDates={reservedDates}
                checkIn={checkIn}
                setCheckIn={setCheckIn}
                checkOut={checkOut}
                setCheckOut={setCheckOut}
              />

            </div>

            {/* Booking Card */}
            <div className="details-right">
              <BookingCard
                stayId={stay._id}
                userId={'u101'}
                pricePerNight={stay.price}
                maxGuests={stay.maxGuests}
                checkIn={checkIn}
                checkOut={checkOut}
                setCheckIn={setCheckIn}
                setCheckOut={setCheckOut}
                reservedDates={reservedDates}
                setReservedDates={setReservedDates}
              />
            </div>
          </div>

          {/* Reviews */}
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

          {/* Map */}
          <section ref={locationRef}>
            <MapSection
              isLoaded={isLoaded}
              loc={stay.loc}
              mapRef={mapRef}
              searchBoxRef={searchBoxRef}
            />
          </section>

          {/* Meet the Host */}
          <MeetYourHost stay={stay} />

          {/* Things to Know */}
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

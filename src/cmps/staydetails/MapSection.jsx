// /pages/StayDetails/parts/MapSection.jsx
import { GoogleMap, Marker, StandaloneSearchBox } from '@react-google-maps/api'
import { useEffect, useMemo, useState } from 'react'

export function MapSection({ isLoaded, loc, mapRef, searchBoxRef }) {
  const [center, setCenter] = useState({ lat: 0, lng: 0 })

  useEffect(() => {
    if (loc?.lat && loc?.lng) setCenter({ lat: loc.lat, lng: loc.lng })
  }, [loc?.lat, loc?.lng])

  const onPlacesChanged = () => {
    const places = searchBoxRef.current.getPlaces()
    if (places?.length > 0) {
      const location = places[0].geometry.location
      setCenter({ lat: location.lat(), lng: location.lng() })
    }
  }

  if (!isLoaded || !loc?.lat || !loc?.lng) return null

  return (
    <section className="stay-location-map">
      <h2>Where you'll be</h2>
      <p className="map-location">{loc?.city}, {loc?.country}</p>

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
          mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }}
        >
          <Marker
            position={{ lat: loc.lat, lng: loc.lng }}
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
            <input type="text" placeholder="Search location" className="map-search-input" />
          </StandaloneSearchBox>
        </div>

        <div className="custom-zoom-controls">
          <button onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() + 1)}>+</button>
          <button onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() - 1)}>−</button>
        </div>
      </div>
    </section>
  )
}
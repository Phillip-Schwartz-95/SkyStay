// /pages/StayDetails/parts/MapSection.jsx
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { useEffect, useState, useRef } from 'react'

export function MapSection({ isLoaded, loc, mapRef, searchBoxRef }) {
    const [center, setCenter] = useState({ lat: 0, lng: 0 })
    const [showSearch, setShowSearch] = useState(false)
    const autocompleteRef = useRef(null)

    // Center the map when location changes
    useEffect(() => {
        if (loc?.lat && loc?.lng) setCenter({ lat: loc.lat, lng: loc.lng })
    }, [loc?.lat, loc?.lng])

    // When user searches for a new place
    const onPlaceChanged = () => {
        const ac = autocompleteRef.current
        if (!ac) return
        const place = ac.getPlace()
        const loc = place?.geometry?.location
        if (!loc) return
        const next = { lat: loc.lat(), lng: loc.lng() }
        setCenter(next)
        mapRef.current?.panTo(next)
        mapRef.current?.setZoom(15)
        setShowSearch(false)
    }

    if (!isLoaded || !loc?.lat || !loc?.lng) return null

    return (
        <section className="stay-location-map">
            <h2>Where you'll be</h2>
            <p className="map-location">{loc?.city}, {loc?.country}</p>

            <div className="map-container">
                <GoogleMap
                    center={center}
                    zoom={13}
                    onLoad={(map) => (mapRef.current = map)}
                    options={{
                        disableDefaultUI: false, // allow fullscreen + street view
                        mapTypeControl: false,
                        zoomControl: false, // we make our own
                        fullscreenControl: true,
                        streetViewControl: true,
                        rotateControl: false,        // no rotate control
                        tilt: 0,                     // lock tilt (no 45°)
                        heading: 0,
                        disableDefaultUI: false,
                        fullscreenControlOptions: {
                            position: window.google.maps.ControlPosition.TOP_RIGHT,
                        },
                        streetViewControlOptions: {
                            position: window.google.maps.ControlPosition.TOP_RIGHT,
                        },
                    }}
                    mapContainerStyle={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '16px',
                        overflow: 'hidden',
                    }}
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

                {/* Search input (top left) */}
                <div className="map-search-box">
                    <button className="search-toggle" onClick={() => setShowSearch(true)}>
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="black">
                            <path d="m20.666 20.666 10 10"></path>
                            <path d="m24.0002 12.6668c0 6.2593-5.0741 11.3334-11.3334 11.3334-6.2592 0-11.3333-5.0741-11.3333-11.3334 0-6.2592 5.0741-11.3333 11.3333-11.3333 6.2593 0 11.3334 5.0741 11.3334 11.3333z"></path>
                        </svg>
                    </button>

                    {showSearch && (
                        <div className="search-panel active">
                            <div className="search-input-row">
                                <Autocomplete
                                    onLoad={(ac) => (autocompleteRef.current = ac)}
                                    onPlaceChanged={onPlaceChanged}
                                    options={{
                                        fields: ['geometry', 'name', 'formatted_address'],
                                        // componentRestrictions: { country: 'us' }, // optional
                                    }}
                                >
                                    <input type="text" placeholder="Find a place or address" />
                                </Autocomplete>

                                <button className="cancel" onClick={() => setShowSearch(false)}>Cancel</button>
                            </div>

                            <h3>Find a place on the map</h3>
                            <p>Find restaurants, landmarks and more. You can add ones you want to visit to the map for reference.</p>
                        </div>
                    )}
                </div>

                {/* Custom zoom pill (top right) */}
                <div className="custom-zoom-controls">
                    <button onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() + 1)}>+</button>
                    <button onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() - 1)}>−</button>
                </div>
            </div>
        </section>
    )
}

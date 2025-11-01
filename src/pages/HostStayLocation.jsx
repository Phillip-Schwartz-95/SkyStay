import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/styles/cmps/hostnew.css'

function loadGoogle(src) {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps && window.google.maps.places) return resolve()
        const existing = document.querySelector('script[data-gmaps]')
        if (existing) {
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', reject)
            return
        }
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.defer = true
        s.setAttribute('data-gmaps', '1')
        s.onload = () => resolve()
        s.onerror = reject
        document.head.appendChild(s)
    })
}

function extractCityCountry(place) {
    const out = { city: '', country: '' }
    const comps = place?.address_components || []
    for (const c of comps) {
        if (c.types.includes('locality')) out.city = c.long_name
        if (c.types.includes('postal_town') && !out.city) out.city = c.long_name
        if (c.types.includes('administrative_area_level_1') && !out.city) out.city = c.long_name
        if (c.types.includes('country')) out.country = c.long_name
    }
    return out
}

export function HostStayLocation() {
    const navigate = useNavigate()
    const { state } = useLocation()
    const draft = useMemo(() => state?.draft || {}, [state])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [query, setQuery] = useState('')

    // City & country are set ONLY via search autocomplete
    const [city, setCity] = useState(draft.city || 'Montreal')
    const [country, setCountry] = useState(draft.country || 'Canada')

    // Address is user-typed (not auto-changed by map moves)
    const [address, setAddress] = useState(draft.formattedAddress || '')

    // Map position follows clicks/drag but does NOT alter city/country
    const [coords, setCoords] = useState({
        lat: draft.lat ?? 45.5019,
        lng: draft.lng ?? -73.5674,
        zoom: draft.zoom ?? 11
    })

    const mapRef = useRef(null)
    const inputRef = useRef(null)
    const gmap = useRef(null)
    const marker = useRef(null)
    const autocomplete = useRef(null)

    useEffect(() => {
        const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        if (!key) {
            setError('Missing VITE_GOOGLE_MAPS_API_KEY')
            setLoading(false)
            return
        }
        const src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=quarterly`
        loadGoogle(src)
            .then(() => {
                const center = new window.google.maps.LatLng(coords.lat, coords.lng)
                gmap.current = new window.google.maps.Map(mapRef.current, {
                    center,
                    zoom: coords.zoom,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    streetViewControl: false
                })

                marker.current = new window.google.maps.Marker({
                    position: center,
                    map: gmap.current,
                    draggable: true
                })

                // Autocomplete (cities only). Selecting a city sets city/country and recenters map.
                autocomplete.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                    fields: ['geometry', 'formatted_address', 'address_components'],
                    types: ['(cities)']
                })

                autocomplete.current.addListener('place_changed', () => {
                    const place = autocomplete.current.getPlace()
                    if (!place || !place.geometry || !place.geometry.location) return
                    const loc = place.geometry.location
                    const lat = loc.lat()
                    const lng = loc.lng()
                    const { city: c, country: ct } = extractCityCountry(place)

                    // City & country controlled ONLY by search:
                    setCity(c || '')
                    setCountry(ct || '')

                    // Recenter map. Do NOT auto-set the address; host types it manually.
                    const pos = new window.google.maps.LatLng(lat, lng)
                    gmap.current.setCenter(pos)
                    gmap.current.setZoom(12)
                    marker.current.setPosition(pos)
                    setCoords({ lat, lng, zoom: 12 })
                })

                // Map click updates coordinates only
                gmap.current.addListener('click', e => {
                    const lat = e.latLng.lat()
                    const lng = e.latLng.lng()
                    const pos = new window.google.maps.LatLng(lat, lng)
                    marker.current.setPosition(pos)
                    gmap.current.panTo(pos)
                    setCoords(prev => ({ ...prev, lat, lng }))
                    // Do NOT change city/country or address here
                })

                // Dragging the marker updates coordinates only
                marker.current.addListener('dragend', () => {
                    const pos = marker.current.getPosition()
                    const lat = pos.lat()
                    const lng = pos.lng()
                    setCoords(prev => ({ ...prev, lat, lng }))
                    // Do NOT change city/country or address here
                })
            })
            .catch(() => setError('Failed to load Google Maps'))
            .finally(() => setLoading(false))
    }, [])

    function onBack() {
        navigate(-1)
    }

    function onNext() {
        // Require a canonical city/country chosen via search (prevents typos)
        if (!city || !country) return
        navigate('/host/new/step-3', {
            state: {
                draft: {
                    ...draft,
                    city,
                    country,
                    formattedAddress: address?.trim() || '',
                    lat: coords.lat,
                    lng: coords.lng,
                    zoom: coords.zoom
                }
            }
        })
    }

    return (
        <div className="hostnew-root" style={{ minHeight: '100vh' }}>
            <main className="hostnew-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                <div className="hostnew-stage" style={{ width: '100%', maxWidth: 980 }}>
                    <h1 style={{ marginBottom: 18, color: '#000', textAlign: 'center', fontSize: '2rem' }}>
                        Where is your place located?
                    </h1>

                    <div style={{ margin: '0 auto', width: '100%', maxWidth: 720, display: 'grid', gap: 12 }}>
                        {/* Search for canonical city/country (controls filters) */}
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search city (e.g., Montreal)"
                            className="hostloc-search"
                        />

                        {/* Read-only city & country derived from autocomplete */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: '#000', marginBottom: 6 }}>City</label>
                                <input value={city} readOnly className="hostloc-search" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: '#000', marginBottom: 6 }}>Country</label>
                                <input value={country} readOnly className="hostloc-search" />
                            </div>
                        </div>

                        {/* Free-text address typed by the host (not auto-changed) */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, color: '#000', marginBottom: 6 }}>Address (optional)</label>
                            <input
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Street & number, apt, neighborhood…"
                                className="hostloc-search"
                            />
                        </div>

                        <div className="hostloc-map" ref={mapRef} />

                        <div className="hostloc-meta">
                            <div className="hostloc-line"><b>Coordinates:</b> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
                            <div className="hostloc-line"><b>Note:</b> Drag the marker or click the map to adjust exact location. City & Country come from the search above.</div>
                        </div>

                        {error && <div className="hostloc-error">{error}</div>}
                        {loading && <div className="hostloc-loading">Loading map…</div>}
                    </div>
                </div>
            </main>

            <div className="hostnew-bottombar">
                <div className="hostnew-progress" />
                <div className="hostnew-actions">
                    <button className="hostnew-btn hostnew-btn-ghost" onClick={onBack}>Back</button>
                    <button
                        className="hostnew-btn hostnew-btn-primary"
                        onClick={onNext}
                        disabled={!city || !country}
                        aria-disabled={!city || !country}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}

export default HostStayLocation

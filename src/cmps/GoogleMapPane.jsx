import { useEffect, useRef } from 'react'

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src^="${src.split('?')[0]}"]`)) return resolve()
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
    })
}

function pillEl({ title, price, currency }) {
    const el = document.createElement('div')
    el.className = 'map-marker'
    const inner = document.createElement('div')
    inner.className = 'map-marker__inner'
    const span = document.createElement('span')
    span.className = 'map-marker__text'
    const parts = []
    if (title) parts.push(title)
    if (typeof price === 'number') parts.push(`${currency || '$'}${price}`)
    span.textContent = parts.join(', ')
    inner.appendChild(span)
    el.appendChild(inner)
    return el
}

/**
 * Set defaultColors=true to force Google's standard colored map (roadmap), ignoring Map IDs and custom styles.
 * Leave defaultColors=false and set a valid vector MAP_ID to use Advanced Markers with your styled map.
 */
export default function GoogleMapPane({ label, markers = [], defaultColors = true }) {
    const ref = useRef(null)

    useEffect(() => {
        const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY
        const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || window.GOOGLE_MAPS_MAP_ID
        if (!KEY) return

        const url = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&libraries=marker`
        let map
        let activeEl = null

        loadScript(url).then(() => {
            const gmaps = window.google && window.google.maps
            if (!gmaps || !ref.current) return

            const useVectorWithMapId = Boolean(MAP_ID) && !defaultColors

            map = new gmaps.Map(ref.current, {
                center: { lat: 20, lng: 0 },
                zoom: 3,
                // Default Google colors: no mapId, no custom styles
                mapId: useVectorWithMapId ? MAP_ID : undefined,
                mapTypeId: 'roadmap',
                disableDefaultUI: true,
                clickableIcons: false,
                gestureHandling: 'greedy',
                zoomControl: true
            })

            const bounds = new gmaps.LatLngBounds()
            const valid = markers.filter(m => typeof m.lat === 'number' && typeof m.lng === 'number')

            const AdvancedMarker = gmaps.marker && gmaps.marker.AdvancedMarkerElement
            const canUseAdvanced = useVectorWithMapId && Boolean(AdvancedMarker)

            valid.forEach(m => {
                const pos = { lat: m.lat, lng: m.lng }
                bounds.extend(pos)

                const addFallbackMarker = () => {
                    new gmaps.Marker({
                        position: pos,
                        map,
                        label: {
                            text: `${m.currency || '$'}${m.price ?? ''}`,
                            className: 'map-marker map-marker--fallback'
                        }
                    })
                }

                if (canUseAdvanced) {
                    try {
                        const el = pillEl({ title: m.title, price: m.price, currency: m.currency })
                        new AdvancedMarker({
                            map,
                            position: pos,
                            content: el,
                            zIndex: 1
                        })
                        el.addEventListener('click', () => {
                            if (activeEl && activeEl !== el) activeEl.classList.remove('is-active')
                            el.classList.add('is-active')
                            activeEl = el
                            map.panTo(pos)
                        })
                        el.addEventListener('mouseenter', () => el.classList.add('is-hover'))
                        el.addEventListener('mouseleave', () => el.classList.remove('is-hover'))
                    } catch {
                        addFallbackMarker()
                    }
                } else {
                    addFallbackMarker()
                }
            })

            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, 24)
                if (map.getZoom() > 14) map.setZoom(14)
            }
        })
    }, [label, markers, defaultColors])

    return <div className="map-frame" ref={ref} />
}

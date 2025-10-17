import { useEffect, useRef } from 'react'

const MAP_STYLES = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6e4f3' }] }
]

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

export default function GoogleMapPane({ label, markers = [] }) {
    const ref = useRef(null)

    useEffect(() => {
        const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY
        if (!key) return
        const url = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&libraries=marker`
        let map
        let activeEl = null

        loadScript(url).then(() => {
            const gmaps = window.google && window.google.maps
            if (!gmaps || !ref.current) return

            map = new gmaps.Map(ref.current, {
                center: { lat: 20, lng: 0 },
                zoom: 3,
                styles: MAP_STYLES,
                disableDefaultUI: true,
                clickableIcons: false,
                gestureHandling: 'greedy',
                zoomControl: true
            })

            const bounds = new gmaps.LatLngBounds()
            const valid = markers.filter(m => typeof m.lat === 'number' && typeof m.lng === 'number')
            const AdvancedMarker = gmaps.marker && gmaps.marker.AdvancedMarkerElement

            valid.forEach(m => {
                const pos = { lat: m.lat, lng: m.lng }
                bounds.extend(pos)

                if (AdvancedMarker) {
                    const el = pillEl({ title: m.title, price: m.price, currency: m.currency })
                    const marker = new AdvancedMarker({
                        map,
                        position: pos,
                        content: el,
                        zIndex: 1
                    })
                    const activate = () => {
                        if (activeEl && activeEl !== el) activeEl.classList.remove('is-active')
                        el.classList.add('is-active')
                        activeEl = el
                        map.panTo(pos)
                    }
                    el.addEventListener('click', activate)
                    el.addEventListener('mouseenter', () => el.classList.add('is-hover'))
                    el.addEventListener('mouseleave', () => el.classList.remove('is-hover'))
                } else {
                    new gmaps.Marker({
                        position: pos,
                        map,
                        label: {
                            text: `${m.currency || '$'}${m.price ?? ''}`,
                            className: 'map-marker map-marker--fallback'
                        }
                    })
                }
            })

            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, 24)
                if (map.getZoom() > 14) map.setZoom(14)
            }
        })
    }, [label, markers])

    return <div className="map-frame" ref={ref} />
}

import { useEffect, useRef, useState } from 'react'

const GMAPS_BASE = 'https://maps.googleapis.com/maps/api/js'
let gmapsLoaderPromise = null

function loadGoogleMaps(key) {
    if (window.google && window.google.maps) return Promise.resolve()
    if (!gmapsLoaderPromise) {
        const url = `${GMAPS_BASE}?key=${key}&v=weekly&libraries=marker`
        gmapsLoaderPromise = new Promise((resolve, reject) => {
            if (document.querySelector(`script[src^="${GMAPS_BASE}"]`)) {
                const poll = () => (window.google && window.google.maps) ? resolve() : setTimeout(poll, 50)
                return poll()
            }
            const s = document.createElement('script')
            s.src = url
            s.async = true
            s.onload = () => resolve()
            s.onerror = reject
            document.head.appendChild(s)
        })
    }
    return gmapsLoaderPromise
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

const PILL_CSS = `
:host{all:initial}
:host, :host *{box-sizing:border-box}
:root{--palette-hof:#222222;--palette-white:#ffffff;--marker-radius:28px;--marker-height:28px}
.map-marker{background-color:var(--palette-white);color:#222;border-radius:var(--marker-radius);height:var(--marker-height);padding:0 8px;position:relative;transform:scale(1);transform-origin:50% 50%;box-shadow:0 8px 28px rgba(0,0,0,.12),0 2px 4px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.06);transition:background-color 200ms cubic-bezier(.2,.8,.2,1),color 200ms cubic-bezier(.2,.8,.2,1),transform 200ms cubic-bezier(.2,.8,.2,1),box-shadow 200ms cubic-bezier(.2,.8,.2,1);display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
.map-marker__inner{display:flex;align-items:center;justify-content:center;height:100%}
.map-marker__text{font-weight:700;font-size:12px;line-height:1}
.map-marker.is-hover,.map-marker:hover{transform:scale(1.06)}
.map-marker.is-active{background-color:var(--palette-hof);color:var(--palette-white);box-shadow:0 10px 32px rgba(0,0,0,.22),0 2px 4px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.08)}
.map-marker--fallback{background:var(--palette-white);color:#222;padding:6px 10px;border-radius:var(--marker-radius);box-shadow:0 8px 28px rgba(0,0,0,.12),0 2px 4px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.06)}
`

export default function GoogleMapPane({ label, markers = [], fitTo = [], fitKey = '', defaultColors = true, onMapDragEnd }) {
    const hostRef = useRef(null)
    const mapRef = useRef(null)
    const batchMarkersRef = useRef([])
    const initRanRef = useRef(false)
    const [dirty, setDirty] = useState(false)
    const readyRef = useRef(false)
    const pendingFitRef = useRef(null)

    function applyFit(points) {
        const map = mapRef.current
        const gmaps = window.google && window.google.maps
        if (!map || !gmaps || !Array.isArray(points) || points.length === 0) return
        const bounds = new gmaps.LatLngBounds()
        let added = 0
        for (const p of points) {
            if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
                bounds.extend(p)
                added++
            }
        }
        if (added > 0) {
            map.fitBounds(bounds, 24)
            if (map.getZoom() > 14) map.setZoom(14)
        }
    }

    useEffect(() => {
        const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY
        const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || window.GOOGLE_MAPS_MAP_ID
        if (!KEY || initRanRef.current) return
        initRanRef.current = true
        let disposed = false
            ; (async () => {
                await loadGoogleMaps(KEY)
                if (disposed || !hostRef.current) return
                const shadow = hostRef.current.attachShadow({ mode: 'open' })
                const style = document.createElement('style')
                style.textContent = PILL_CSS
                shadow.appendChild(style)
                const mapEl = document.createElement('div')
                mapEl.style.position = 'absolute'
                mapEl.style.inset = '0'
                mapEl.style.width = '100%'
                mapEl.style.height = '100%'
                mapEl.style.border = '0'
                mapEl.style.borderRadius = '16px'
                shadow.appendChild(mapEl)
                const gmaps = window.google.maps
                const useVectorWithMapId = Boolean(MAP_ID) && !defaultColors
                const map = new gmaps.Map(mapEl, {
                    center: { lat: 20, lng: 0 },
                    zoom: 3,
                    mapId: useVectorWithMapId ? MAP_ID : undefined,
                    mapTypeId: 'roadmap',
                    disableDefaultUI: false,
                    clickableIcons: false,
                    gestureHandling: 'greedy',
                    zoomControl: true,
                    fullscreenControl: false,
                    streetViewControl: false
                })
                mapRef.current = map
                gmaps.event.addListener(map, 'dragend', () => setDirty(true))
                gmaps.event.addListener(map, 'zoom_changed', () => setDirty(true))
                gmaps.event.addListenerOnce(map, 'idle', () => {
                    readyRef.current = true
                    if (pendingFitRef.current && pendingFitRef.current.points && pendingFitRef.current.key === fitKey) {
                        applyFit(pendingFitRef.current.points)
                        pendingFitRef.current = null
                    }
                })
            })()
        return () => { disposed = true }
    }, [defaultColors])

    useEffect(() => {
        const map = mapRef.current
        const gmaps = window.google && window.google.maps
        if (!map || !gmaps) return
        if (batchMarkersRef.current.length) {
            batchMarkersRef.current.forEach(mk => mk.setMap && mk.setMap(null))
            batchMarkersRef.current = []
        }
        const getPos = m => {
            if (m && typeof m.lat === 'number' && typeof m.lng === 'number') return { lat: m.lat, lng: m.lng }
            if (m && m.position && typeof m.position.lat === 'number' && typeof m.position.lng === 'number') return m.position
            return null
        }
        const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || window.GOOGLE_MAPS_MAP_ID
        const useVectorWithMapId = Boolean(MAP_ID) && !defaultColors
        const AdvancedMarker = gmaps.marker && gmaps.marker.AdvancedMarkerElement
        const canUseAdvanced = useVectorWithMapId && Boolean(AdvancedMarker)
        markers.forEach(m => {
            const pos = getPos(m)
            if (!pos) return
            if (canUseAdvanced) {
                try {
                    const el = pillEl({ title: m.title, price: m.price, currency: m.currency })
                    const adv = new AdvancedMarker({ map, position: pos, content: el, zIndex: 1 })
                    el.addEventListener('mouseenter', () => el.classList.add('is-hover'))
                    el.addEventListener('mouseleave', () => el.classList.remove('is-hover'))
                    batchMarkersRef.current.push(adv)
                } catch {
                    const mk = new gmaps.Marker({ position: pos, map, label: { text: `${m.currency || '$'}${m.price ?? ''}`, className: 'map-marker map-marker--fallback' } })
                    batchMarkersRef.current.push(mk)
                }
            } else {
                const mk = new gmaps.Marker({ position: pos, map, label: { text: `${m.currency || '$'}${m.price ?? ''}`, className: 'map-marker map-marker--fallback' } })
                batchMarkersRef.current.push(mk)
            }
        })
    }, [markers, label, defaultColors])

    useEffect(() => {
        const points = Array.isArray(fitTo) ? fitTo : []
        if (readyRef.current) {
            requestAnimationFrame(() => applyFit(points))
        } else {
            pendingFitRef.current = { key: fitKey, points }
        }
    }, [fitKey])

    function confirmDrag() {
        const map = mapRef.current
        const gmaps = window.google && window.google.maps
        if (!map || !gmaps) return
        const b = map.getBounds()
        const c = map.getCenter()
        const z = map.getZoom()
        if (typeof onMapDragEnd === 'function') {
            onMapDragEnd({
                bounds: b ? { north: b.getNorthEast().lat(), east: b.getNorthEast().lng(), south: b.getSouthWest().lat(), west: b.getSouthWest().lng() } : null,
                center: c ? { lat: c.lat(), lng: c.lng() } : null,
                zoom: z,
                source: 'pan'
            })
        }
        setDirty(false)
    }

    return (
        <div
            ref={hostRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '16px' }}
        >
            {dirty && (
                <button
                    onClick={confirmDrag}
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        height: 36,
                        padding: '0 14px',
                        borderRadius: 18,
                        border: '1px solid rgba(0,0,0,.12)',
                        background: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,.12)',
                        zIndex: 10
                    }}
                >
                    Search this area
                </button>
            )}
        </div>
    )
}

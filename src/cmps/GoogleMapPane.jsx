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

function truncateWords(str, maxWords = 8) {
    if (!str) return ''
    const words = String(str).trim().split(/\s+/)
    if (words.length <= maxWords) return str
    return words.slice(0, maxWords).join(' ') + '…'
}

function pillEl({ id, href, images = [], title, desc, price, currency, rating, dateRange, availableDates }) {
    const el = document.createElement('div')
    el.className = 'map-marker'

    const inner = document.createElement('div')
    inner.className = 'map-marker__inner'
    const span = document.createElement('span')
    span.className = 'map-marker__text'
    span.textContent = typeof price === 'number' ? `${currency || '$'}${price}` : ''
    inner.appendChild(span)

    const pop = document.createElement('div')
    pop.className = 'map-pop'

    const card = document.createElement('a')
    card.className = 'map-pop__card'
    card.href = href || `/stay/${id || ''}`

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'map-pop__close'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style="display:block;fill:none;height:14px;width:14px;overflow:visible;">
            <path d="m6 6 20 20M26 6 6 26" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"></path>
        </svg>
    `

    const imgWrap = document.createElement('div')
    imgWrap.className = 'map-pop__imgwrap'

    const img = document.createElement('img')
    img.className = 'map-pop__img'
    img.alt = title || 'Stay'
    img.loading = 'lazy'
    img.decoding = 'async'
    img.src = images[0] || ''
    imgWrap.appendChild(img)

    const prevBtn = document.createElement('button')
    prevBtn.className = 'sbp-btn left'
    prevBtn.type = 'button'
    prevBtn.setAttribute('aria-label', 'Previous image')
    prevBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style="display:block;fill:none;height:14px;width:14px;overflow:visible;transform:scaleX(-1);">
            <path d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"></path>
        </svg>
    `

    const nextBtn = document.createElement('button')
    nextBtn.className = 'sbp-btn right'
    nextBtn.type = 'button'
    nextBtn.setAttribute('aria-label', 'Next image')
    nextBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style="display:block;fill:none;height:14px;width:14px;overflow:visible;">
            <path d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"></path>
        </svg>
    `

    const dots = document.createElement('div')
    dots.className = 'sbp-dots'

    let idx = 0
    function renderDots() {
        dots.innerHTML = ''
        for (let i = 0; i < images.length; i++) {
            const d = document.createElement('span')
            d.className = 'sbp-dot' + (i === idx ? ' active' : '')
            d.dataset.index = String(i)
            dots.appendChild(d)
        }
    }
    function updateNav() {
        if (images.length <= 1) {
            prevBtn.style.display = 'none'
            nextBtn.style.display = 'none'
            dots.style.display = 'none'
            return
        }
        prevBtn.style.display = idx > 0 ? 'flex' : 'none'
        nextBtn.style.display = idx < images.length - 1 ? 'flex' : 'none'
        dots.style.display = 'flex'
    }
    function setIdx(newIdx) {
        if (!images.length) return
        if (newIdx < 0 || newIdx > images.length - 1) return
        idx = newIdx
        img.src = images[idx]
        renderDots()
        updateNav()
    }
    dots.addEventListener('click', e => {
        const t = e.target
        if (!(t instanceof HTMLElement)) return
        if (!t.classList.contains('sbp-dot')) return
        const i = Number(t.dataset.index || -1)
        if (!Number.isNaN(i)) setIdx(i)
        e.stopPropagation()
        e.preventDefault()
    })
    prevBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); setIdx(idx - 1) }
    nextBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); setIdx(idx + 1) }
    renderDots()
    updateNav()

    const info = document.createElement('div')
    info.className = 'map-pop__info'

    const header = document.createElement('div')
    header.className = 'map-pop__header'

    const titleEl = document.createElement('div')
    titleEl.className = 'map-pop__title'
    titleEl.textContent = title || 'Stay'

    const ratingEl = document.createElement('div')
    ratingEl.className = 'map-pop__rating'
    const ratingNum = typeof rating === 'number' ? Number(rating).toFixed(2) : ''
    if (ratingNum) {
        ratingEl.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:middle">
                <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 10.19 8.62 3 9.24l4.46 4.73L5.82 21z"/>
            </svg>
            <span class="map-pop__rating-num">${ratingNum}</span>
        `
    }
    header.appendChild(titleEl)
    header.appendChild(ratingEl)

    const descEl = document.createElement('div')
    descEl.className = 'map-pop__desc'
    descEl.textContent = truncateWords(desc || '', 8)

    const footer = document.createElement('div')
    footer.className = 'map-pop__footer'

    const total2 = typeof price === 'number' ? price * 2 : null
    const priceEl = document.createElement('div')
    priceEl.className = 'map-pop__price'
    priceEl.textContent = total2 != null ? `$${total2.toLocaleString()} for 2 nights` : ''

    const datesEl = document.createElement('div')
    datesEl.className = 'map-pop__dates'
    let datesStr = ''
    if (Array.isArray(availableDates)) {
        datesStr = availableDates.length > 3 ? 'Flexible dates' : availableDates.join(', ')
    } else if (typeof availableDates === 'string') {
        datesStr = availableDates.length > 40 ? 'Flexible dates' : availableDates
    } else if (typeof dateRange === 'string' && dateRange.trim()) {
        datesStr = dateRange
    } else {
        datesStr = 'Flexible dates'
    }
    datesEl.textContent = datesStr

    footer.appendChild(priceEl)
    footer.appendChild(datesEl)

    info.appendChild(header)
    info.appendChild(descEl)
    info.appendChild(footer)

    const media = document.createElement('div')
    media.className = 'map-pop__media'
    imgWrap.appendChild(dots)
    media.appendChild(imgWrap)
    if (images.length > 1) {
        media.appendChild(prevBtn)
        media.appendChild(nextBtn)
    }

    card.appendChild(closeBtn)
    card.appendChild(media)
    card.appendChild(info)
    pop.appendChild(card)
    el.appendChild(pop)
    el.appendChild(inner)
    return el
}

const PILL_CSS = `
:host{all:initial}
:host, :host *{box-sizing:border-box}
:root{--palette-hof:#222222;--palette-white:#ffffff}
.map-backdrop{position:absolute;inset:0;z-index:2147483646;background:transparent;display:none}
.map-backdrop.is-open{display:block}
.map-marker{background-color:var(--palette-white);color:#222;border-radius:28px;height:28px;padding:0 12px;position:relative;transform:scale(1);transform-origin:50% 50%;box-shadow:0 8px 28px rgba(0,0,0,.12),0 2px 4px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.06);transition:background-color 200ms cubic-bezier(.2,.8,.2,1),color 200ms cubic-bezier(.2,.8,.2,1),transform 200ms cubic-bezier(.2,.8,.2,1),box-shadow 200ms cubic-bezier(.2,.8,.2,1);display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;cursor:pointer;z-index:2147483647}
.map-marker__inner{display:flex;align-items:center;justify-content:center;height:100%}
.map-marker__text{font-weight:800;font-size:13px;line-height:1}
.map-marker.is-hover,.map-marker:hover{transform:scale(1.08)}
.map-marker.is-active{background-color:var(--palette-hof);color:#fff;box-shadow:0 10px 32px rgba(0,0,0,.22),0 2px 4px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.08)}
.map-pop{position:absolute;left:50%;bottom:calc(100% + 12px);transform:translateX(-50%) scale(.98);opacity:0;pointer-events:none;transition:opacity .15s ease,transform .15s ease;z-index:2147483647}
.map-marker.is-open .map-pop{opacity:1;transform:translateX(-50%) scale(1);pointer-events:auto}
.map-pop__card{position:relative;display:grid;grid-template-rows:auto 1fr;gap:0;width:420px;min-width:420px;max-width:420px;background:#fff;border-radius:16px;padding:0;box-shadow:0 24px 64px rgba(0,0,0,.28),0 8px 16px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.08);text-decoration:none;color:#111}
.map-pop__close{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:16px;border:1px solid rgba(0,0,0,.12);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:3;color:#111}
.map-pop__close svg{width:14px;height:14px;display:block}
.map-pop__media{position:relative;margin:0}
.map-pop__imgwrap{position:relative;width:100%;height:260px;border-radius:16px 16px 0 0;overflow:hidden;background:#f2f2f2}
.map-pop__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.sbp-btn{position:absolute;top:52%;transform:translateY(-50%);width:36px;height:36px;border-radius:18px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.95);backdrop-filter:saturate(120%) blur(2px);cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.18);z-index:2;line-height:0;color:#111}
.sbp-btn:hover{background:#fff}
.sbp-btn svg{width:14px;height:14px;display:block}
.sbp-btn.left{left:8px}
.sbp-btn.right{right:8px}
.sbp-dots{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:6px;z-index:2}
.sbp-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.55)}
.sbp-dot.active{background:#fff}
.map-pop__info{min-width:0;display:grid;gap:6px;padding:12px}
.map-pop__header{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.map-pop__title{font-size:16px;font-weight:800;line-height:1.25;margin:0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.map-pop__rating{display:flex;gap:6px;align-items:center;font-size:13px;color:#222;flex:0 0 auto}
.map-pop__rating-num{font-weight:700}
.map-pop__desc{font-size:13px;line-height:1.4;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.map-pop__footer{display:flex;align-items:center;justify-content:space-between;gap:12px}
.map-pop__price{font-size:14px;font-weight:800;color:#111}
.map-pop__dates{font-size:13px;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right}
`

const GLOBAL_POP_CSS = `
#map-pop-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none}
#map-pop-root .map-pop{position:absolute;transform:translate(-50%, calc(-100% - 12px));pointer-events:auto}
#map-pop-root .map-pop__card{position:relative;display:grid;grid-template-rows:auto 1fr;gap:0;width:420px;min-width:420px;max-width:420px;background:#fff;border-radius:16px;padding:0;box-shadow:0 24px 64px rgba(0,0,0,.28),0 8px 16px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.08);text-decoration:none;color:#111}
#map-pop-root .map-pop__close{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:16px;border:1px solid rgba(0,0,0,.12);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:3;color:#111}
#map-pop-root .map-pop__close svg{width:14px;height:14px;display:block}
#map-pop-root .map-pop__media{position:relative;margin:0}
#map-pop-root .map-pop__imgwrap{position:relative;width:100%;height:240px;border-radius:16px 16px 0 0;overflow:hidden;background:#f2f2f2}
#map-pop-root .map-pop__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
#map-pop-root .sbp-btn{position:absolute;top:52%;transform:translateY(-50%);width:36px;height:36px;border-radius:18px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.95);backdrop-filter:saturate(120%) blur(2px);cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.18);z-index:2;line-height:0;color:#111}
#map-pop-root .sbp-btn:hover{background:#fff}
#map-pop-root .sbp-btn svg{width:14px;height:14px;display:block}
#map-pop-root .sbp-btn.left{left:8px}
#map-pop-root .sbp-btn.right{right:8px}
#map-pop-root .sbp-dots{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:6px;z-index:2}
#map-pop-root .sbp-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.55)}
#map-pop-root .sbp-dot.active{background:#fff}
#map-pop-root .map-pop__info{min-width:0;display:grid;gap:6px;padding:12px}
#map-pop-root .map-pop__title{font-size:16px;font-weight:800;line-height:1.25;margin:0}
#map-pop-root .map-pop__desc{font-size:13px;line-height:1.4;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#map-pop-root .map-pop__footer{display:flex;align-items:center;justify-content:space-between;gap:12px}
#map-pop-root .map-pop__price{font-size:14px;font-weight:800;color:#111}
#map-pop-root .map-pop__dates{font-size:13px;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right}
`

export default function GoogleMapPane({ label, markers = [], fitTo = [], fitKey = '', defaultColors = true, onMapDragEnd, onViewportChange, activeId = null }) {
    const hostRef = useRef(null)
    const mapRef = useRef(null)
    const initRanRef = useRef(false)
    const [dirty, setDirty] = useState(false)
    const readyRef = useRef(false)
    const pendingFitRef = useRef(null)
    const markerRefs = useRef(new Map())
    const backdropRef = useRef(null)
    const viewportCbRef = useRef(onViewportChange)
    useEffect(() => { viewportCbRef.current = onViewportChange }, [onViewportChange])

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

    function ensureGlobalPopRoot() {
        if (!document.getElementById('map-pop-root')) {
            const root = document.createElement('div')
            root.id = 'map-pop-root'
            document.body.appendChild(root)
        }
        if (!document.getElementById('map-pop-global-style')) {
            const st = document.createElement('style')
            st.id = 'map-pop-global-style'
            st.textContent = GLOBAL_POP_CSS
            document.head.appendChild(st)
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
                const backdrop = document.createElement('div')
                backdrop.className = 'map-backdrop'
                backdrop.onclick = (e) => {
                    if (e.target !== backdrop) return
                    markerRefs.current.forEach((ref) => {
                        ref.el.classList.remove('is-open')
                        ref.isOpen = false
                        if (ref._popEl) ref._popEl.style.display = 'none'
                    })
                    backdrop.classList.remove('is-open')
                }
                shadow.appendChild(backdrop)
                backdropRef.current = backdrop
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
                let ticking = false
                const emitViewport = () => {
                    ticking = false
                    const cb = viewportCbRef.current
                    if (!cb) return
                    const b = map.getBounds()
                    if (!b) return
                    cb({
                        bounds: {
                            north: b.getNorthEast().lat(),
                            east: b.getNorthEast().lng(),
                            south: b.getSouthWest().lat(),
                            west: b.getSouthWest().lng()
                        },
                        center: { lat: map.getCenter().lat(), lng: map.getCenter().lng() },
                        zoom: map.getZoom(),
                        source: 'live'
                    })
                }
                const scheduleEmit = () => {
                    if (!ticking) {
                        ticking = true
                        requestAnimationFrame(emitViewport)
                    }
                }
                gmaps.event.addListener(map, 'bounds_changed', scheduleEmit)
                gmaps.event.addListenerOnce(map, 'idle', () => {
                    readyRef.current = true
                    scheduleEmit()
                    if (pendingFitRef.current && pendingFitRef.current.points && pendingFitRef.current.key === fitKey) {
                        applyFit(pendingFitRef.current.points)
                        pendingFitRef.current = null
                    }
                })
                gmaps.event.addListener(map, 'click', () => {
                    markerRefs.current.forEach((ref) => {
                        ref.el.classList.remove('is-open')
                        ref.isOpen = false
                        if (ref._popEl) ref._popEl.style.display = 'none'
                    })
                    if (backdropRef.current) backdropRef.current.classList.remove('is-open')
                })
            })()
        return () => { disposed = true }
    }, [defaultColors])

    useEffect(() => {
        const map = mapRef.current
        const gmaps = window.google && window.google.maps
        if (!map || !gmaps) return
        const existing = markerRefs.current
        const nextIds = new Set(markers.map(m => m.id || `${m.lat},${m.lng}`))
        existing.forEach((obj, id) => {
            if (!nextIds.has(id)) {
                if (obj.gm) {
                    if (obj.gm.setMap) obj.gm.setMap(null)
                    if (obj.gm._overlay) obj.gm._overlay.setMap(null)
                }
                if (obj._popEl && obj._popEl.parentNode) obj._popEl.parentNode.removeChild(obj._popEl)
                if (obj.el && obj.el.remove) obj.el.remove()
                existing.delete(id)
            }
        })
        const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || window.GOOGLE_MAPS_MAP_ID
        const useVectorWithMapId = Boolean(MAP_ID) && !defaultColors
        const AdvancedMarker = gmaps.marker && gmaps.marker.AdvancedMarkerElement
        const canUseAdvanced = useVectorWithMapId && Boolean(AdvancedMarker)

        function closeAll() {
            existing.forEach((ref) => {
                ref.el.classList.remove('is-open')
                ref.isOpen = false
                if (ref._popEl) ref._popEl.style.display = 'none'
            })
            if (backdropRef.current) backdropRef.current.classList.remove('is-open')
        }

        function toggleOpen(targetId) {
            let anyOpen = false
            ensureGlobalPopRoot()
            existing.forEach((ref, id) => {
                if (!ref.el) return
                if (id === targetId) {
                    ref.el.classList.add('is-open')
                    ref.isOpen = true
                    if (ref._popEl) ref._popEl.style.display = 'block'
                    positionPopAtPill(ref)
                    anyOpen = true
                } else {
                    ref.el.classList.remove('is-open')
                    ref.isOpen = false
                    if (ref._popEl) ref._popEl.style.display = 'none'
                }
            })
            if (backdropRef.current) {
                if (anyOpen) backdropRef.current.classList.add('is-open')
                else backdropRef.current.classList.remove('is-open')
            }
        }

        function positionPopAtPill(ref) {
            if (!ref || !ref._popEl || !ref.el) return
            const pillRect = ref.el.getBoundingClientRect()
            if (!pillRect || !pillRect.width) return
            ref._popEl.style.left = `${pillRect.left + pillRect.width / 2}px`
            ref._popEl.style.top = `${pillRect.top}px`
        }

        function handleWindowChange() {
            existing.forEach(ref => { if (ref.isOpen) positionPopAtPill(ref) })
        }
        if (!window.__mapPopStickyHandlers2) {
            window.addEventListener('scroll', handleWindowChange, true)
            window.addEventListener('resize', handleWindowChange, true)
            window.__mapPopStickyHandlers2 = true
        }

        markers.forEach(m => {
            const id = m.id || `${m.lat},${m.lng}`
            const pos = (m && typeof m.lat === 'number' && typeof m.lng === 'number') ? { lat: m.lat, lng: m.lng } : null
            if (!pos) return
            if (existing.has(id)) {
                const ref = existing.get(id)
                const t = ref.el.querySelector('.map-marker__text')
                if (t) t.textContent = typeof m.price === 'number' ? `${m.currency || '$'}${m.price}` : ''
                ref.pos = pos
                if (ref.gm && ref.gm.setPosition) ref.gm.setPosition(pos)
                ref.el.onclick = e => { e.preventDefault(); e.stopPropagation(); toggleOpen(id) }
                if (ref._popEl) {
                    const x = ref._popEl.querySelector('.map-pop__close')
                    if (x) x.onclick = e => { e.preventDefault(); e.stopPropagation(); closeAll() }
                }
                if (ref.isOpen) positionPopAtPill(ref)
                return
            }

            const el = pillEl({
                id: m.id,
                href: m.href,
                images: Array.isArray(m.images) ? m.images : (m.img ? [m.img] : []),
                title: m.title,
                desc: m.desc,
                price: m.price,
                currency: '$',
                rating: m.rating,
                dateRange: m.dateRange,
                availableDates: m.availableDates
            })
            el.addEventListener('mouseenter', () => el.classList.add('is-hover'))
            el.addEventListener('mouseleave', () => el.classList.remove('is-hover'))
            el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleOpen(id) })

            ensureGlobalPopRoot()
            const popEl = el.querySelector('.map-pop')
            if (popEl) {
                popEl.style.display = 'none'
                popEl.addEventListener('click', e => { e.stopPropagation() })
                const x = popEl.querySelector('.map-pop__close')
                if (x) x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); closeAll() })
                document.getElementById('map-pop-root').appendChild(popEl)
            }

            if (canUseAdvanced) {
                const gm = new gmaps.marker.AdvancedMarkerElement({ map, position: pos, content: el, zIndex: 1 })
                markerRefs.current.set(id, { el, gm, pos, _popEl: popEl, isOpen: false })
            } else {
                const overlay = new gmaps.OverlayView()
                overlay.onAdd = function () {
                    const panes = this.getPanes()
                    panes.overlayMouseTarget.appendChild(el)
                }
                overlay.draw = function () {
                    const proj = this.getProjection()
                    if (!proj) return
                    const point = proj.fromLatLngToDivPixel(new gmaps.LatLng(pos.lat, pos.lng))
                    if (!point) return
                    el.style.position = 'absolute'
                    el.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`
                }
                overlay.onRemove = function () { if (el.parentNode) el.parentNode.removeChild(el) }
                overlay.setMap(map)
                const gm = { _overlay: overlay, setPosition: p => overlay.draw && overlay.set && overlay.set('position', new gmaps.LatLng(p.lat, p.lng)) }
                markerRefs.current.set(id, { el, gm, pos, _popEl: popEl, isOpen: false })
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

    useEffect(() => {
        const mapActive = markerRefs.current
        mapActive.forEach(({ el }, id) => {
            if (!el) return
            if (id === activeId) el.classList.add('is-active')
            else el.classList.remove('is-active')
        })
    }, [activeId])

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
                        zIndex: 2147483647
                    }}
                >
                    Search this area
                </button>
            )}
        </div>
    )
}

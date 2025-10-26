import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StayPreviewImage } from './StayPreviewImage'

export function StayBrowsePreview({ stay, onHover }) {
    var rating = 4.85
    if (stay && stay.host && typeof stay.host.rating === 'number') rating = stay.host.rating
    else if (stay && typeof stay.rating === 'number') rating = stay.rating
    else if (stay && Array.isArray(stay.reviews) && stay.reviews.length) {
        var sum = 0
        for (var i = 0; i < stay.reviews.length; i++) {
            var r = stay.reviews[i]
            sum += r && typeof r.rating === 'number' ? r.rating : 0
        }
        rating = sum / stay.reviews.length
    }

    function collectImages(s) {
        var out = []
        if (s) {
            if (typeof s.coverImg === 'string') out.push(s.coverImg)
            if (typeof s.previewImg === 'string') out.push(s.previewImg)
            if (Array.isArray(s.previewImgs)) for (var i = 0; i < s.previewImgs.length; i++) if (typeof s.previewImgs[i] === 'string') out.push(s.previewImgs[i])
            if (Array.isArray(s.imgs)) for (var j = 0; j < s.imgs.length; j++) if (typeof s.imgs[j] === 'string') out.push(s.imgs[j])
            if (typeof s.imgUrl === 'string') out.push(s.imgUrl)
            if (Array.isArray(s.imgUrls)) for (var k = 0; k < s.imgUrls.length; k++) if (typeof s.imgUrls[k] === 'string') out.push(s.imgUrls[k])
        }
        var seen = {}
        var unique = []
        for (var u = 0; u < out.length; u++) { var url = out[u]; if (!seen[url]) { seen[url] = 1; unique.push(url) } }
        return unique
    }

    var images = useMemo(function () { return collectImages(stay) }, [stay])
    var [imgIdx, setImgIdx] = useState(0)
    var [hover, setHover] = useState(false)

    function next(e) {
        if (e && e.preventDefault) e.preventDefault()
        if (e && e.stopPropagation) e.stopPropagation()
        if (images.length < 2) return
        setImgIdx(function (i) { return Math.min(i + 1, images.length - 1) })
    }
    function prev(e) {
        if (e && e.preventDefault) e.preventDefault()
        if (e && e.stopPropagation) e.stopPropagation()
        if (images.length < 2) return
        setImgIdx(function (i) { return Math.max(i - 1, 0) })
    }

    function onTouchStart(e) {
        var t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0
        e.currentTarget.dataset.tx = String(t)
    }
    function onTouchEnd(e) {
        var start = e.currentTarget.dataset && e.currentTarget.dataset.tx ? Number(e.currentTarget.dataset.tx) : 0
        var endTouch = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0
        var dx = endTouch - start
        if (Math.abs(dx) < 24) return
        if (dx < 0) next(e); else prev(e)
    }

    var showControls = images.length > 1 && hover
    var showLeft = showControls && imgIdx > 0
    var showRight = showControls && imgIdx < images.length - 1

    function handleEnter() {
        setHover(true)
        if (typeof onHover === 'function') onHover(true)
    }
    function handleLeave() {
        setHover(false)
        if (typeof onHover === 'function') onHover(false)
    }

    return (
        <article className="stay-card" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <Link className="stay-link" to={'/stay/' + (stay && stay._id ? stay._id : '')} aria-label={stay && stay.title ? stay.title : 'Stay'}>
                <div className="stay-img-wrap stay-browse-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                    <StayPreviewImage stay={stay} alt={stay && stay.title ? stay.title : 'Stay'} currentIndex={imgIdx} />
                    {images.length > 1 && (
                        <>
                            <div className={'sbp-dots' + (hover ? ' visible' : '')}>
                                {images.map(function (_, i) { return <span key={'d' + i} className={i === imgIdx ? 'sbp-dot active' : 'sbp-dot'}></span> })}
                            </div>
                            {showLeft && (
                                <button type="button" aria-label="Previous image" onClick={prev} className="sbp-btn left">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: 14, width: 14, overflow: 'visible', transform: 'scaleX(-1)' }}>
                                        <path d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"></path>
                                    </svg>
                                </button>
                            )}
                            {showRight && (
                                <button type="button" aria-label="Next image" onClick={next} className="sbp-btn right">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: 14, width: 14, overflow: 'visible' }}>
                                        <path d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"></path>
                                    </svg>
                                </button>
                            )}
                        </>
                    )}
                </div>
                <div className="stay-info">
                    <h3 className="stay-title">{stay && stay.title ? stay.title : ''}</h3>
                    <p className="stay-dates">{stay && stay.dateRange ? stay.dateRange : 'Flexible dates'}</p>
                    <div className="stay-meta">
                        <p className="stay-price"><span className="price">{typeof stay.price === 'number' ? '$' + stay.price : ''}</span> night</p>
                        <div className="stay-rating" aria-label="Rating">
                            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 10.19 8.62 3 9.24l4.46 4.73L5.82 21z" /></svg>
                            <span>{Number(rating).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    )
}

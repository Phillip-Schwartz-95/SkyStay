const FALLBACK = '/img/questionmark.jpg'

export function StayPreviewImage({ stay, alt }) {
    const src =
        (stay && stay.coverImg) ||
        (stay && stay.previewImg) ||
        (stay && Array.isArray(stay.previewImgs) && stay.previewImgs[0]) ||
        (stay && Array.isArray(stay.imgs) && stay.imgs[0]) ||
        (stay && stay.imgUrl) ||
        (stay && Array.isArray(stay.imgUrls) && stay.imgUrls[0]) ||
        FALLBACK

    function handleError(e) {
        if (e.currentTarget.dataset.fallbackApplied) return
        e.currentTarget.src = FALLBACK
        e.currentTarget.dataset.fallbackApplied = '1'
    }

    return (
        <img
            className="stay-img"
            src={src}
            alt={alt || stay?.title || 'Stay preview'}
            loading="lazy"
            onError={handleError}
        />
    )
}

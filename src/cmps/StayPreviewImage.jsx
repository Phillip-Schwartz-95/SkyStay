const FALLBACK = '/img/questionmark.jpg'

export function StayPreviewImage({ stay, alt, currentIndex }) {
    var out = []
    if (stay && typeof stay.coverImg === 'string') out.push(stay.coverImg)
    if (stay && typeof stay.previewImg === 'string') out.push(stay.previewImg)
    if (stay && Array.isArray(stay.previewImgs)) {
        for (var i = 0; i < stay.previewImgs.length; i++) if (typeof stay.previewImgs[i] === 'string') out.push(stay.previewImgs[i])
    }
    if (stay && Array.isArray(stay.imgs)) {
        for (var j = 0; j < stay.imgs.length; j++) if (typeof stay.imgs[j] === 'string') out.push(stay.imgs[j])
    }
    if (stay && typeof stay.imgUrl === 'string') out.push(stay.imgUrl)
    if (stay && Array.isArray(stay.imgUrls)) {
        for (var k = 0; k < stay.imgUrls.length; k++) if (typeof stay.imgUrls[k] === 'string') out.push(stay.imgUrls[k])
    }
    var seen = {}
    var unique = []
    for (var u = 0; u < out.length; u++) { var url = out[u]; if (!seen[url]) { seen[url] = 1; unique.push(url) } }
    var imgs = unique.length ? unique : [FALLBACK]

    var idx = 0
    if (typeof currentIndex === 'number') {
        var len = imgs.length
        if (len > 0) idx = ((currentIndex % len) + len) % len
    }
    var src = imgs[idx]

    function handleError(e) {
        if (!e || !e.currentTarget) return
        if (e.currentTarget.dataset && e.currentTarget.dataset.fallbackApplied) return
        e.currentTarget.src = FALLBACK
        if (e.currentTarget.dataset) e.currentTarget.dataset.fallbackApplied = '1'
    }

    return (
        <img
            className="stay-img"
            src={src}
            alt={alt || (stay && stay.title ? stay.title : 'Stay')}
            loading="lazy"
            onError={handleError}
        />
    )
}

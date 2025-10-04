import { Link } from 'react-router-dom'

export function StayPreview({ stay }) {
    const img =
        (Array.isArray(stay.imgs) && stay.imgs[0]) ||
        stay.imgUrl ||
        (Array.isArray(stay.imgUrls) && stay.imgUrls[0]) ||
        '/img/sunflowers.jpg'

    let rating = 4.85
    if (stay && stay.host && typeof stay.host.rating === 'number') {
        rating = stay.host.rating
    } else if (stay && typeof stay.rating === 'number') {
        rating = stay.rating
    } else if (stay && Array.isArray(stay.reviews) && stay.reviews.length) {
        const sum = stay.reviews.reduce((s, r) => s + (r && typeof r.rating === 'number' ? r.rating : 0), 0)
        rating = sum / stay.reviews.length
    }

    return (
        <article className="stay-card">
            <Link to={`/stay/${stay._id}`} className="stay-link">
                <div className="stay-img-wrap">
                    <img
                        className="stay-img"
                        src={img}
                        alt={stay.title}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                </div>

                <div className="stay-info">
                    <h3 className="stay-title">{stay.title}</h3>
                    <p className="stay-dates">{stay && stay.dateRange ? stay.dateRange : 'Flexible dates'}</p>

                    <div className="stay-meta">
                        <p className="stay-price">
                            <span className="price">${stay && typeof stay.price === 'number' ? stay.price : stay.price}</span> night
                        </p>
                        <div className="stay-rating" aria-label="Rating">
                            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="currentColor" d="m12 17.27 6.18 3.73-1.64-7.03L21 9.24l-7.19-.62L12 2 10.19 8.62 3 9.24l4.46 4.73L5.82 21z" />
                            </svg>
                            <span>{Number(rating).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    )
}

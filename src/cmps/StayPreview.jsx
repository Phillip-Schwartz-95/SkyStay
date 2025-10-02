import { Link } from 'react-router-dom'

export function StayPreview({ stay }) {
    const img =
        (Array.isArray(stay.imgs) && stay.imgs[0]) ||
        stay.imgUrl ||
        (Array.isArray(stay.imgUrls) && stay.imgUrls[0]) ||
        '/img/sunflowers.jpg'

    const rating =
        typeof stay?.host?.rating === 'number'
            ? stay.host.rating
            : typeof stay?.rating === 'number'
                ? stay.rating
                : Array.isArray(stay?.reviews) && stay.reviews.length
                    ? (stay.reviews.reduce((s, r) => s + (r.rating || 0), 0) / stay.reviews.length)
                    : 4.85

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
                    <p className="stay-dates">{stay.dateRange || 'Flexible dates'}</p>

                    <div className="stay-meta">
                        <p className="stay-price">
                            <span className="price">${stay.price}</span> night
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

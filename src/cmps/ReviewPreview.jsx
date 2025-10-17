export function ReviewPreview({ review }) {
  if (!review) return null

  return (
    <li className="review-card">
      <div className="review-header">
        <img
          src={review.byUser.imgUrl}
          alt={review.byUser.fullname}
          className="review-avatar"
        />
        <div className="review-meta">
          <strong>{review.byUser.fullname}</strong>
          <p className="review-tenure">
            {review.byUser.tenure || review.byUser.location || 'Airbnb guest'}
          </p>
        </div>
      </div>

      <div className="review-info-row">
        <span className="review-stars">
          {'★'.repeat(Number(review.rating || 5))}
        </span>
        <span className="dot">·</span>
        <span className="review-date">
          {review.date || 'August 2025'}
        </span>
        <span className="dot">·</span>
        <span className="review-stay">
          {review.stayLength || 'Stayed one night'}
        </span>
      </div>

      <p className="review-text">
        {review.txt.length > 120
          ? review.txt.slice(0, 120) + '...'
          : review.txt}
      </p>

      {review.txt.length > 120 && (
        <button className="review-show-more">Show more</button>
      )}
    </li>
  )
}

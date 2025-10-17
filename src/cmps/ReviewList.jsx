import { ReviewPreview } from './ReviewPreview'

export function ReviewsList({ reviews = [] }) {
  if (!reviews.length) return <p>No reviews yet.</p>

  return (
    <ul className="review-list">
      {reviews.map(review => (
        <ReviewPreview key={review._id} review={review} />
      ))}
    </ul>
  )
}
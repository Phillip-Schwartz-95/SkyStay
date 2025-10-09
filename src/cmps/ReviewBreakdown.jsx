import { SvgIcon } from './SvgIcon'

export function ReviewBreakdown({ ratings, reviewCount, starCounts = {} }) {
  const safeCounts = {
    5: starCounts[5] || 0,
    4: starCounts[4] || 0,
    3: starCounts[3] || 0,
    2: starCounts[2] || 0,
    1: starCounts[1] || 0
  }

  const categories = [
    { label: 'Cleanliness', value: ratings.categories.cleanliness, icon: 'cleanliness' },
    { label: 'Accuracy', value: ratings.categories.accuracy, icon: 'accuracy' },
    { label: 'Check-in', value: ratings.categories.checkIn, icon: 'checkin' },
    { label: 'Communication', value: ratings.categories.communication, icon: 'communication' },
    { label: 'Location', value: ratings.categories.location, icon: 'location' },
    { label: 'Value', value: ratings.categories.value, icon: 'value' }
  ]

  return (
    <section className="review-breakdown">
      <div className="breakdown-left">
        <div className="overall-score">
          <span className="score-label">Overall rating</span>
        </div>
        <ul className="star-distribution">
          {[5, 4, 3, 2, 1].map(star => (
            <li key={star} className="star-row">
              <span>{star}</span>
              <div className="bar">
                <div
                  className="fill"
                  style={{
                    width: `${(safeCounts[star] / reviewCount) * 100}%`
                  }}
                ></div>
              </div>

            </li>
          ))}
        </ul>
      </div>

      <div className="breakdown-right">
        {categories.map((cat, idx) => (
          <div key={idx} className="category-box">
            <span className="category-label">{cat.label}</span>
            <span className="category-score">{cat.value.toFixed(1)}</span>
            <SvgIcon iconName={cat.icon} className="category-icon" />
          </div>
        ))}
      </div>
    </section>
  )
}

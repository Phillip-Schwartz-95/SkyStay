// /cmps/staydetails/StaySubHeader.jsx
export function StaySubHeader({ onScrollTo, className = '' }) {
    return (
        <div className={`stay-sub-header ${className}`}>
            <div className="inner">
                <button onClick={() => onScrollTo('photos')}>Photos</button>
                <button onClick={() => onScrollTo('amenities')}>Amenities</button>
                <button onClick={() => onScrollTo('reviews')}>Reviews</button>
                <button onClick={() => onScrollTo('location')}>Location</button>
            </div>
        </div>
    )
}

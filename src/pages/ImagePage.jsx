import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { SvgIcon } from '../cmps/SvgIcon'
import '../assets/styles/cmps/stay/ImagePage.css'

export function ImagePage() {
    const { stayId } = useParams()
    const navigate = useNavigate()
    const stay = useSelector(storeState => storeState.stayModule.stay)

    // Wait until the stay is loaded
    if (!stay || !stay.imgs || !stay.imgs.length) {
        return (
            <section className="stay-gallery-page">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <SvgIcon iconName="backArrow" />
                </button>
                <h1 className="photo-tour-title">Photo tour</h1>
                <p className="no-photos">No photos available for this stay.</p>
            </section>
        )
    }

    return (
        <section className="stay-gallery-page">
            {/* Sticky header */}
            <header className="gallery-header">
                <button className="header-btn" onClick={() => navigate(-1)}>
                    <SvgIcon iconName="backArrow" />
                </button>

                <div className="header-actions">
                    <button className="header-btn">
                        <SvgIcon iconName="share" />
                        <span>Share</span>
                    </button>
                    <button className="header-btn">
                        <SvgIcon iconName="heart" />
                        <span>Save</span>
                    </button>
                </div>
            </header>

            <h1 className="photo-tour-title">Photo tour</h1>

            {/* ✅ Just render all stay.imgs */}
            <div className="gallery-grid">
                {stay.imgs.map((img, idx) => (
                    <img
                        key={idx}
                        src={img}
                        alt={`Stay photo ${idx + 1}`}
                        loading="lazy"
                    />
                ))}
            </div>
        </section>
    )
}
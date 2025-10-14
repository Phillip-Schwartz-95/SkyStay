import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { SvgIcon } from '../cmps/SvgIcon'
import stayphotos from '../data/stayphotos.json'
import '../assets/styles/cmps/stay/ImagePage.css'

export function ImagePage() {
    const { stayId } = useParams()
    const navigate = useNavigate()
    const stay = useSelector(storeState => storeState.stayModule.stay)
    const stayPhoto = stayphotos[stayId]

    if (!stayPhoto) {
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

            {/* Page title */}
            <h1 className="photo-tour-title">Photo tour</h1>

            {/* Category preview bar */}
            <nav className="photo-category-nav">
                {Object.entries(stayPhoto)
                    .filter(([_, images]) => Array.isArray(images) && images.length > 0)
                    .map(([category, images]) => (
                        <button
                            key={category}
                            className="category-preview"
                            onClick={() => {
                                document
                                    .getElementById(category.replace(/\s+/g, '-').toLowerCase())
                                    ?.scrollIntoView({ behavior: 'smooth' })
                            }}
                        >
                            <img src={images[0]} alt={category} />
                            <span>{category}</span>
                        </button>
                    ))}
            </nav>

            {/* Photo categories */}
            {Object.entries(stayPhoto)
                .filter(([_, images]) => Array.isArray(images) && images.length > 0)
                .map(([category, images]) => (
                    <section
                        key={category}
                        id={category.replace(/\s+/g, '-').toLowerCase()}
                        className="photo-category"
                    >
                        <h2 className="photo-category-title">{category}</h2>

                        <div className="gallery-grid">
                            {images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    alt={`${category} image ${i + 1}`}
                                    loading="lazy"
                                />
                            ))}
                        </div>
                    </section>
                ))}
        </section>
    )
}

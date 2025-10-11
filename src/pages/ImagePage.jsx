import { useParams, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { SvgIcon } from '../cmps/SvgIcon'

import stayphotos from "../data/stayphotos.json"

export function ImagePage() {
    const { stayId } = useParams()
    const navigate = useNavigate()
    const stay = useSelector(storeState => storeState.stayModule.stay)
    const stayPhoto = stayphotos[stayId]

    if (!stayPhoto) {
        return (
            <section className="stay-gallery-page">
                <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                <h1 className="photo-tour-title">Photo tour</h1>
                <p>No photos available for this stay.</p>
            </section>
        )
    }

    return (
        <section className="stay-gallery-page">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <SvgIcon iconName="backArrow" />
            </button>
            
            <h1 className="photo-tour-title">Photo tour</h1>

            {Object.entries(stayPhoto)
                .filter(([_, images]) => Array.isArray(images) && images.length > 0)
                .map(([category, images]) => (
                    <section key={category} id={category}>
                        <h2>{category}</h2>
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

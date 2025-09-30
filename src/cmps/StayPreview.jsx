import { Link } from 'react-router-dom'

export function StayPreview({ stay }) {
    return (
        <article className="stay-preview">
            <header>
                <Link to={`/stay/${stay._id}`}>{stay.title}</Link>
            </header>

            <p>Price: <span>${stay.price} per night</span></p>
            {stay.host && <p>Host: <span>{stay.host.fullname}</span></p>}
        </article>
    )
}

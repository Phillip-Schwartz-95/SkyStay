import { SvgIcon } from '../SvgIcon'

export function MeetYourHost({ stay }) {
    if (!stay?.host) return null

    return (
        <section className="meet-your-host">
            <h2>Meet your host</h2>

            <div className="host-layout">
                {/* LEFT SIDE */}
                <div className="host-left-col">
                    <div className="host-card">
                        <div className="host-left">
                            <div className="host-photo-wrapper">
                                <img
                                    src={stay.host?.imgUrl}
                                    alt={stay.host?.fullname}
                                    className="host-photo"
                                />

                                {stay.host?.isSuperhost && (
                                    <div className="superhost-badge">
                                        <SvgIcon iconName="superhostBadge" />
                                    </div>
                                )}

                            </div>
                            <h3 className="host-name">{stay.host?.fullname}</h3>
                            <p className="host-role">
                                {stay.host?.isSuperhost ? (
                                    <>
                                        <SvgIcon iconName="profileLink" className="host-role-icon" />
                                        <span className='profile-link-text'>Superhost</span>
                                    </>
                                ) : (
                                    'Host'
                                )}
                            </p>
                        </div>

                        <div className="host-stats">
                            <div className="stat">
                                <span className="stat-value">{stay.host?.reviews}</span>
                                <span className="stat-label">Reviews</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">
                                    {stay.host?.rating?.toFixed(2)} <span>★</span>
                                </span>
                                <span className="stat-label">Rating</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{stay.host?.monthsHosting}</span>
                                <span className="stat-label">Months hosting</span>
                            </div>
                        </div>
                    </div>

                    {/* UNDER CARD */}
                    <div className="host-extra">
                        <p className="host-fact">
                            <SvgIcon iconName="briefcase" className="host-icon" />
                            <span>My work: {stay.host?.role}</span>
                        </p>
                        <p className="host-fact">
                            <SvgIcon iconName="music" className="host-icon" />
                            <span>
                                Favorite song in high school: {stay.host?.favoritesong}
                            </span>
                        </p>
                        <p className="host-bio">{stay.host?.bio}</p>
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="meet-host-info">
                    <h4 className="superhost-heading">{stay.host?.fullname} is a Superhost</h4>
                    <p className="superhost-text">
                        Superhosts are experienced, highly rated hosts who are committed
                        to providing great stays for guests.
                    </p>

                    <h4 className="info-heading">Host details</h4>
                    <p className="info-text">Response rate: {stay.host?.responseRate}%</p>
                    <span>Responds within {stay.host?.responseTime}</span>

                    <button className="message-host-btn">Message host</button>
                </div>
            </div>
        </section>
    )
}
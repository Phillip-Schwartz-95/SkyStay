import { userService } from '../services/user'
import { StayPreview } from './StayPreview'

export function StayList({ stays = [], onRemoveStay, onUpdateStay }) {
    function shouldShowActionBtns(stay) {
        const user = userService.getLoggedinUser()
        if (!user) return false
        if (user.isAdmin) return true
        if (stay && stay.host && stay.host._id && user._id) return stay.host._id === user._id
        return false
    }

    if (!stays || stays.length === 0) {
        return (
            <section>
                <ul className="stay-list">
                    <li className="empty">No stays found</li>
                </ul>
            </section>
        )
    }

    return (
        <section>
            <ul className="stay-list">
                {stays.map(stay => (
                    <li key={stay._id}>
                        <StayPreview stay={stay} />
                        {shouldShowActionBtns(stay) && (
                            <div className="actions">
                                {onUpdateStay && (
                                    <button onClick={() => onUpdateStay(stay)}>Edit</button>
                                )}
                                {onRemoveStay && (
                                    <button onClick={() => onRemoveStay(stay._id)}>x</button>
                                )}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    )
}

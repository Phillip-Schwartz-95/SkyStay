import { SvgIcon } from "./SvgIcon"

export function GuestCounter({ title, subtitle, count, onIncrease, onDecrease, min = 0 }) {
    return (
        <div className="guest-counter-item">
            <div className="guest-info">
                <p className="title">{title}</p>
                <p className="subtitle">{subtitle}</p>
            </div>
            <div className="guest-controls">
                <button
                    className="control-btn"
                    type="button"
                    onClick={onDecrease}
                    disabled={count <= min}
                >
                    <span>
                        <SvgIcon iconName={'decrease'} className="guest-counter-btn-icon" />
                    </span>
                </button>

                <span className="count">{count}</span>

                <button
                    className="control-btn primary"
                    type="button"
                    onClick={onIncrease}
                >
                    <span>
                        <SvgIcon iconName={'increase'} className="guest-counter-btn-icon" />
                    </span>
                </button>
            </div>
        </div>
    )
}
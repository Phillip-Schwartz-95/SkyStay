
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
                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentcolor', strokeWidth: 3 }}><path d="m2 16h28"></path></svg>
                </button>

                <span className="count">{count}</span>

                <button
                    className="control-btn primary"
                    type="button"
                    onClick={onIncrease}
                >
                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentcolor', strokeWidth: 3 }}><path d="m2 16h28m-14-14v28"></path></svg>
                </button>
            </div>
        </div>
    )
}
// /pages/StayDetails/parts/ThingsToKnow.jsx
export function ThingsToKnow({ rules = [], safety = [], cancellation = [] }) {
  return (
    <section className="things-to-know">
      <h2>Things to know</h2>
      <div className="info-grid">
        <div className="info-block">
          <h3>House Rules</h3>
          <ul>{rules.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
        </div>
        <div className="info-block">
          <h3>Safety & Property</h3>
          <ul>{safety.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
        </div>
        <div className="info-block">
          <h3>Cancellation Policy</h3>
          <ul>{cancellation.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
        </div>
      </div>
    </section>
  )
}
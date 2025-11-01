export function ThingsToKnow({
  rules = [],
  safety = [],
  cancellation = [],
  checkInTime = '',
  checkOutTime = '',
  petsAllowed,
  smokingAllowed,
  partiesAllowed,
  quietHoursStart = '',
  quietHoursEnd = '',
  hasSmokeAlarm,
  hasCOAlarm,
  hasFireExtinguisher
}) {
  const derivedRules = []
  if (checkInTime) derivedRules.push(`Check-in before ${checkInTime}`)
  if (checkOutTime) derivedRules.push(`Check-out before ${checkOutTime}`)
  if (typeof petsAllowed === 'boolean') derivedRules.push(petsAllowed ? 'Pets allowed' : 'No pets')
  if (typeof smokingAllowed === 'boolean') derivedRules.push(smokingAllowed ? 'Smoking allowed' : 'No smoking')
  if (typeof partiesAllowed === 'boolean') derivedRules.push(partiesAllowed ? 'Parties allowed' : 'No parties')
  if (quietHoursStart && quietHoursEnd) derivedRules.push(`Quiet hours: ${quietHoursStart}–${quietHoursEnd}`)
  const rulesList = Array.isArray(rules) && rules.length ? rules : derivedRules

  const derivedSafety = []
  if (typeof hasSmokeAlarm === 'boolean') derivedSafety.push(hasSmokeAlarm ? 'Smoke alarm installed' : 'Smoke alarm not reported')
  if (typeof hasCOAlarm === 'boolean') derivedSafety.push(hasCOAlarm ? 'Carbon monoxide alarm installed' : 'CO alarm not reported')
  if (typeof hasFireExtinguisher === 'boolean') derivedSafety.push(hasFireExtinguisher ? 'Fire extinguisher available' : 'Fire extinguisher not reported')
  const safetyList = Array.isArray(safety) && safety.length ? safety : derivedSafety

  const isCancellationArray = Array.isArray(cancellation)
  const cancellationList = isCancellationArray ? cancellation : (typeof cancellation === 'string' && cancellation.trim() ? [cancellation.trim()] : [])

  return (
    <section className="things-to-know">
      <h2>Things to know</h2>
      <div className="info-grid">
        <div className="info-block">
          <h3>House Rules</h3>
          {rulesList.length ? (
            <ul>{rulesList.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
          ) : (
            <ul><li>No specific house rules provided</li></ul>
          )}
        </div>
        <div className="info-block">
          <h3>Safety &amp; Property</h3>
          {safetyList.length ? (
            <ul>{safetyList.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
          ) : (
            <ul><li>Safety features not reported</li></ul>
          )}
        </div>
        <div className="info-block">
          <h3>Cancellation Policy</h3>
          {cancellationList.length ? (
            <ul>{cancellationList.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
          ) : (
            <ul><li>Flexible</li></ul>
          )}
        </div>
      </div>
    </section>
  )
}

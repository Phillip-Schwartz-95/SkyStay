// /pages/StayDetails/parts/HostInfo.jsx
export function HostInfo({ host, hostUser }) {
  if (!host) return null

  const hostingStr = hostUser?.timeAsUser ??
    (typeof host.monthsHosting === 'number'
      ? (host.monthsHosting >= 12
        ? `${Math.floor(host.monthsHosting / 12)} years hosting`
        : `${host.monthsHosting} months hosting`)
      : '')

  return (
    <div className="host-info">
      <img src={host.imgUrl} alt={host.fullname} className="host-avatar" />
      <div className="host-meta">
        <p className="hosted-by">Hosted by {host.fullname}</p>
        <p className="host-time">{hostingStr}</p>
      </div>
    </div>
  )
}

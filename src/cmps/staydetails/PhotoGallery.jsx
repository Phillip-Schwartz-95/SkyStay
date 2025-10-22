export function PhotoGallery({ imgs = [], stayId, onOpenAll }) {
  if (!imgs?.length) return null

  return (
    <div className="photo-gallery">
      <div className="main-photo">
        <img src={imgs[0]} alt="Main stay image" />
      </div>

      <div className="side-photos">
        {imgs.slice(1, 5).map((img, idx) => (
          <img key={idx} src={img} alt={`Stay side ${idx + 1}`} />
        ))}
      </div>

      {imgs.length > 5 && (
        <button className="show-all-btn" onClick={onOpenAll}>
          Show all photos
        </button>
      )}
    </div>
  )
}

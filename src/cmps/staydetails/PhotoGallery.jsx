import { SvgIcon } from "../SvgIcon"

export function PhotoGallery({ imgs = [], stayId, onOpenAll, photoRef }) {
  if (!imgs?.length) return null

  return (
    <div className="photo-gallery" ref={photoRef}>
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
          <SvgIcon iconName="showall" />
          Show all photos
        </button>
      )}
    </div>
  )
}

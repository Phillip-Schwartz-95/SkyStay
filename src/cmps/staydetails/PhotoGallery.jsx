import { useState, useEffect, useRef } from "react"
import { SvgIcon } from "../SvgIcon"

export function PhotoGallery({ imgs = [], stayId, onOpenAll, photoRef }) {
  const [currentIndex, setCurrentIndex] = useState(1)
  const scrollRef = useRef(null)
  const slideRefs = useRef([])

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (!isMobile) return
    const root = scrollRef.current
    if (!root) return

    slideRefs.current = slideRefs.current.filter(Boolean)

    const io = new IntersectionObserver(
      (entries) => {
        let best = null
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e
        }
        if (best?.isIntersecting) {
          const idx = Number(best.target.dataset.index)
          setCurrentIndex(idx)
        }
      },
      { root: null, threshold: 0.5 }
    )

    slideRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [isMobile, imgs])

  if (!imgs?.length) return null

  const totalSlides = Math.min(imgs.length, 5)

  return (
    <section
      ref={(el) => {
        scrollRef.current = el
        if (photoRef) photoRef.current = el
      }}
      className="photo-gallery"
    >
      <div className="main-photo">
        <img
          src={imgs[0]}
          alt="Main stay image"
          data-index={1}
          ref={(el) => (slideRefs.current[0] = el)}
        />
      </div>

      <div className="side-photos">
        {imgs.slice(1, 5).map((img, idx) => (
          <div key={idx} className="photo-wrapper">
            <img
              src={img}
              alt={`Stay side ${idx + 1}`}
              data-index={idx + 2}
              ref={(el) => (slideRefs.current[idx + 1] = el)}
            />
            {/* show button on the last photo only */}
            {idx === Math.min(imgs.length - 2, 3) && (
              <button className="show-all-btn" onClick={onOpenAll}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  role="presentation"
                  focusable="false"
                  className="show-all-icon"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 11.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-10-5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-10-5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"
                  />
                </svg>
                <span>Show all photos</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="photo-counter">
        {currentIndex}/{totalSlides}
      </div>
    </section>
  )
}

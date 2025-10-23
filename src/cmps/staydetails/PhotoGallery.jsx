import { useState, useEffect, useRef } from "react"
import { SvgIcon } from "../SvgIcon"

export function PhotoGallery({ imgs = [], stayId, onOpenAll, photoRef }) {
  const [currentIndex, setCurrentIndex] = useState(1)

  const scrollRef = useRef(null)
  const slideRefs = useRef([]) // holds refs to each <img>

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Observe which image is most visible inside the scroller (mobile only)
  useEffect(() => {
    if (!isMobile) return
    const root = scrollRef.current
    if (!root) return

    // Clean prev refs
    slideRefs.current = slideRefs.current.filter(Boolean)

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersection ratio
        let best = null
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e
        }
        if (best?.isIntersecting) {
          const idx = Number(best.target.dataset.index) // 1-based
          setCurrentIndex(idx)
        }
      },
      {
        root: null,
        threshold: 0.5, // mostly in view
      }
    )

    slideRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [isMobile, imgs])

  if (!imgs?.length) return null

  // we render 1 main + up to 4 side images (total up to 5)
  const totalSlides = Math.min(imgs.length, 5)

  return (
    <div
      className="photo-gallery"
      ref={(node) => {
        scrollRef.current = node
        if (photoRef) photoRef.current = node
      }}
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
          <img
            key={idx}
            src={img}
            alt={`Stay side ${idx + 1}`}
            data-index={idx + 2} // continue 1-based indexing
            ref={(el) => (slideRefs.current[idx + 1] = el)}
          />
        ))}
      </div>

      {/* Mobile-only counter (safe on desktop too, but you can wrap with isMobile if you want) */}
      <div className="photo-counter">
        {currentIndex}/{totalSlides}
      </div>
    </div>
  )
}

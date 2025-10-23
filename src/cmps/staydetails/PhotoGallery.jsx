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
          <img
            key={idx}
            src={img}
            alt={`Stay side ${idx + 1}`}
            data-index={idx + 2}
            ref={(el) => (slideRefs.current[idx + 1] = el)}
          />
        ))}
      </div>

      <div className="photo-counter">
        {currentIndex}/{totalSlides}
      </div>
    </section>
  )
}

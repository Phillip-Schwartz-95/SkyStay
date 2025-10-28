import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function AppFooter() {
	const footRef = useRef(null)
	const [h, setH] = useState(64)

	useEffect(() => {
		if (!footRef.current) return
		const ro = new ResizeObserver(entries => {
			for (const e of entries) setH(Math.ceil(e.contentRect.height || 64))
		})
		ro.observe(footRef.current)
		return () => ro.disconnect()
	}, [])

	useEffect(() => {
		const prev = document.body.style.paddingBottom
		document.body.style.paddingBottom = `${h}px`
		return () => {
			document.body.style.paddingBottom = prev
		}
	}, [h])

	const footer = (
		<footer
			ref={footRef}
			className="app-footer"
			style={{
				position: 'fixed',
				left: 0,
				right: 0,
				bottom: 0,
				width: '100vw',
				background: '#f7f7f7',
				padding: '20px 0',
				boxSizing: 'border-box',
				zIndex: 2147483000
			}}
		>
			<div
				className="footer-inner"
				style={{
					width: '100%',
					margin: 0,
					paddingLeft: 48,
					paddingRight: 24,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'flex-start',
					gap: 12
				}}
			>
				<div className="footer-left">
					<p style={{ margin: 0, color: '#212121', fontSize: '0.9375rem', lineHeight: 1 }}>
						© 2025 SkyStay,inc
					</p>
				</div>
			</div>
		</footer>
	)

	return createPortal(footer, document.body)
}

export default AppFooter

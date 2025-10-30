import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { setFilter } from '../store/actions/stay.actions'
import { stayService } from '../services/stay'
import { StayFilter } from './StayFilter'
import '../assets/styles/cmps/AppHeader.css'

export function AppHeader({ isMini = false }) {
	const user = useSelector(s => s.userModule.user)
	const dispatch = useDispatch()

	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [isHostingView, setIsHostingView] = useState(false)
	const [isScrolledDown, setIsScrolledDown] = useState(false)
	const [isHostHover, setIsHostHover] = useState(false)
	const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

	const navigate = useNavigate()
	const location = useLocation()
	const isBrowse = location.pathname.startsWith('/browse')
	const isStayDetails = /^\/stay\/[^/]+$/.test(location.pathname)
	const isTrips = location.pathname.startsWith('/trips')
	const isHome = location.pathname === '/'

	const menuRef = useRef(null)
	const btnRef = useRef(null)
	const scrollElRef = useRef(null)

	function handleResetAndHome() {
		dispatch(setFilter(stayService.getDefaultFilter()))
		navigate('/')
	}

	useEffect(() => {
		function getCandidate() {
			const candidates = [
				document.querySelector('.main-container'),
				document.querySelector('.main-app'),
				document.querySelector('#root'),
				document.body,
				document.scrollingElement
			]
			for (const el of candidates) {
				if (!el) continue
				try {
					if (el === document.scrollingElement || el === window) return window
					if (el.scrollHeight > (el.clientHeight || 0)) return el
				} catch (e) { }
			}
			return window
		}
		function onScroll() {
			const el = scrollElRef.current
			const top = el === window
				? (window.scrollY || document.documentElement.scrollTop || 0)
				: (el && el.scrollTop ? el.scrollTop : 0)
			setIsScrolledDown(top > 1)
		}
		function bind() {
			const candidate = getCandidate()
			if (candidate === scrollElRef.current) return
			unbind()
			scrollElRef.current = candidate
			if (candidate === window) window.addEventListener('scroll', onScroll, { passive: true })
			else candidate.addEventListener('scroll', onScroll, { passive: true })
			onScroll()
		}
		function unbind() {
			const cur = scrollElRef.current
			if (!cur) return
			if (cur === window) window.removeEventListener('scroll', onScroll)
			else cur.removeEventListener('scroll', onScroll)
			scrollElRef.current = null
		}
		bind()
		const mo = new MutationObserver(() => bind())
		mo.observe(document.body, { childList: true, subtree: true })
		window.addEventListener('resize', bind)
		const touchListener = () => onScroll()
		window.addEventListener('wheel', touchListener, { passive: true })
		window.addEventListener('touchmove', touchListener, { passive: true })
		return () => {
			unbind()
			mo.disconnect()
			window.removeEventListener('resize', bind)
			window.removeEventListener('wheel', touchListener)
			window.removeEventListener('touchmove', touchListener)
		}
	}, [])

	useEffect(() => {
		if (!isTrips) return
		document.body.classList.add('mytrips-page')
		return () => document.body.classList.remove('mytrips-page')
	}, [isTrips])

	useEffect(() => {
		if (!isMenuOpen) return
		const place = () => {
			const btn = btnRef.current
			if (!btn) return
			const r = btn.getBoundingClientRect()
			setMenuPos({ top: r.bottom + 8, left: r.right })
		}
		place()
		const onKey = e => { if (e.key === 'Escape') setIsMenuOpen(false) }
		const onClickAway = e => {
			if (!menuRef.current && !btnRef.current) return
			if (menuRef.current && menuRef.current.contains(e.target)) return
			if (btnRef.current && btnRef.current.contains(e.target)) return
			setIsMenuOpen(false)
		}
		window.addEventListener('resize', place)
		window.addEventListener('scroll', place, true)
		document.addEventListener('keydown', onKey)
		document.addEventListener('mousedown', onClickAway, true)
		return () => {
			window.removeEventListener('resize', place)
			window.removeEventListener('scroll', place, true)
			document.removeEventListener('keydown', onKey)
			document.removeEventListener('mousedown', onClickAway, true)
		}
	}, [isMenuOpen])

	const headerClasses = isMini || isScrolledDown ? 'app-header mini' : 'app-header'
	const headerBrowseClass = isBrowse ? ' app-header--browse' : ''

	const headerStyle = isStayDetails
		? { position: 'relative', background: '#fff', borderBottom: 'none', height: '80px', zIndex: 2, width: '100%' }
		: { position: 'fixed', top: 0, left: 0, right: 0, width: '100%', zIndex: 1100, background: '#fff', borderBottom: '1px solid rgba(0,0,0,.06)' }

	const rightStyle = (isBrowse || isTrips)
		? { marginLeft: 'auto', paddingRight: '24px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }
		: { marginLeft: 'auto', paddingRight: '16px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end', transform: 'translateX(20px)' }

	const isHostHoverStyle = isHostHover ? 0.8 : 1

	const hostSpanStyle = {
		fontWeight: 600,
		fontSize: '0.92rem',
		padding: '7px 12px',
		cursor: 'pointer',
		userSelect: 'none',
		textDecoration: 'none',
		border: '1px solid rgba(0,0,0,.08)',
		borderRadius: '24px',
		opacity: isHostHoverStyle,
		transition: 'opacity .15s ease',
		...(isBrowse || isTrips ? {} : { transform: 'translate(15px, 2px)' })
	}

	const langBtnStyle = { color: 'black', padding: 8, ...(isBrowse || isTrips ? {} : { transform: 'translate(10px, 2.5px)' }) }
	const profileBtnStyle = { color: 'black', padding: 8, ...(isBrowse || isTrips ? {} : { transform: 'translate(-1px, 2.5px)' }) }

	function goToHostStart() {
		if (!user) {
			showErrorMsg('Please log in first!')
			navigate('/auth/login')
			return
		}
		navigate('/hosting')
	}

	async function onLogout() {
		try {
			await logout()
			showSuccessMsg('Logged out')
		} catch {
			showErrorMsg('Cannot logout')
		}
	}

	return (
		<>
			<header className={headerClasses + headerBrowseClass} style={headerStyle}>
				<nav className="header-nav container" style={isBrowse ? { minHeight: 64 } : (isTrips ? { background: '#fff' } : undefined)}>
					<div className="header-left">
						<Link to="/" className="logo" onClick={handleResetAndHome} style={{ textDecoration: 'none' }}>
							<img className="brand-icon" src="https://www.vectorlogo.zone/logos/airbnb/airbnb-icon.svg" alt="icon" />
							<span className="logo-text">SkyStay</span>
						</Link>
					</div>

					<div className="header-top-center">
						{isHostingView ? (
							<Link to="/hosting" className="nav-pill hosting" style={{ textDecoration: 'none' }}>
								<img src="https://cdn-icons-png.flaticon.com/512/4715/4715693.png" alt="" width="22" height="22" />
								<span>My Listings</span>
							</Link>
						) : (
							<Link
								to="/"
								className="nav-pill homes"
								style={{ display: (isScrolledDown || isBrowse) ? 'none' : 'inline-flex', textDecoration: 'none' }}
								onClick={handleResetAndHome}
							>
								<img
									src="https://a0.muscache.com/im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-search-bar-icons/original/4aae4ed7-5939-4e76-b100-e69440ebeae4.png?im_w=240"
									alt=""
									width="22"
									height="22"
									loading="eager"
								/>
								<span>Homes</span>
							</Link>
						)}
					</div>

					<div className="header-right" style={rightStyle}>
						{user ? (
							<button
								className="switch-mode-btn"
								onClick={() => {
									setIsHostingView(prev => !prev)
									navigate(isHostingView ? '/' : '/hosting')
								}}
								style={{ fontSize: '0.98rem', padding: '7px 12px' }}
							>
								{isHostingView ? 'Switch to traveling' : 'Switch to hosting'}
							</button>
						) : (
							<span
								role="button"
								tabIndex={0}
								style={hostSpanStyle}
								onMouseEnter={() => setIsHostHover(true)}
								onMouseLeave={() => setIsHostHover(false)}
								onClick={goToHostStart}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault()
										goToHostStart()
									}
								}}
							>
								Become a host
							</span>
						)}

						<button className="lang-btn" aria-label="Language" style={langBtnStyle}>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" role="presentation" focusable="false">
								<path d="M8 .25a7.77 7.77 0 0 1 7.75 7.78 7.75 7.75 0 0 1-7.52 7.72h-.25A7.75 7.75 0 0 1 .25 8.24v-.25A7.75 7.75 0 0 1 8 .25zm1.95 8.5h-3.9c.15 2.9 1.17 5.34 1.88 5.5H8c.68 0 1.72-2.37 1.93-5.23zm4.26 0h-2.76c-.09 1.96-.53 3.78-1.18 5.08A6.26 6.26 0 0 0 14.17 9zm-9.67 0H1.8a6.26 6.26 0 0 0 3.94 5.08 12.59 12.59 0 0 1-1.16-4.7l-.03-.38zm1.2-6.58-.12.05a6.26 6.26 0 0 0-3.83 5.03h2.75c.09-1.83.48-3.54 1.06-4.81zm2.25-.42c-.7 0-1.78 2.51-1.94 5.5h3.9c-.15-2.9-1.18-5.34-1.89-5.5h-.07zm2.28.43.03.05a12.95 12.95 0 0 1 1.15 5.02h2.75a6.28 6.28 0 0 0-3.93-5.07z" fill="currentColor"></path>
							</svg>
						</button>

						<div className="profile-menu" style={{ position: 'relative' }}>
							<button
								ref={btnRef}
								className="profile-btn"
								onClick={() => setIsMenuOpen(p => !p)}
								aria-label="Menu"
								style={profileBtnStyle}
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" role="presentation" focusable="false">
									<g fill="none" stroke="currentColor" strokeWidth="3">
										<path d="M2 16h28M2 24h28M2 8h28" />
									</g>
								</svg>
							</button>
						</div>
					</div>

					{!isHostingView && (
						<div
							className="header-center"
							style={
								isBrowse
									? { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 720 }
									: undefined
							}
						>
							<StayFilter isScrolledDown={isBrowse ? true : (isMini || isScrolledDown)} />
						</div>
					)}
				</nav>

				{isMenuOpen && (
					<div
						ref={menuRef}
						className="menu-dropdown"
						style={{
							position: 'fixed',
							top: menuPos.top,
							left: menuPos.left,
							transform: 'translateX(-100%)',
							minWidth: 240,
							background: '#fff',
							borderRadius: 12,
							boxShadow: '0 24px 64px rgba(0,0,0,.28), 0 8px 16px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.08)',
							padding: 8,
							zIndex: 2147483647
						}}
					>
						{!user ? (
							<>
								<span
									role="button"
									tabIndex={0}
									style={{
										display: 'block',
										fontWeight: 600,
										padding: '8px 12px',
										borderRadius: '24px',
										border: '1px solid rgba(0,0,0,.08)',
										cursor: 'pointer',
										userSelect: 'none',
										textDecoration: 'none',
										marginBottom: '6px'
									}}
									onClick={() => {
										setIsMenuOpen(false)
										goToHostStart()
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											setIsMenuOpen(false)
											goToHostStart()
										}
									}}
								>
									Become a host
								</span>

								<Link
									to="/auth/login"
									onClick={() => setIsMenuOpen(false)}
									style={{ display: 'block', padding: '8px 12px', textDecoration: 'none' }}
								>
									Log in or sign up
								</Link>
							</>
						) : (
							<>
								<Link
									to="/trips"
									onClick={() => setIsMenuOpen(false)}
									style={{ display: 'block', padding: '8px 12px', textDecoration: 'none' }}
								>
									My trips
								</Link>

								<Link
									to="/wishlist"
									onClick={() => setIsMenuOpen(false)}
									style={{ display: 'block', padding: '8px 12px', textDecoration: 'none' }}
								>
									My wishlist
								</Link>

								<span
									role="button"
									tabIndex={0}
									style={{
										display: 'block',
										fontWeight: 600,
										padding: '8px 12px',
										borderRadius: '24px',
										border: '1px solid rgba(0,0,0,.08)',
										cursor: 'pointer',
										userSelect: 'none',
										textDecoration: 'none',
										marginBottom: '6px'
									}}
									onClick={() => {
										setIsMenuOpen(false)
										goToHostStart()
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											setIsMenuOpen(false)
											goToHostStart()
										}
									}}
								>
									Become a host
								</span>

								<Link
									to={`/user/${user._id}`}
									onClick={() => setIsMenuOpen(false)}
									style={{ display: 'block', padding: '8px 12px', textDecoration: 'none' }}
								>
									Profile
								</Link>

								<button
									onClick={onLogout}
									style={{
										display: 'block',
										width: '100%',
										textAlign: 'left',
										padding: '8px 12px',
										background: 'transparent',
										border: 'none',
										cursor: 'pointer'
									}}
								>
									Logout
								</button>
							</>
						)}
					</div>
				)}
			</header>

			{!isStayDetails && <div style={{ height: isHome ? 220 : 160 }} />}
		</>
	)
}

export default AppHeader

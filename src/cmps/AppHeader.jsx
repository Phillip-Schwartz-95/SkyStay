import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { StayFilter } from './StayFilter'

export function AppHeader() {
	const user = useSelector(storeState => storeState.userModule.user)

	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [isHostingView, setIsHostingView] = useState(false)
	const [isScrolledDown, setIsScrolledDown] = useState(false)
	const [isHostHover, setIsHostHover] = useState(false)

	const navigate = useNavigate()
	const menuRef = useRef(null)

	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 1) setIsScrolledDown(true)
			else setIsScrolledDown(false)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	async function onLogout() {
		try {
			await logout()
			navigate('/')
			showSuccessMsg('Bye now')
		} catch {
			showErrorMsg('Cannot logout')
		}
	}

	useEffect(() => {
		function onDocClick(ev) {
			if (!menuRef.current) return
			if (!menuRef.current.contains(ev.target)) setIsMenuOpen(false)
		}
		document.addEventListener('click', onDocClick)
		return () => document.removeEventListener('click', onDocClick)
	}, [])

	const headerClasses = isScrolledDown ? 'app-header mini' : 'app-header'

	function goToHostStart() {
		if (!user) {
			showErrorMsg('Please log in first!')
			navigate('/auth/login')
			return
		}
		navigate('/host/start')
	}

	return (
		<header className={headerClasses}>
			<nav className="header-nav container">
				<div className="header-left">
					<Link to="/" className="logo" style={{ textDecoration: 'none' }}>
						<img
							className="brand-icon"
							src="https://www.vectorlogo.zone/logos/airbnb/airbnb-icon.svg"
							alt="icon"
						/>
						<span className="logo-text">SkyStay</span>
					</Link>
				</div>

				<div className="header-top-center">
					{isHostingView ? (
						<Link to="/hosting" className="nav-pill hosting" style={{ textDecoration: 'none' }}>
							<img
								src="https://cdn-icons-png.flaticon.com/512/4715/4715693.png"
								alt=""
								width="22"
								height="22"
							/>
							<span>My Listings</span>
						</Link>
					) : (
						<Link to="/" className="nav-pill homes" style={{ display: isScrolledDown ? 'none' : 'inline-flex', textDecoration: 'none' }}>
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

				<div
					className="header-right"
					style={{
						marginLeft: 'auto',
						paddingRight: '16px',
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						justifyContent: 'flex-end',
						transform: 'translateX(20px)'
					}}
				>
					{user && user.isHost ? (
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
							data-button-content="true"
							className="b1s4anc3 atm_9s_1cw04bb atm_rd_1kw7nm4 atm_vz_kcpwjc atm_uc_kkvtv4 dir dir-ltr"
							role="button"
							tabIndex={0}
							style={{
								fontWeight: 600,
								fontSize: '0.92rem',
								padding: '7px 12px',
								cursor: 'pointer',
								userSelect: 'none',
								textDecoration: 'none',
								border: '1px solid rgba(0,0,0,.08)',
								borderRadius: '24px',
								opacity: isHostHover ? 0.8 : 1,
								transition: 'opacity .15s ease',
								transform: 'translate(15px, 2px)'
							}}
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

					<button className="lang-btn" aria-label="Language" style={{ color: 'black', padding: 8, transform: 'translate(10px, 2.5px)' }}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 16 16"
							width="16"
							height="16"
							aria-hidden="true"
							role="presentation"
							focusable="false"
						>
							<path d="M8 .25a7.77 7.77 0 0 1 7.75 7.78 7.75 7.75 0 0 1-7.52 7.72h-.25A7.75 7.75 0 0 1 .25 8.24v-.25A7.75 7.75 0 0 1 8 .25zm1.95 8.5h-3.9c.15 2.9 1.17 5.34 1.88 5.5H8c.68 0 1.72-2.37 1.93-5.23zm4.26 0h-2.76c-.09 1.96-.53 3.78-1.18 5.08A6.26 6.26 0 0 0 14.17 9zm-9.67 0H1.8a6.26 6.26 0 0 0 3.94 5.08 12.59 12.59 0 0 1-1.16-4.7l-.03-.38zm1.2-6.58-.12.05a6.26 6.26 0 0 0-3.83 5.03h2.75c.09-1.83.48-3.54 1.06-4.81zm2.25-.42c-.7 0-1.78 2.51-1.94 5.5h3.9c-.15-2.9-1.18-5.34-1.89-5.5h-.07zm2.28.43.03.05a12.95 12.95 0 0 1 1.15 5.02h2.75a6.28 6.28 0 0 0-3.93-5.07z" fill="currentColor"></path>
						</svg>
					</button>

					<div className="profile-menu" ref={menuRef}>
						<button
							className="profile-btn"
							onClick={() => setIsMenuOpen(p => !p)}
							aria-label="Menu"
							style={{ color: 'black', padding: 8, transform: 'translate(-1px, 2.5px)' }}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 32 32"
								width="16"
								height="16"
								aria-hidden="true"
								role="presentation"
								focusable="false"
							>
								<g fill="none" stroke="currentColor" strokeWidth="3">
									<path d="M2 16h28M2 24h28M2 8h28" />
								</g>
							</svg>
						</button>

						{isMenuOpen && (
							<div className="menu-dropdown" style={{ textDecoration: 'none' }}>
								{!user && (
									<>
										<span
											data-button-content="true"
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

										<Link
											to="/auth/login"
											onClick={() => setIsMenuOpen(false)}
											style={{ display: 'block', padding: '8px 12px', textDecoration: 'none' }}
										>
											Log in or sign up
										</Link>
									</>
								)}
								{user && (
									<>
										<span
											data-button-content="true"
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
					</div>
				</div>

				{!isHostingView && (
					<div className="header-center">
						<StayFilter isScrolledDown={isScrolledDown} />
					</div>
				)}
			</nav>
		</header>
	)
}

export default AppHeader

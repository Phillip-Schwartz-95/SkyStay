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

	const navigate = useNavigate()

	const menuRef = useRef(null)

	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 10) {
				setIsScrolledDown(true)
			} else {
				setIsScrolledDown(false)
			}
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

	return (
		<header className={headerClasses}>
			<nav className="header-nav container">
				<div className="header-left">
					<Link to="/" className="logo">
						<img
							className="brand-icon"
							src="https://www.vectorlogo.zone/logos/airbnb/airbnb-icon.svg"
							alt="icon"
						/>
						<span className="logo-text">SkyStay</span>
					</Link>
				</div>

				<div className="header-top-center">

					{/* switch from viewing available listings to MY LISTINGS when in hosting mode */}
					{isHostingView ? (
						<Link to="/hosting" className="nav-pill hosting">
							<img
								src="https://cdn-icons-png.flaticon.com/512/4715/4715693.png"
								alt=""
								width="22"
								height="22"
							/>
							<span>My Listings</span>
						</Link>
					) : (
						<Link to="/" className="nav-pill homes" style={{ display: isScrolledDown ? 'none' : 'inline-flex' }}>
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

				<div className="header-right">

					{/* host/traveling switch button */}
					{user && user.isHost ? (
						<>
							<button
								className="switch-mode-btn"
								onClick={() => {
									setIsHostingView(prev => !prev)
									navigate(isHostingView ? '/' : '/hosting')
								}}
							>
								{isHostingView ? 'Switch to traveling' : 'Switch to hosting'}
							</button>
						</>
					) : (
						<button
							className="host-link"
							onClick={() => {
								if (!user) {
									showErrorMsg('Please log in first!')
									navigate('/auth/login')
									return
								}
								navigate('/host/start')
							}}
						>
							Become a host
						</button>
					)}

					<button className="lang-btn" aria-label="Language">
						<i className="fi fi-bs-globe"></i>
					</button>
					<div className="profile-menu" ref={menuRef}>
						<button className="profile-btn" onClick={() => setIsMenuOpen(p => !p)} aria-label="Menu">
							<span className="menu-icon">☰</span>
						</button>
						{isMenuOpen && (
							<div className="menu-dropdown">
								{!user && (
									<>
										<Link to="/host" onClick={() => setIsMenuOpen(false)}>Become a host</Link>
										<Link to="/auth/login" onClick={() => setIsMenuOpen(false)}>Log in or sign up</Link>
									</>
								)}
								{user && (
									<>
										<Link to="/host" onClick={() => setIsMenuOpen(false)}>Become a host</Link>
										<Link to={`/user/${user._id}`} onClick={() => setIsMenuOpen(false)}>Profile</Link>
										<button onClick={onLogout}>Logout</button>
									</>
								)}
							</div>
						)}
					</div>
				</div>

				{/* hide filter when in hosting mode */}
				{!isHostingView && (
					<div className="header-center">
						<StayFilter
						isScrolledDown={isScrolledDown} />
					</div>
				)}
			</nav>
		</header>
	)
}

export default AppHeader

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { StayFilter } from './StayFilter'

export function AppHeader() {
	const user = useSelector(storeState => storeState.userModule.user)
	const navigate = useNavigate()
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const menuRef = useRef(null)

	async function onLogout() {
		try {
			await logout()
			navigate('/')
			showSuccessMsg('Bye now')
		} catch (err) {
			showErrorMsg('Cannot logout')
		}
	}

	function toggleMenu() {
		setIsMenuOpen(prev => !prev)
	}

	useEffect(() => {
		function onDocClick(ev) {
			if (!menuRef.current) return
			if (!menuRef.current.contains(ev.target)) setIsMenuOpen(false)
		}
		document.addEventListener('click', onDocClick)
		return () => document.removeEventListener('click', onDocClick)
	}, [])

	return (
		<header className="app-header">
			<nav className="header-nav container">
				<Link to="/" className="logo">
					<img
						className="brand-icon"
						src="https://www.vectorlogo.zone/logos/airbnb/airbnb-icon.svg"
						alt="icon"
					/>
					<span className="logo-text">SkyStay</span>
				</Link>

				<div className="header-center">
					<StayFilter />
				</div>

				<div className="header-right">
					<Link to="/host" className="host-link">Become a host</Link>
					<button className="lang-btn" aria-label="Language">
						<i className="fi fi-bs-globe"></i>
					</button>
					<div className="profile-menu" ref={menuRef}>
						<button className="profile-btn" onClick={toggleMenu} aria-label="Menu">
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
			</nav>
		</header>
	)
}

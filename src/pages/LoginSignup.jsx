// src/pages/LoginSignup.jsx
import { useState, useEffect } from 'react'
import { userService } from '../services/user'
import { login, signup } from '../store/actions/user.actions'
import { ImgUploader } from '../cmps/ImgUploader'

export function LoginSignup({ onClose }) {
    const [tab, setTab] = useState('login')

    return (
        <div className="auth-modal">
            <div className="auth-content" role="dialog" aria-modal="true">
                <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>
                <h2>Welcome to SkyStay</h2>

                <nav className="auth-tabs">
                    <button
                        type="button"
                        className={tab === 'login' ? 'active' : ''}
                        onClick={() => setTab('login')}
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        className={tab === 'signup' ? 'active' : ''}
                        onClick={() => setTab('signup')}
                    >
                        Sign up
                    </button>
                </nav>

                {tab === 'login' ? <LoginForm onDone={onClose} /> : <SignupForm onDone={onClose} />}
            </div>
        </div>
    )
}

function LoginForm({ onDone }) {
    const [users, setUsers] = useState([])
    const [credentials, setCredentials] = useState({ username: '', password: '' })

    useEffect(() => { userService.getUsers().then(setUsers).catch(() => setUsers([])) }, [])

    async function onLogin(ev) {
        ev.preventDefault()
        if (!credentials.username) return
        await login(credentials)
        onDone?.()
    }

    function handleChange(ev) {
        const { name, value } = ev.target
        setCredentials(prev => ({ ...prev, [name]: value }))
    }

    return (
        <form className="auth-form" onSubmit={onLogin}>
            <label>
                Username
                <select name="username" value={credentials.username} onChange={handleChange}>
                    <option value="">Select User</option>
                    {users.map(u => (
                        <option key={u._id} value={u.username}>
                            {u.fullname || u.username}
                        </option>
                    ))}
                </select>
            </label>

            <button type="submit" className="btn-primary full">Continue</button>

            <div className="auth-divider"><span>or</span></div>
            <button type="button" className="auth-social google" disabled>Continue with Google</button>
            <button type="button" className="auth-social apple" disabled>Continue with Apple</button>
            <button type="button" className="auth-social email" disabled>Continue with Email</button>
        </form>
    )
}

function SignupForm({ onDone }) {
    const [credentials, setCredentials] = useState(userService.getEmptyUser())

    function handleChange(ev) {
        const { name, value } = ev.target
        setCredentials(prev => ({ ...prev, [name]: value }))
    }

    async function onSignup(ev) {
        ev.preventDefault()
        if (!credentials.username || !credentials.password || !credentials.fullname) return
        await signup(credentials)
        onDone?.()
    }

    function onUploaded(imgUrl) {
        setCredentials(prev => ({ ...prev, imgUrl }))
    }

    return (
        <form className="auth-form" onSubmit={onSignup}>
            <input type="text" name="fullname" value={credentials.fullname} placeholder="Full name" onChange={handleChange} required />
            <input type="text" name="username" value={credentials.username} placeholder="Username" onChange={handleChange} required />
            <input type="password" name="password" value={credentials.password} placeholder="Password" onChange={handleChange} required />
            <ImgUploader onUploaded={onUploaded} />
            <button className="btn-primary full">Sign up</button>
        </form>
    )
}

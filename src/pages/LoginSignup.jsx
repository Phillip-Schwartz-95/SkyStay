import { Outlet, useNavigate } from 'react-router'
import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { userService } from '../services/user'
import { login, signup } from '../store/actions/user.actions'
import { ImgUploader } from '../cmps/ImgUploader'

export function LoginSignup() {
    return (
        <div className="login-page">
            <nav>
                <NavLink to="login">Login</NavLink>
                <NavLink to="signup">Signup</NavLink>
            </nav>
            <Outlet />
        </div>
    )
}

export function Login() {
    const [users, setUsers] = useState([])
    const [credentials, setCredentials] = useState({ username: '', password: '', fullname: '' })
    const navigate = useNavigate()

    useEffect(() => { loadUsers() }, [])

    async function loadUsers() {
        try {
            const users = await userService.getUsers()
            setUsers(users)
        } catch (err) {
            console.error('Failed to load users:', err)
            setUsers([])
        }
    }

    async function onLogin(ev) {
        ev?.preventDefault()
        if (!credentials.username) return
        try {
            await login(credentials)
            navigate('/')
        } catch (err) {
            console.error('Cannot login:', err)
        }
    }

    function handleChange(ev) {
        const field = ev.target.name
        const value = ev.target.value
        setCredentials(prev => ({ ...prev, [field]: value }))
    }

    return (
        <form className="login-form" onSubmit={onLogin}>
            <select name="username" value={credentials.username} onChange={handleChange}>
                <option value="">Select User</option>
                {users.map(user => (
                    <option key={user._id} value={user.username}>{user.fullname}</option>
                ))}
            </select>
            <button>Login</button>
        </form>
    )
}

export function Signup() {
    const [credentials, setCredentials] = useState(userService.getEmptyUser())
    const navigate = useNavigate()

    function clearState() {
        setCredentials({ username: '', password: '', fullname: '', imgUrl: '' })
    }

    function handleChange(ev) {
        const field = ev.target.name
        const value = ev.target.value
        setCredentials(prev => ({ ...prev, [field]: value }))
    }

    async function onSignup(ev) {
        ev?.preventDefault()
        if (!credentials.username || !credentials.password || !credentials.fullname) return
        try {
            await signup(credentials)
            clearState()
            navigate('/')
        } catch (err) {
            console.error('Cannot signup:', err)
        }
    }

    function onUploaded(imgUrl) {
        setCredentials(prev => ({ ...prev, imgUrl }))
    }

    return (
        <form className="signup-form" onSubmit={onSignup}>
            <input type="text" name="fullname" value={credentials.fullname} placeholder="Fullname" onChange={handleChange} required />
            <input type="text" name="username" value={credentials.username} placeholder="Username" onChange={handleChange} required />
            <input type="password" name="password" value={credentials.password} placeholder="Password" onChange={handleChange} required />
            <ImgUploader onUploaded={onUploaded} />
            <button>Signup</button>
        </form>
    )
}

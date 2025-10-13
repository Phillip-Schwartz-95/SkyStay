import { storageService } from '../async-storage.service'
import usersJson from '../../data/users.json'

const STORAGE_KEY_LOGGEDIN_USER = 'loggedinUser'

export const userService = {
    login,
    logout,
    signup,
    getUsers,
    getById,
    getByFullname,
    remove,
    update,
    getLoggedinUser,
    saveLoggedinUser,
}

async function getUsers() {
    let users = await storageService.query('user')

    // seed if empty
    if (!users.length) {
        for (const user of usersJson) {
            // use post, but keep the same _id
            const newUser = { ...user, _id: user._id } // keep ID
            await storageService.post('user', newUser)
        }
        users = await storageService.query('user')
    }

    // temporarily without password field
    return users.map(({ password, ...user }) => ({ ...user }))
}


async function getById(userId) {
    return await storageService.get('user', userId)
}

async function getByFullname(fullname) {
    const users = await getUsers()
    return users.find(u => u.fullname === fullname) || null
}

function remove(userId) {
    return storageService.remove('user', userId)
}

async function update(userToUpdate) {
    const existingUser = await storageService.get('user', userToUpdate._id)
    const updatedUser = { ...existingUser, ...userToUpdate }

    await storageService.put('user', updatedUser)

    const loggedinUser = getLoggedinUser()
    if (loggedinUser && loggedinUser._id === updatedUser._id) {
        saveLoggedinUser(updatedUser)
    }

    return updatedUser
}

async function login({ username }) {
    const users = await storageService.query('user')
    const user = users.find(u => u.username === username)
    if (!user) throw new Error('User not found')

    saveLoggedinUser(user) // don’t make new ID, just save existing one
    return user
}


async function signup(userCred) {
    if (!userCred.imgUrl) userCred.imgUrl = 'https://cdn.pixabay.com/photo/2020/07/01/12/58/icon-5359553_1280.png'
    userCred.score = 10000

    const user = await storageService.post('user', userCred)
    return saveLoggedinUser(user)
}

async function logout() {
    sessionStorage.removeItem(STORAGE_KEY_LOGGEDIN_USER)
}

function getLoggedinUser() {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY_LOGGEDIN_USER))
}

function saveLoggedinUser(user) {
    user = {
        _id: user._id,
        fullname: user.fullname,
        imgUrl: user.imgUrl,
        score: user.score,
        isAdmin: user.isAdmin
    }
    sessionStorage.setItem(STORAGE_KEY_LOGGEDIN_USER, JSON.stringify(user))
    return user
}

// To quickly create an admin user, uncomment the next line
// _createAdmin()
async function _createAdmin() {
    const user = {
        username: 'admin',
        password: 'admin',
        fullname: 'Mustafa Adminsky',
        imgUrl: 'https://cdn.pixabay.com/photo/2020/07/01/12/58/icon-5359553_1280.png',
        score: 10000,
    }

    const newUser = await storageService.post('user', userCred)
    console.log('newUser: ', newUser)
}
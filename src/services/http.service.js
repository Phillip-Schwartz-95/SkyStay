import Axios from 'axios'

const BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3030/api/'

const axios = Axios.create({ withCredentials: true })

export const httpService = {
    get(endpoint, data) {
        return ajax(endpoint, 'GET', data)
    },
    post(endpoint, data) {
        return ajax(endpoint, 'POST', data)
    },
    put(endpoint, data) {
        return ajax(endpoint, 'PUT', data)
    },
    delete(endpoint, data) {
        return ajax(endpoint, 'DELETE', data)
    }
}

async function ajax(endpoint, method = 'GET', data = null) {
    const url = `${BASE_URL}${endpoint}`
    const params = method === 'GET' ? data : null

    try {
        const res = await axios({ url, method, data, params })
        return res.data
    } catch (err) {
        console.error('Error from backend:', err)
        throw err
    }
}
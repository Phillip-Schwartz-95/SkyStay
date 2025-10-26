const { DEV, VITE_LOCAL } = import.meta.env

import { getRandomIntInclusive, makeId } from '../util.service'

import { stayService as local } from './stay.service.local'
import { stayService as remote } from './stay.service.remote'

console.log('stayService mode check → VITE_LOCAL =', VITE_LOCAL)
console.log('VITE_LOCAL:', import.meta.env.VITE_LOCAL)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)

function getEmptyStay() {
    return {
        _id: '',
        title: makeId(),
        price: getRandomIntInclusive(80, 240),
        msgs: [],
    }
}

function getDefaultFilter() {
    return {
        txt: '',
        minPrice: '',
        sortField: '',
        sortDir: '',
    }
}

const service = (VITE_LOCAL === 'true') ? local : remote
export const stayService = { getEmptyStay, getDefaultFilter, ...service }

// Easy access to this service from the dev tools console
// when using script - dev / dev:local

if (DEV) window.stayService = stayService

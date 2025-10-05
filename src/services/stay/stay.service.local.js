import staysJson from '../../data/stays.json'
import { storageService } from '../async-storage.service'
import { makeId } from '../util.service'
import { userService } from '../user'

const STORAGE_KEY = 'stay'
let seedPrms = null

export const stayService = {
    query,
    getById,
    save,
    remove,
    addStayMsg,
    getEmptyStay
}

async function ensureSeeded() {
    let stays = await storageService.query(STORAGE_KEY)
    if (Array.isArray(stays) && stays.length) return stays
    if (!seedPrms) {
        seedPrms = (async () => {
            for (const raw of staysJson) {
                const s = { ...raw }
                if (!s._id) s._id = makeId()
                await storageService.post(STORAGE_KEY, s)
            }
            return storageService.query(STORAGE_KEY)
        })().finally(() => { seedPrms = null })
    }
    return seedPrms
}

function applyFilter(items, f) {
    if (!Array.isArray(items)) return []
    if (!f) return items
    let res = items
    if (f.txt && typeof f.txt === 'string') {
        const t = f.txt.toLowerCase()
        res = res.filter(s => {
            const inTitle = s && s.title && s.title.toLowerCase().includes(t)
            const inCity = s && s.loc && s.loc.city && s.loc.city.toLowerCase().includes(t)
            const inCountry = s && s.loc && s.loc.country && s.loc.country.toLowerCase().includes(t)
            const inSummary = s && s.summary && s.summary.toLowerCase().includes(t)
            return inTitle || inCity || inCountry || inSummary
        })
    }
    if (f.loc && f.loc.country) res = res.filter(s => s && s.loc && s.loc.country === f.loc.country)
    if (f.loc && f.loc.city) res = res.filter(s => s && s.loc && s.loc.city === f.loc.city)
    if (f.price && typeof f.price.min === 'number') res = res.filter(s => typeof s.price === 'number' && s.price >= f.price.min)
    if (f.price && typeof f.price.max === 'number') res = res.filter(s => typeof s.price === 'number' && s.price <= f.price.max)
    if (Array.isArray(f.amenities) && f.amenities.length) {
        res = res.filter(s => Array.isArray(s.amenities) && f.amenities.every(a => s.amenities.includes(a)))
    }
    return res
}

function applySort(items, sortField, sortDir) {
    if (!sortField) return items
    const dir = +sortDir || 1
    const arr = [...items]
    if (sortField === 'title') {
        arr.sort((a, b) => (a.title || '').localeCompare(b.title || '') * dir)
    } else if (sortField === 'price') {
        arr.sort((a, b) => ((a.price || 0) - (b.price || 0)) * dir)
    }
    return arr
}

async function query(filterBy = { txt: '', sortField: '', sortDir: '' }) {
    const all = await ensureSeeded()
    const filtered = applyFilter(all, filterBy)
    return applySort(filtered, filterBy.sortField, filterBy.sortDir)
}

function getById(stayId) {
    return storageService.get(STORAGE_KEY, stayId)
}

async function remove(stayId) {
    await storageService.remove(STORAGE_KEY, stayId)
}

async function save(stay) {
    let savedStay
    if (stay._id) {
        savedStay = await storageService.put(STORAGE_KEY, stay)
    } else {
        stay._id = makeId()
        stay.host = userService.getLoggedinUser()
        stay.msgs = []
        savedStay = await storageService.post(STORAGE_KEY, stay)
    }
    return savedStay
}

async function addStayMsg(stayId, txt) {
    const stay = await getById(stayId)
    const msg = { id: makeId(), by: userService.getLoggedinUser(), txt }
    if (!Array.isArray(stay.msgs)) stay.msgs = []
    stay.msgs.push(msg)
    await storageService.put(STORAGE_KEY, stay)
    return msg
}

function getEmptyStay() {
    return {
        _id: '',
        title: '',
        price: 0,
        host: null,
        msgs: []
    }
}

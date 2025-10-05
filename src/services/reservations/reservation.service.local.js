import { storageService } from '../async-storage.service'
import reservationsJson from '../../data/reservations.json'
import { makeId } from '../util.service'

const STORAGE_KEY = 'reservation'

export const reservationService = {
  query,
  getById,
  add,
  remove,
  getByStayId,
  getByUserId,
}

async function query(filterBy = {}) {
  let reservations = await storageService.query(STORAGE_KEY)

  // Seed if empty
  if (!reservations.length) {
    for (const res of reservationsJson) {
      await storageService.post(STORAGE_KEY, res)
    }
    reservations = await storageService.query(STORAGE_KEY)
  }

  // If filterBy.stayId, filter
  if (filterBy.stayId) {
    reservations = reservations.filter(res => res.stayId === filterBy.stayId)
  }

  return reservations
}

async function getById(resId) {
  return await storageService.get(STORAGE_KEY, resId)
}

async function add(reservation) {
  const newRes = { 
    _id: 'r' + makeId(), 
    ...reservation 
  }
  return await storageService.post(STORAGE_KEY, newRes)
}

async function remove(resId) {
  return await storageService.remove(STORAGE_KEY, resId)
}

async function getByStayId(stayId) {
  const reservations = await query()
  return reservations.filter(res => res.stayId === stayId)
}

async function getByUserId(userId) {
  const reservations = await query()
  return reservations.filter(res => res.userId === userId)
}

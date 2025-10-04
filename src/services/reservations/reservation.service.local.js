import { storageService } from '../async-storage.service'
import reservationsJson from '../../data/reservations.json'

const STORAGE_KEY = 'reservation'

export const reservationService = {
  query,
  getById,
  add,
  remove,
  getByStayId,
  getByUserId,
}

async function query() {
  let reservations = await storageService.query(STORAGE_KEY)

  // Seed if empty
  if (!reservations.length) {
    for (const res of reservationsJson) {
      await storageService.post(STORAGE_KEY, res)
    }
    reservations = await storageService.query(STORAGE_KEY)
  }

  return reservations
}

async function getById(resId) {
  return await storageService.get(STORAGE_KEY, resId)
}

async function add(reservation) {
  return await storageService.post(STORAGE_KEY, reservation)
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

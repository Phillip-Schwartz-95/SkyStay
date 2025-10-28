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

  if (!reservations.length) {
    for (const res of reservationsJson) {
      await storageService.post(STORAGE_KEY, res)
    }
    reservations = await storageService.query(STORAGE_KEY)
  }

  if (filterBy.stayId) {
    reservations = reservations.filter(res => res.stayId === filterBy.stayId)
  }

  if (filterBy.userId) {
    reservations = reservations.filter(res => res.userId === filterBy.userId)
  }

  if (filterBy.status) {
    const wanted = Array.isArray(filterBy.status) ? filterBy.status : [filterBy.status]
    reservations = reservations.filter(res => wanted.includes(res.status))
  }

  return reservations
}

async function getById(resId) {
  return await storageService.get(STORAGE_KEY, resId)
}

async function add(reservation) {
  const now = Date.now()
  const newRes = {
    _id: 'r' + makeId(),
    status: reservation.status || 'pending',
    bookedOn: reservation.bookedOn || now,
    ...reservation,
  }
  return await storageService.post(STORAGE_KEY, newRes)
}

async function remove(resId) {
  return await storageService.remove(STORAGE_KEY, resId)
}

async function getByStayId(stayId) {
  const reservations = await query({ stayId })
  return reservations
}

async function getByUserId(userId) {
  const reservations = await query({ userId })
  return reservations
}

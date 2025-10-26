import { httpService } from '../http.service'

export const reservationService = {
  query,
  getById,
  add,
  remove,
  getByStayId,
  getByUserId,
}

async function query(filterBy = {}) {
  const queryStr = new URLSearchParams(filterBy).toString()
  return httpService.get(`reservation${queryStr ? '?' + queryStr : ''}`)
}

function getById(resId) {
  return httpService.get(`reservation/${resId}`)
}

function add(reservation) {
  return httpService.post('reservation', reservation)
}

function remove(resId) {
  return httpService.delete(`reservation/${resId}`)
}

function getByStayId(stayId) {
  return httpService.get(`reservation/byStay/${stayId}`)
}

function getByUserId(userId) {
  return httpService.get(`reservation/byUser/${userId}`)
}

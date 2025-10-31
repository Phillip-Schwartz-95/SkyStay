import { httpService } from '../http.service'

export const reservationService = {
  query,
  getById,
  add,
  remove,
  getByStayId,
  getByUserId,
  updateStatus,
  approve,
  decline,
}

function toId(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v.$oid) return v.$oid
  return String(v)
}

function normalizeReservation(r) {
  if (!r || typeof r !== 'object') return r
  return {
    ...r,
    _id: r._id?.$oid ? r._id.$oid : r._id,
    userId: toId(r.userId),
    hostId: toId(r.hostId),
    stayId: toId(r.stayId),
    status: String(r.status || 'pending').toLowerCase(),
  }
}

function normalizeList(list) {
  return Array.isArray(list) ? list.map(normalizeReservation) : []
}

async function query(filterBy = {}) {
  const qs = new URLSearchParams(filterBy).toString()
  const res = await httpService.get(`reservation${qs ? `?${qs}` : ''}`)
  return normalizeList(res)
}

async function getById(resId) {
  const res = await httpService.get(`reservation/${toId(resId)}`)
  return normalizeReservation(res)
}

async function add(reservation) {
  const res = await httpService.post('reservation', reservation)
  return normalizeReservation(res)
}

async function remove(resId) {
  return httpService.delete(`reservation/${toId(resId)}`)
}

async function getByStayId(stayId) {
  const res = await httpService.get(`reservation/byStay/${toId(stayId)}`)
  return normalizeList(res)
}

async function getByUserId(userId) {
  const res = await httpService.get(`reservation/byUser/${toId(userId)}`)
  return normalizeList(res)
}

async function updateStatus(id, status) {
  const res = await httpService.put(`reservation/${toId(id)}/status`, { status: String(status).toLowerCase() })
  return normalizeReservation(res)
}

function approve(id) {
  return updateStatus(id, 'approved')
}

function decline(id) {
  return updateStatus(id, 'declined')
}

import staysJson from '../../data/stays.json'
import { storageService } from '../async-storage.service'
import { makeId } from '../util.service'
import { userService } from '../user'

const STORAGE_KEY = 'stay'

export const stayService = {
  query,
  getById,
  save,
  remove,
  addStayMsg,
  getEmptyStay
}

// Load from localStorage or seed from stays.json
async function query(filterBy = { txt: '', sortField: '', sortDir: '' }) {
  let stays = await storageService.query(STORAGE_KEY)

 if (!stays.length) {
  for (const stay of staysJson) {
    const stayToAdd = { ...stay, _id: makeId() } // force new random ID
    await storageService.post(STORAGE_KEY, stayToAdd)
  }
  stays = await storageService.query(STORAGE_KEY)
}

  const { txt, sortField, sortDir } = filterBy

  if (txt) {
    const regex = new RegExp(txt, 'i')
    stays = stays.filter(stay => regex.test(stay.title))
  }

  if (sortField === 'title') {
    stays.sort((a, b) =>
      a[sortField].localeCompare(b[sortField]) * +sortDir
    )
  }
  if (sortField === 'price') {
    stays.sort((a, b) =>
      (a[sortField] - b[sortField]) * +sortDir
    )
  }

  return stays
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
  const msg = {
    id: makeId(),
    by: userService.getLoggedinUser(),
    txt
  }
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

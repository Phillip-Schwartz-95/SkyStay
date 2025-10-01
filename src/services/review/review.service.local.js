import { storageService } from '../async-storage.service'
import { userService } from '../user'
import { stayService } from '../stay'

const STORAGE_KEY = 'review'

export const reviewService = {
  query,
  add,
  remove,
}

async function query() {
  return storageService.query(STORAGE_KEY)
}

async function remove(reviewId) {
  await storageService.remove(STORAGE_KEY, reviewId)
}

async function add({ txt, aboutStayId }) {
  const loggedInUser = userService.getLoggedinUser()
  if (!loggedInUser) throw new Error('Must be logged in to add a review')

  const stay = await stayService.getById(aboutStayId)
  if (!stay) throw new Error('Stay not found')

  const reviewToAdd = {
    txt,
    byUser: {
      _id: loggedInUser._id,
      fullname: loggedInUser.fullname,
      imgUrl: loggedInUser.imgUrl,
    },
    aboutStay: {
      _id: stay._id,
      title: stay.title,
    },
  }

  // bump score for review writer
  loggedInUser.score += 10
  await userService.update(loggedInUser)

  return storageService.post(STORAGE_KEY, reviewToAdd)
}

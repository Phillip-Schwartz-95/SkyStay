import { storageService } from '../async-storage.service'
import { userService } from '../user'
import { stayService } from '../stay'
import reviewsJson from '../../data/reviews.json'

const STORAGE_KEY = 'review'

export const reviewService = {
	query,
	add,
	remove,
}

async function query(filterBy = {}) {
	let reviews = await storageService.query(STORAGE_KEY)

	if (!reviews.length) {
		for (const review of reviewsJson) {
			await storageService.post(STORAGE_KEY, review)
		}
		reviews = await storageService.query(STORAGE_KEY)
	}

	if (filterBy.aboutStayId) {
		reviews = reviews.filter(r => r.aboutStayId === filterBy.aboutStayId)
	}
	return reviews
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

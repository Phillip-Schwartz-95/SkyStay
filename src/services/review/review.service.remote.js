import { httpService } from '../http.service.js'

export const reviewService = {
	add,
	query,
	remove,
}

function query(filterBy = {}) {
	const queryStr = filterBy.aboutStayId ? `?aboutStayId=${filterBy.aboutStayId}` : ''
	return httpService.get(`review${queryStr}`)
}

async function remove(reviewId) {
	await httpService.delete(`review/${reviewId}`)
}

async function add({ txt, aboutStayId }) {
	return await httpService.post('review', { txt, aboutStayId })
}
import staysJson from '../../data/stays.json'
import { storageService } from '../async-storage.service'
import { loadFromStorage, makeId, saveToStorage } from '../util.service'
import { userService } from '../user'
import { reservationService } from '../reservations/reservation.service.local'

const STORAGE_KEY = 'stay'
let seedPrms = null
_createstays()
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

async function applyFilter(items, f) {
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

    const startDate = f.startDate ? new Date(f.startDate).getTime() : null
    const endDate = f.endDate ? new Date(f.endDate).getTime() : null
    if (startDate && endDate) {
        const allReservations = await reservationService.query()
        const bookedStayIds = allReservations.filter(res => {
            const resStart = new Date(res.checkIn).getTime()
            const resEnd = new Date(res.checkOut).getTime()
            const isOverlap = resStart < endDate && resEnd > startDate
            return isOverlap
        }).map(res => res.stayId)
        res = res.filter(stay => !bookedStayIds.includes(stay._id))
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

async function query(filterBy = { txt: '', sortField: '', sortDir: '', startDate: null, endDate: null }) {
    //const all = await ensureSeeded()
    //const filtered = await applyFilter(all, filterBy)
    //return applySort(filtered, filterBy.sortField, filterBy.sortDir)
    return await storageService.query(STORAGE_KEY)
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

//STAYS.JSON has been moved here
function _createstays() {
    let stays = loadFromStorage(STORAGE_KEY)
    if (stays && stays.length) return
    stays = [
        {
            "_id": "s101",
            "title": "Cozy Cabin",
            "price": 120,
            "loc": {
                "country": "USA",
                "city": "Denver",
                "lat": 39.7392,
                "lng": -104.9903
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Case_Mountain_Cabin_Exterior_Side_and_Porch_November_2024.jpg/1280px-Case_Mountain_Cabin_Exterior_Side_and_Porch_November_2024.jpg"
            ],
            "summary": "A warm wooden cabin perfect for mountain getaways. Includes fireplace, balcony, and beautiful forest views.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation before Dec 4"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 5.0,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.8,
                    "checkIn": 5.0,
                    "communication": 4.8,
                    "location": 5.0,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "2 guests maximum"
            ],
            "safety": [
                "Carbon monoxide alarm not reported",
                "Smoke alarm not reported"
            ],
            "cancellationPolicy": [
                "Free cancellation before Oct 13",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Olivia",
                "imgUrl": "/img/olivia.jpg",
                "role": "Chef and conducting workshops",
                "favoritesong": "Hotel California",
                "bio": "I love to chat about health, well-being, and personal development. I learned herbal medicine this year and enjoy sharing knowledge.",
                "isSuperhost": true,
                "monthsHosting": 7,
                "reviews": 63,
                "rating": 4.84,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s102",
            "title": "Beach Bungalow",
            "price": 200,
            "loc": {
                "country": "Israel",
                "city": "Tel Aviv",
                "lat": 32.0853,
                "lng": 34.7818
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/f/f3/Tel_Aviv_-_Beach_001.jpg"
            ],
            "summary": "A bright seaside bungalow just steps from the Mediterranean. Perfect for sun lovers and nightlife explorers.",
            "maxGuests": 3,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                {
                    "icon": "key",
                    "title": "Exceptional check-in experience",
                    "desc": "Recent guests gave the check-in process a 5-star rating."
                },
                {
                    "icon": "map",
                    "title": "Walkable area",
                    "desc": "Guests say this area is easy to get around."
                },
                {
                    "icon": "calendar",
                    "title": "Free cancellation before Nov 30",
                    "desc": "Get a full refund if you change your mind."
                }
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.9,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.9,
                    "checkIn": 4.9,
                    "communication": 4.8,
                    "location": 5.0,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 1",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Maya",
                "imgUrl": "/img/maya.jpg",
                "role": "Photographer and travel enthusiast",
                "favoritesong": "Clair de Lune",
                "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
                "isSuperhost": false,
                "monthsHosting": 12,
                "reviews": 45,
                "rating": 4.67,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s103",
            "title": "Shinjuku Sky Loft",
            "price": 165,
            "loc": {
                "country": "Japan",
                "city": "Tokyo",
                "lat": 35.6762,
                "lng": 139.6503
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/52/Shinjuku_night_skyline.jpg"
            ],
            "summary": "Minimalist high-rise loft with city views, steps from restaurants and transit.",
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Washer"
            ],
            "ratings": {
                "overall": 4.85,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.7,
                    "checkIn": 4.9,
                    "communication": 4.8,
                    "location": 5.0,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 20",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Aiko",
                "imgUrl": "/img/aiko.jpg",
                "role": "UX designer and café hunter",
                "favoritesong": "Plastic Love",
                "bio": "Born and raised in Tokyo, I love sharing local tips for food and hidden parks.",
                "isSuperhost": true,
                "monthsHosting": 18,
                "reviews": 112,
                "rating": 4.88,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s104",
            "title": "Kyoto Garden Townhouse",
            "price": 140,
            "loc": {
                "country": "Japan",
                "city": "Kyoto",
                "lat": 35.0116,
                "lng": 135.7681
            },
            "imgs": [
                "https://images.pexels.com/photos/593710/pexels-photo-593710.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=1"
            ],
            "summary": "Traditional machiya with inner garden, tatami rooms, and tea corner near Gion.",
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Heating"
            ],
            "ratings": {
                "overall": 4.93,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.9,
                    "checkIn": 4.8,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "Shoes off inside"
            ],
            "safety": [
                "Smoke alarm installed",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 10",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Kei",
                "imgUrl": "/img/kei.jpg",
                "role": "Tea ceremony guide",
                "favoritesong": "River Flows in You",
                "bio": "I host culture walks and love recommending scenic routes and local sweets.",
                "isSuperhost": false,
                "monthsHosting": 9,
                "reviews": 38,
                "rating": 4.82,
                "responseRate": 96,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s105",
            "title": "Tuscan Stone Villa",
            "price": 250,
            "loc": {
                "country": "Italy",
                "city": "Florence",
                "lat": 43.7696,
                "lng": 11.2558
            },
            "imgs": [
                "https://images.pexels.com/photos/259962/pexels-photo-259962.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=1"
            ],
            "summary": "Rustic hillside villa with olive grove views, terrace dining, and easy access to the Duomo.",
            "highlights": [
                "Panoramic terrace",
                "Free parking",
                "Great for families"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.91,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.9,
                    "checkIn": 4.9,
                    "communication": 5.0,
                    "location": 4.8,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "First aid kit available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 5",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Giulia",
                "imgUrl": "/img/giulia.jpg",
                "role": "Food tour host",
                "favoritesong": "Vivo per lei",
                "bio": "I adore Tuscan cuisine and can point you to the best trattorie and wineries.",
                "isSuperhost": true,
                "monthsHosting": 22,
                "reviews": 154,
                "rating": 4.94,
                "responseRate": 98,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s106",
            "title": "Sea Cliff Apartment",
            "price": 175,
            "loc": {
                "country": "Israel",
                "city": "Haifa",
                "lat": 32.794,
                "lng": 34.9896
            },
            "imgs": [
                "https://images.pexels.com/photos/460376/pexels-photo-460376.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=1"
            ],
            "summary": "Modern apartment above the bay with balcony sunsets and quick access to the gardens.",
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.76,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.8,
                    "checkIn": 4.8,
                    "communication": 4.7,
                    "location": 4.9,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 28",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Noa",
                "imgUrl": "/img/noa.jpg",
                "role": "Marine biologist",
                "favoritesong": "Space Oddity",
                "bio": "I love the sea and sharing my favorite coastal walks and cafés.",
                "isSuperhost": false,
                "monthsHosting": 14,
                "reviews": 57,
                "rating": 4.76,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s107",
            "title": "Brooklyn Brownstone Suite",
            "price": 210,
            "loc": {
                "country": "USA",
                "city": "New York",
                "lat": 40.6782,
                "lng": -73.9442
            },
            "imgs": [
                ""
            ],
            "summary": "Sunny parlor-floor suite in a classic brownstone with easy subway access.",
            "highlights": [
                "Great location",
                "Exceptional check-in",
                "Work-friendly space"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No pets"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 3",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Jamal",
                "imgUrl": "/img/jamal.jpg",
                "role": "Music producer",
                "favoritesong": "Empire State of Mind",
                "bio": "I love recommending live music spots and neighborhood coffee shops.",
                "isSuperhost": true,
                "monthsHosting": 16,
                "reviews": 89,
                "rating": 4.9,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s108",
            "title": "Eilat Boutique Apartment",
            "price": 107,
            "loc": {
                "country": "Israel",
                "city": "Eilat",
                "lat": 29.5577,
                "lng": 34.9519
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/9/9e/Eilat_Beach.jpg"
            ],
            "summary": "Quiet spot in Eilat close to transit and cafes.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.82,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.8,
                    "checkIn": 5.0,
                    "communication": 4.9,
                    "location": 5.0,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 30",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Emma Suzuki",
                "imgUrl": "/img/emma.jpg",
                "role": "Designer",
                "favoritesong": "Hotel California",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 24,
                "reviews": 174,
                "rating": 4.75,
                "responseRate": 96,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s109",
            "title": "Tiberias Boutique Apartment",
            "price": 222,
            "loc": {
                "country": "Israel",
                "city": "Tiberias",
                "lat": 32.7922,
                "lng": 35.5312
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/4/45/Tiberias_panorama.jpg"
            ],
            "summary": "Bright space in Tiberias, ideal for food and culture lovers.",
            "maxGuests": 4,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.72,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.6,
                    "checkIn": 4.9,
                    "communication": 4.7,
                    "location": 4.8,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 19",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Kenji Levi",
                "imgUrl": "/img/kenji.jpg",
                "role": "Barista",
                "favoritesong": "Imagine",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 24,
                "reviews": 178,
                "rating": 4.77,
                "responseRate": 95,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s110",
            "title": "Eilat Stone Cottage",
            "price": 254,
            "loc": {
                "country": "Israel",
                "city": "Eilat",
                "lat": 29.5577,
                "lng": 34.9519
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/9/9e/Eilat_Beach.jpg"
            ],
            "summary": "Quiet spot in Eilat close to transit and cafes.",
            "maxGuests": 5,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.6,
                    "checkIn": 4.7,
                    "communication": 4.9,
                    "location": 4.6,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 4",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Daniel Cohen",
                "imgUrl": "/img/daniel.jpg",
                "role": "Musician",
                "favoritesong": "Hotel California",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 11,
                "reviews": 155,
                "rating": 4.63,
                "responseRate": 98,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s111",
            "title": "Tiberias City Pad",
            "price": 162,
            "loc": {
                "country": "Israel",
                "city": "Tiberias",
                "lat": 32.7922,
                "lng": 35.5312
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/4/45/Tiberias_panorama.jpg"
            ],
            "summary": "Stylish base in Tiberias for exploring Israel.",
            "maxGuests": 4,
            "bedRooms": 1,
            "baths": 2,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 4.8,
                    "location": 4.5,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 3",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Liam Garcia",
                "imgUrl": "/img/liam.jpg",
                "role": "Artist",
                "favoritesong": "River Flows in You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 6,
                "reviews": 148,
                "rating": 4.62,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s112",
            "title": "Zikhron Ya’akov Loft",
            "price": 155,
            "loc": {
                "country": "Israel",
                "city": "Zikhron Ya’akov",
                "lat": 32.5733,
                "lng": 34.9523
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/15/Zichron_Ya%27akov_main_street.jpg"
            ],
            "summary": "Bright space in Zikhron Ya’akov, ideal for food and culture lovers.",
            "maxGuests": 4,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 5.0,
                    "accuracy": 4.5,
                    "checkIn": 4.6,
                    "communication": 4.7,
                    "location": 4.6,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 28",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Ava Williams",
                "imgUrl": "/img/ava.jpg",
                "role": "Designer",
                "favoritesong": "Hotel California",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 20,
                "reviews": 22,
                "rating": 4.86,
                "responseRate": 98,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s113",
            "title": "Santorini Harbor View",
            "price": 101,
            "loc": {
                "country": "Greece",
                "city": "Santorini",
                "lat": 36.3932,
                "lng": 25.4615
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/1a/Santorini_Thira.jpg"
            ],
            "summary": "Stylish base in Santorini for exploring Greece.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.6,
                    "checkIn": 5.0,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 15",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yonatan Katz",
                "imgUrl": "/img/yonatan.jpg",
                "role": "Host",
                "favoritesong": "Shape of You",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 30,
                "reviews": 38,
                "rating": 4.98,
                "responseRate": 96,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s114",
            "title": "Chicago Skyline Suite",
            "price": 244,
            "loc": {
                "country": "USA",
                "city": "Chicago",
                "lat": 41.8781,
                "lng": -87.6298
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0e/Chicago_Skyline_2020.jpg"
            ],
            "summary": "Comfortable stay in Chicago with easy access to main sights.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 3,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.67,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.7,
                    "checkIn": 4.6,
                    "communication": 4.6,
                    "location": 4.6,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 19",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Daniel Rossi",
                "imgUrl": "/img/daniel.jpg",
                "role": "Guide",
                "favoritesong": "Yellow",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 13,
                "reviews": 162,
                "rating": 4.86,
                "responseRate": 98,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s115",
            "title": "Barcelona Boutique Apartment",
            "price": 248,
            "loc": {
                "country": "Spain",
                "city": "Barcelona",
                "lat": 41.3851,
                "lng": 2.1734
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/56/1_barcelona_panorama_2014.jpg"
            ],
            "summary": "Comfortable stay in Barcelona with easy access to main sights.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.72,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.7,
                    "checkIn": 4.8,
                    "communication": 4.8,
                    "location": 4.5,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 28",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Lea Cohen",
                "imgUrl": "/img/lea.jpg",
                "role": "Photographer",
                "favoritesong": "Shape of You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 27,
                "reviews": 46,
                "rating": 4.96,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s116",
            "title": "Cape Town Townhouse",
            "price": 253,
            "loc": {
                "country": "South Africa",
                "city": "Cape Town",
                "lat": -33.9249,
                "lng": 18.4241
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Cape_Town_panorama_2015.jpg"
            ],
            "summary": "Quiet spot in Cape Town close to transit and cafes.",
            "maxGuests": 6,
            "bedRooms": 4,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.7,
                    "checkIn": 5.0,
                    "communication": 4.5,
                    "location": 4.9,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 27",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Omer Suzuki",
                "imgUrl": "/img/omer.jpg",
                "role": "Barista",
                "favoritesong": "River Flows in You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 15,
                "reviews": 71,
                "rating": 4.62,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s117",
            "title": "Zurich Loft",
            "price": 288,
            "loc": {
                "country": "Switzerland",
                "city": "Zurich",
                "lat": 47.3769,
                "lng": 8.5417
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/57/Z%C3%BCrich_-_Grossmuenster_und_Limmat.jpg"
            ],
            "summary": "Quiet spot in Zurich close to transit and cafes.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 2,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.65,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.7,
                    "checkIn": 4.7,
                    "communication": 4.7,
                    "location": 4.6,
                    "value": 4.5
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 14",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Akira Ivanov",
                "imgUrl": "/img/akira.jpg",
                "role": "Barista",
                "favoritesong": "Clair de Lune",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 19,
                "reviews": 90,
                "rating": 4.8,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s118",
            "title": "Rome Rooftop Loft",
            "price": 235,
            "loc": {
                "country": "Italy",
                "city": "Rome",
                "lat": 41.9028,
                "lng": 12.4964
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/5c/Colosseo_2020.jpg"
            ],
            "summary": "Stylish base in Rome for exploring Italy.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.63,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.5,
                    "checkIn": 4.7,
                    "communication": 4.5,
                    "location": 4.9,
                    "value": 4.5
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 26",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yonatan Johnson",
                "imgUrl": "/img/yonatan.jpg",
                "role": "Host",
                "favoritesong": "Space Oddity",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 17,
                "reviews": 108,
                "rating": 4.92,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s119",
            "title": "Sapporo Skyline Suite",
            "price": 218,
            "loc": {
                "country": "Japan",
                "city": "Sapporo",
                "lat": 43.0618,
                "lng": 141.3545
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/7/77/Sapporo_TV_Tower_2018.jpg"
            ],
            "summary": "Modern hideaway in Sapporo with great walkability.",
            "maxGuests": 4,
            "bedRooms": 1,
            "baths": 3,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 4.9,
                    "location": 4.5,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 8",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Amir Singh",
                "imgUrl": "/img/amir.jpg",
                "role": "Chef",
                "favoritesong": "Clair de Lune",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 24,
                "reviews": 127,
                "rating": 4.93,
                "responseRate": 98,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s120",
            "title": "Vienna Rooftop Loft",
            "price": 280,
            "loc": {
                "country": "Austria",
                "city": "Vienna",
                "lat": 48.2082,
                "lng": 16.3738
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wien_-_Sch%C3%B6nbrunn_-_Gloriette_%282%29.JPG"
            ],
            "summary": "Stylish base in Vienna for exploring Austria.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.9,
                    "checkIn": 4.8,
                    "communication": 4.8,
                    "location": 4.8,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 5",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Akira Ivanov",
                "imgUrl": "/img/akira.jpg",
                "role": "Barista",
                "favoritesong": "Imagine",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 11,
                "reviews": 116,
                "rating": 4.78,
                "responseRate": 96,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s121",
            "title": "Cape Town Retreat",
            "price": 168,
            "loc": {
                "country": "South Africa",
                "city": "Cape Town",
                "lat": -33.9249,
                "lng": 18.4241
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Cape_Town_panorama_2015.jpg"
            ],
            "summary": "Modern hideaway in Cape Town with great walkability.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.85,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.8,
                    "checkIn": 4.7,
                    "communication": 5.0,
                    "location": 5.0,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 21",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Emma Williams",
                "imgUrl": "/img/emma.jpg",
                "role": "Chef",
                "favoritesong": "Clair de Lune",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 8,
                "reviews": 66,
                "rating": 4.79,
                "responseRate": 99,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s122",
            "title": "Queenstown City Pad",
            "price": 228,
            "loc": {
                "country": "New Zealand",
                "city": "Queenstown",
                "lat": -45.0312,
                "lng": 168.6626
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/e/ef/Queenstown%2C_New_Zealand.jpg"
            ],
            "summary": "Bright space in Queenstown, ideal for food and culture lovers.",
            "maxGuests": 3,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 5.0,
                    "checkIn": 4.9,
                    "communication": 5.0,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 16",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Rina Chen",
                "imgUrl": "/img/rina.jpg",
                "role": "Guide",
                "favoritesong": "Space Oddity",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 15,
                "reviews": 146,
                "rating": 4.63,
                "responseRate": 98,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s123",
            "title": "Los Angeles Townhouse",
            "price": 282,
            "loc": {
                "country": "USA",
                "city": "Los Angeles",
                "lat": 34.0522,
                "lng": -118.2437
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/8/89/Los_Angeles_skyline_at_night.jpg"
            ],
            "summary": "Comfortable stay in Los Angeles with easy access to main sights.",
            "maxGuests": 6,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.5,
                    "checkIn": 4.7,
                    "communication": 4.9,
                    "location": 4.6,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 30",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Amir Katz",
                "imgUrl": "/img/amir.jpg",
                "role": "Guide",
                "favoritesong": "Yellow",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 14,
                "reviews": 145,
                "rating": 4.64,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s124",
            "title": "Paris Lake House",
            "price": 160,
            "loc": {
                "country": "France",
                "city": "Paris",
                "lat": 48.8566,
                "lng": 2.3522
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg"
            ],
            "summary": "Quiet spot in Paris close to transit and cafes.",
            "maxGuests": 4,
            "bedRooms": 3,
            "baths": 1,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.6,
                    "checkIn": 4.7,
                    "communication": 4.8,
                    "location": 4.5,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 19",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Lea Levi",
                "imgUrl": "/img/lea.jpg",
                "role": "Chef",
                "favoritesong": "Plastic Love",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 13,
                "reviews": 107,
                "rating": 4.69,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s125",
            "title": "Vienna City Pad",
            "price": 248,
            "loc": {
                "country": "Austria",
                "city": "Vienna",
                "lat": 48.2082,
                "lng": 16.3738
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wien_-_Sch%C3%B6nbrunn_-_Gloriette_%282%29.JPG"
            ],
            "summary": "Quiet spot in Vienna close to transit and cafes.",
            "maxGuests": 2,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.5,
                    "checkIn": 4.8,
                    "communication": 5.0,
                    "location": 4.8,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 26",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Daniel Cohen",
                "imgUrl": "/img/daniel.jpg",
                "role": "Barista",
                "favoritesong": "Space Oddity",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 26,
                "reviews": 76,
                "rating": 4.62,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s126",
            "title": "Buenos Aires Retreat",
            "price": 149,
            "loc": {
                "country": "Argentina",
                "city": "Buenos Aires",
                "lat": -34.6037,
                "lng": -58.3816
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/9/9f/Buenos_Aires_montage.jpg"
            ],
            "summary": "Comfortable stay in Buenos Aires with easy access to main sights.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.72,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.5,
                    "checkIn": 4.8,
                    "communication": 4.8,
                    "location": 4.7,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 27",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Hannah Romero",
                "imgUrl": "/img/hannah.jpg",
                "role": "Designer",
                "favoritesong": "River Flows in You",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 16,
                "reviews": 165,
                "rating": 4.72,
                "responseRate": 99,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s127",
            "title": "Rome Rooftop Loft",
            "price": 90,
            "loc": {
                "country": "Italy",
                "city": "Rome",
                "lat": 41.9028,
                "lng": 12.4964
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/5c/Colosseo_2020.jpg"
            ],
            "summary": "Comfortable stay in Rome with easy access to main sights.",
            "maxGuests": 5,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.9,
                    "checkIn": 4.6,
                    "communication": 4.7,
                    "location": 4.7,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 10",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Alina Chen",
                "imgUrl": "/img/alina.jpg",
                "role": "Photographer",
                "favoritesong": "Shape of You",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 7,
                "reviews": 94,
                "rating": 4.66,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s128",
            "title": "Vienna Skyline Suite",
            "price": 144,
            "loc": {
                "country": "Austria",
                "city": "Vienna",
                "lat": 48.2082,
                "lng": 16.3738
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wien_-_Sch%C3%B6nbrunn_-_Gloriette_%282%29.JPG"
            ],
            "summary": "Comfortable stay in Vienna with easy access to main sights.",
            "maxGuests": 3,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.8,
                    "checkIn": 4.5,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 9",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yael Chen",
                "imgUrl": "/img/yael.jpg",
                "role": "Designer",
                "favoritesong": "Space Oddity",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 18,
                "reviews": 176,
                "rating": 4.8,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s129",
            "title": "Cape Town Townhouse",
            "price": 176,
            "loc": {
                "country": "South Africa",
                "city": "Cape Town",
                "lat": -33.9249,
                "lng": 18.4241
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Cape_Town_panorama_2015.jpg"
            ],
            "summary": "Quiet spot in Cape Town close to transit and cafes.",
            "maxGuests": 6,
            "bedRooms": 3,
            "baths": 3,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 5.0,
                    "checkIn": 4.7,
                    "communication": 4.7,
                    "location": 4.7,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 5",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Rina Mizrahi",
                "imgUrl": "/img/rina.jpg",
                "role": "Musician",
                "favoritesong": "Space Oddity",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 30,
                "reviews": 26,
                "rating": 4.78,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s130",
            "title": "Chicago Loft",
            "price": 156,
            "loc": {
                "country": "USA",
                "city": "Chicago",
                "lat": 41.8781,
                "lng": -87.6298
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0e/Chicago_Skyline_2020.jpg"
            ],
            "summary": "Stylish base in Chicago for exploring USA.",
            "maxGuests": 6,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.77,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 5.0,
                    "checkIn": 4.9,
                    "communication": 4.6,
                    "location": 4.7,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 5",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yusuf Williams",
                "imgUrl": "/img/yusuf.jpg",
                "role": "Barista",
                "favoritesong": "Clair de Lune",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 21,
                "reviews": 76,
                "rating": 4.84,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s131",
            "title": "Marrakesh Boutique Apartment",
            "price": 244,
            "loc": {
                "country": "Morocco",
                "city": "Marrakesh",
                "lat": 31.6295,
                "lng": -7.9811
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/15/Marrakesh_Medina.jpg"
            ],
            "summary": "Quiet spot in Marrakesh close to transit and cafes.",
            "maxGuests": 3,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.7,
                    "checkIn": 4.7,
                    "communication": 4.6,
                    "location": 5.0,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 26",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Rina Brown",
                "imgUrl": "/img/rina.jpg",
                "role": "Chef",
                "favoritesong": "Plastic Love",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 25,
                "reviews": 151,
                "rating": 4.68,
                "responseRate": 96,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s132",
            "title": "Vienna Lake House",
            "price": 221,
            "loc": {
                "country": "Austria",
                "city": "Vienna",
                "lat": 48.2082,
                "lng": 16.3738
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wien_-_Sch%C3%B6nbrunn_-_Gloriette_%282%29.JPG"
            ],
            "summary": "Modern hideaway in Vienna with great walkability.",
            "maxGuests": 5,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.7,
                    "checkIn": 4.8,
                    "communication": 4.7,
                    "location": 4.9,
                    "value": 4.5
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 2",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Nora Brown",
                "imgUrl": "/img/nora.jpg",
                "role": "Host",
                "favoritesong": "River Flows in You",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 11,
                "reviews": 174,
                "rating": 4.9,
                "responseRate": 96,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s133",
            "title": "Reykjavik Harbor View",
            "price": 290,
            "loc": {
                "country": "Iceland",
                "city": "Reykjavik",
                "lat": 64.1466,
                "lng": -21.9426
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/8/84/Reykjavik_panorama.jpg"
            ],
            "summary": "Stylish base in Reykjavik for exploring Iceland.",
            "maxGuests": 2,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.68,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.5,
                    "checkIn": 4.7,
                    "communication": 4.6,
                    "location": 4.8,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 18",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Lea Singh",
                "imgUrl": "/img/lea.jpg",
                "role": "Engineer",
                "favoritesong": "Shape of You",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 10,
                "reviews": 21,
                "rating": 4.88,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s134",
            "title": "Lisbon Boutique Apartment",
            "price": 184,
            "loc": {
                "country": "Portugal",
                "city": "Lisbon",
                "lat": 38.7223,
                "lng": -9.1393
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/c/c1/Lisbon_Montage_2016.jpg"
            ],
            "summary": "Bright space in Lisbon, ideal for food and culture lovers.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.7,
                    "checkIn": 4.7,
                    "communication": 4.7,
                    "location": 5.0,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 17",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Noa Johnson",
                "imgUrl": "/img/noa.jpg",
                "role": "Chef",
                "favoritesong": "Clair de Lune",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 7,
                "reviews": 153,
                "rating": 4.85,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s135",
            "title": "Chiang Mai Townhouse",
            "price": 101,
            "loc": {
                "country": "Thailand",
                "city": "Chiang Mai",
                "lat": 18.7883,
                "lng": 98.9853
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/4/47/ChiangMai_old_city.jpg"
            ],
            "summary": "Modern hideaway in Chiang Mai with great walkability.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 3,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.7,
                    "checkIn": 4.8,
                    "communication": 5.0,
                    "location": 4.5,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 30",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Rina Suzuki",
                "imgUrl": "/img/rina.jpg",
                "role": "Designer",
                "favoritesong": "River Flows in You",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 19,
                "reviews": 47,
                "rating": 4.68,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s136",
            "title": "Nara Old Town Home",
            "price": 116,
            "loc": {
                "country": "Japan",
                "city": "Nara",
                "lat": 34.6851,
                "lng": 135.8048
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/1e/Nara_Park_deer.jpg"
            ],
            "summary": "Stylish base in Nara for exploring Japan.",
            "maxGuests": 5,
            "bedRooms": 1,
            "baths": 2,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.85,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.7,
                    "checkIn": 4.7,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 1",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Nora Romero",
                "imgUrl": "/img/nora.jpg",
                "role": "Artist",
                "favoritesong": "Shape of You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 11,
                "reviews": 152,
                "rating": 4.9,
                "responseRate": 96,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s137",
            "title": "Venice Retreat",
            "price": 145,
            "loc": {
                "country": "Italy",
                "city": "Venice",
                "lat": 45.4408,
                "lng": 12.3155
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/f/f6/Venice_grand_canal_2017.jpg"
            ],
            "summary": "Quiet spot in Venice close to transit and cafes.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.77,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 5.0,
                    "checkIn": 4.9,
                    "communication": 4.5,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 14",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Rina Cohen",
                "imgUrl": "/img/rina.jpg",
                "role": "Guide",
                "favoritesong": "Shape of You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 11,
                "reviews": 56,
                "rating": 4.82,
                "responseRate": 98,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s138",
            "title": "Paris City Pad",
            "price": 287,
            "loc": {
                "country": "France",
                "city": "Paris",
                "lat": 48.8566,
                "lng": 2.3522
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg"
            ],
            "summary": "Stylish base in Paris for exploring France.",
            "maxGuests": 5,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.8,
                    "checkIn": 4.8,
                    "communication": 4.6,
                    "location": 4.9,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 16",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Chiara Singh",
                "imgUrl": "/img/chiara.jpg",
                "role": "Guide",
                "favoritesong": "Space Oddity",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 23,
                "reviews": 92,
                "rating": 4.8,
                "responseRate": 95,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s139",
            "title": "Lisbon Loft",
            "price": 297,
            "loc": {
                "country": "Portugal",
                "city": "Lisbon",
                "lat": 38.7223,
                "lng": -9.1393
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/c/c1/Lisbon_Montage_2016.jpg"
            ],
            "summary": "Comfortable stay in Lisbon with easy access to main sights.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 3,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.7,
                    "checkIn": 4.6,
                    "communication": 4.5,
                    "location": 4.8,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 7",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Mia Ivanov",
                "imgUrl": "/img/mia.jpg",
                "role": "Designer",
                "favoritesong": "Shape of You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 15,
                "reviews": 113,
                "rating": 4.67,
                "responseRate": 96,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s140",
            "title": "Marrakesh Townhouse",
            "price": 159,
            "loc": {
                "country": "Morocco",
                "city": "Marrakesh",
                "lat": 31.6295,
                "lng": -7.9811
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/15/Marrakesh_Medina.jpg"
            ],
            "summary": "Bright space in Marrakesh, ideal for food and culture lovers.",
            "maxGuests": 6,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.6,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.6,
                    "checkIn": 4.6,
                    "communication": 4.7,
                    "location": 4.6,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 18",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Alina Johnson",
                "imgUrl": "/img/alina.jpg",
                "role": "Barista",
                "favoritesong": "Shape of You",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 6,
                "reviews": 97,
                "rating": 4.69,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s141",
            "title": "Vienna City Pad",
            "price": 231,
            "loc": {
                "country": "Austria",
                "city": "Vienna",
                "lat": 48.2082,
                "lng": 16.3738
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wien_-_Sch%C3%B6nbrunn_-_Gloriette_%282%29.JPG"
            ],
            "summary": "Stylish base in Vienna for exploring Austria.",
            "maxGuests": 2,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.68,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.7,
                    "checkIn": 4.6,
                    "communication": 4.6,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 6",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Jon Ivanov",
                "imgUrl": "/img/jon.jpg",
                "role": "Engineer",
                "favoritesong": "Plastic Love",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 28,
                "reviews": 144,
                "rating": 4.82,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s142",
            "title": "Istanbul Old Town Home",
            "price": 96,
            "loc": {
                "country": "Turkey",
                "city": "Istanbul",
                "lat": 41.0082,
                "lng": 28.9784
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/b/b8/Hagia_Sophia_Mars_2013.jpg"
            ],
            "summary": "Quiet spot in Istanbul close to transit and cafes.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.68,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.9,
                    "checkIn": 4.5,
                    "communication": 4.7,
                    "location": 4.7,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 17",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Omer Tanaka",
                "imgUrl": "/img/omer.jpg",
                "role": "Musician",
                "favoritesong": "Space Oddity",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 21,
                "reviews": 153,
                "rating": 4.89,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s143",
            "title": "Istanbul Coastal Nook",
            "price": 267,
            "loc": {
                "country": "Turkey",
                "city": "Istanbul",
                "lat": 41.0082,
                "lng": 28.9784
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/b/b8/Hagia_Sophia_Mars_2013.jpg"
            ],
            "summary": "Quiet spot in Istanbul close to transit and cafes.",
            "maxGuests": 4,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.68,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.5,
                    "checkIn": 4.7,
                    "communication": 4.9,
                    "location": 4.7,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 5",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Nora Singh",
                "imgUrl": "/img/nora.jpg",
                "role": "Guide",
                "favoritesong": "Imagine",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 22,
                "reviews": 104,
                "rating": 4.69,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s144",
            "title": "San Francisco Coastal Nook",
            "price": 210,
            "loc": {
                "country": "USA",
                "city": "San Francisco",
                "lat": 37.7749,
                "lng": -122.4194
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/af/Golden_Gate_Bridge_and_san_francisco_from_battery_spencer.jpg"
            ],
            "summary": "Comfortable stay in San Francisco with easy access to main sights.",
            "maxGuests": 6,
            "bedRooms": 3,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.7,
                    "checkIn": 4.6,
                    "communication": 4.7,
                    "location": 4.9,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 19",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yusuf Smith",
                "imgUrl": "/img/yusuf.jpg",
                "role": "Designer",
                "favoritesong": "River Flows in You",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 12,
                "reviews": 159,
                "rating": 4.89,
                "responseRate": 99,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s145",
            "title": "Reykjavik Loft",
            "price": 232,
            "loc": {
                "country": "Iceland",
                "city": "Reykjavik",
                "lat": 64.1466,
                "lng": -21.9426
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/8/84/Reykjavik_panorama.jpg"
            ],
            "summary": "Modern hideaway in Reykjavik with great walkability.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.8,
                    "checkIn": 5.0,
                    "communication": 4.9,
                    "location": 4.8,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 15",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Marco Ivanov",
                "imgUrl": "/img/marco.jpg",
                "role": "Barista",
                "favoritesong": "Space Oddity",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 20,
                "reviews": 31,
                "rating": 4.69,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s146",
            "title": "San Francisco Lake House",
            "price": 100,
            "loc": {
                "country": "USA",
                "city": "San Francisco",
                "lat": 37.7749,
                "lng": -122.4194
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/af/Golden_Gate_Bridge_and_san_francisco_from_battery_spencer.jpg"
            ],
            "summary": "Comfortable stay in San Francisco with easy access to main sights.",
            "maxGuests": 3,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.78,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 5.0,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 9",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Alina Garcia",
                "imgUrl": "/img/alina.jpg",
                "role": "Musician",
                "favoritesong": "Plastic Love",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 19,
                "reviews": 69,
                "rating": 4.7,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s147",
            "title": "Rio de Janeiro Harbor View",
            "price": 125,
            "loc": {
                "country": "Brazil",
                "city": "Rio de Janeiro",
                "lat": -22.9068,
                "lng": -43.1729
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/4/4f/Rio_de_Janeiro_Montage_2017.png"
            ],
            "summary": "Bright space in Rio de Janeiro, ideal for food and culture lovers.",
            "maxGuests": 2,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.9,
                    "checkIn": 4.8,
                    "communication": 4.6,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 21",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yonatan Smith",
                "imgUrl": "/img/yonatan.jpg",
                "role": "Guide",
                "favoritesong": "Yellow",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 17,
                "reviews": 68,
                "rating": 4.6,
                "responseRate": 98,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s148",
            "title": "Sapporo Coastal Nook",
            "price": 229,
            "loc": {
                "country": "Japan",
                "city": "Sapporo",
                "lat": 43.0618,
                "lng": 141.3545
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/7/77/Sapporo_TV_Tower_2018.jpg"
            ],
            "summary": "Bright space in Sapporo, ideal for food and culture lovers.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.78,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.7,
                    "checkIn": 4.9,
                    "communication": 4.6,
                    "location": 4.9,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 15",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Kenji Tanaka",
                "imgUrl": "/img/kenji.jpg",
                "role": "Engineer",
                "favoritesong": "Plastic Love",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 6,
                "reviews": 144,
                "rating": 4.73,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s149",
            "title": "Paris Coastal Nook",
            "price": 166,
            "loc": {
                "country": "France",
                "city": "Paris",
                "lat": 48.8566,
                "lng": 2.3522
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg"
            ],
            "summary": "Modern hideaway in Paris with great walkability.",
            "maxGuests": 2,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 5.0,
                    "accuracy": 4.7,
                    "checkIn": 4.9,
                    "communication": 4.6,
                    "location": 4.8,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 4",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Akira Suzuki",
                "imgUrl": "/img/akira.jpg",
                "role": "Teacher",
                "favoritesong": "Yellow",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 28,
                "reviews": 176,
                "rating": 4.89,
                "responseRate": 99,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s150",
            "title": "Rome Stone Cottage",
            "price": 258,
            "loc": {
                "country": "Italy",
                "city": "Rome",
                "lat": 41.9028,
                "lng": 12.4964
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/5c/Colosseo_2020.jpg"
            ],
            "summary": "Quiet spot in Rome close to transit and cafes.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.9,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.7,
                    "checkIn": 4.9,
                    "communication": 5.0,
                    "location": 5.0,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 14",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Akira Mizrahi",
                "imgUrl": "/img/akira.jpg",
                "role": "Chef",
                "favoritesong": "Clair de Lune",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 23,
                "reviews": 104,
                "rating": 4.69,
                "responseRate": 99,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s151",
            "title": "Zurich Skyline Suite",
            "price": 211,
            "loc": {
                "country": "Switzerland",
                "city": "Zurich",
                "lat": 47.3769,
                "lng": 8.5417
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/57/Z%C3%BCrich_-_Grossmuenster_und_Limmat.jpg"
            ],
            "summary": "Stylish base in Zurich for exploring Switzerland.",
            "maxGuests": 6,
            "bedRooms": 4,
            "baths": 2,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.85,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 5.0,
                    "checkIn": 4.8,
                    "communication": 4.7,
                    "location": 4.8,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 21",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Noa Cohen",
                "imgUrl": "/img/noa.jpg",
                "role": "Host",
                "favoritesong": "Clair de Lune",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 23,
                "reviews": 102,
                "rating": 4.96,
                "responseRate": 98,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s152",
            "title": "Barcelona Garden Flat",
            "price": 231,
            "loc": {
                "country": "Spain",
                "city": "Barcelona",
                "lat": 41.3851,
                "lng": 2.1734
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/56/1_barcelona_panorama_2014.jpg"
            ],
            "summary": "Comfortable stay in Barcelona with easy access to main sights.",
            "maxGuests": 2,
            "bedRooms": 3,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.6,
                    "checkIn": 4.6,
                    "communication": 4.6,
                    "location": 4.9,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 30",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Amir Suzuki",
                "imgUrl": "/img/amir.jpg",
                "role": "Artist",
                "favoritesong": "Space Oddity",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 16,
                "reviews": 179,
                "rating": 4.68,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s153",
            "title": "Miami Skyline Suite",
            "price": 121,
            "loc": {
                "country": "USA",
                "city": "Miami",
                "lat": 25.7617,
                "lng": -80.1918
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/e/eb/Miami_Skyline_2020.jpg"
            ],
            "summary": "Stylish base in Miami for exploring USA.",
            "maxGuests": 2,
            "bedRooms": 3,
            "baths": 1,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.82,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.9,
                    "checkIn": 4.9,
                    "communication": 4.8,
                    "location": 4.8,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 7",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yael Rossi",
                "imgUrl": "/img/yael.jpg",
                "role": "Guide",
                "favoritesong": "Clair de Lune",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 25,
                "reviews": 146,
                "rating": 4.79,
                "responseRate": 98,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s154",
            "title": "Marrakesh Skyline Suite",
            "price": 140,
            "loc": {
                "country": "Morocco",
                "city": "Marrakesh",
                "lat": 31.6295,
                "lng": -7.9811
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/15/Marrakesh_Medina.jpg"
            ],
            "summary": "Quiet spot in Marrakesh close to transit and cafes.",
            "maxGuests": 6,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.63,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.6,
                    "checkIn": 4.5,
                    "communication": 4.5,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 5",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Emma Rossi",
                "imgUrl": "/img/emma.jpg",
                "role": "Engineer",
                "favoritesong": "Clair de Lune",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 6,
                "reviews": 137,
                "rating": 4.78,
                "responseRate": 96,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s155",
            "title": "San Francisco Retreat",
            "price": 156,
            "loc": {
                "country": "USA",
                "city": "San Francisco",
                "lat": 37.7749,
                "lng": -122.4194
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/af/Golden_Gate_Bridge_and_san_francisco_from_battery_spencer.jpg"
            ],
            "summary": "Comfortable stay in San Francisco with easy access to main sights.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.8,
                    "checkIn": 5.0,
                    "communication": 4.8,
                    "location": 4.8,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 13",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Akira Levi",
                "imgUrl": "/img/akira.jpg",
                "role": "Engineer",
                "favoritesong": "Plastic Love",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 22,
                "reviews": 61,
                "rating": 4.81,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s156",
            "title": "Santorini Retreat",
            "price": 121,
            "loc": {
                "country": "Greece",
                "city": "Santorini",
                "lat": 36.3932,
                "lng": 25.4615
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/1a/Santorini_Thira.jpg"
            ],
            "summary": "Modern hideaway in Santorini with great walkability.",
            "maxGuests": 2,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 4.6,
                    "location": 4.9,
                    "value": 4.5
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 13",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Marco Romero",
                "imgUrl": "/img/marco.jpg",
                "role": "Musician",
                "favoritesong": "Shape of You",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 22,
                "reviews": 24,
                "rating": 4.87,
                "responseRate": 96,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s157",
            "title": "Berlin Coastal Nook",
            "price": 212,
            "loc": {
                "country": "Germany",
                "city": "Berlin",
                "lat": 52.52,
                "lng": 13.405
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/d/d9/Berlin_Skyline_Fernsehturm_2015.jpg"
            ],
            "summary": "Bright space in Berlin, ideal for food and culture lovers.",
            "maxGuests": 4,
            "bedRooms": 3,
            "baths": 1,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.9,
                    "checkIn": 4.9,
                    "communication": 4.5,
                    "location": 5.0,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 5",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Jon Brown",
                "imgUrl": "/img/jon.jpg",
                "role": "Designer",
                "favoritesong": "Yellow",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 20,
                "reviews": 33,
                "rating": 4.83,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s158",
            "title": "London Skyline Suite",
            "price": 226,
            "loc": {
                "country": "UK",
                "city": "London",
                "lat": 51.5072,
                "lng": -0.1276
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/c/cd/London_Montage_L.jpg"
            ],
            "summary": "Bright space in London, ideal for food and culture lovers.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 2,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.9,
                    "checkIn": 4.7,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 10",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Alina Tanaka",
                "imgUrl": "/img/alina.jpg",
                "role": "Host",
                "favoritesong": "Clair de Lune",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 10,
                "reviews": 47,
                "rating": 4.89,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s159",
            "title": "Sydney Rooftop Loft",
            "price": 284,
            "loc": {
                "country": "Australia",
                "city": "Sydney",
                "lat": -33.8688,
                "lng": 151.2093
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/b/b6/Sydney_skyline_from_the_north_aerial_2010.jpg"
            ],
            "summary": "Stylish base in Sydney for exploring Australia.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.5,
                    "checkIn": 4.7,
                    "communication": 4.7,
                    "location": 4.8,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 16",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Ethan Tanaka",
                "imgUrl": "/img/ethan.jpg",
                "role": "Artist",
                "favoritesong": "Hotel California",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 24,
                "reviews": 25,
                "rating": 4.75,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s160",
            "title": "Cape Town Townhouse",
            "price": 259,
            "loc": {
                "country": "South Africa",
                "city": "Cape Town",
                "lat": -33.9249,
                "lng": 18.4241
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Cape_Town_panorama_2015.jpg"
            ],
            "summary": "Bright space in Cape Town, ideal for food and culture lovers.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.77,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.7,
                    "checkIn": 4.8,
                    "communication": 4.6,
                    "location": 4.9,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 13",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yusuf Brown",
                "imgUrl": "/img/yusuf.jpg",
                "role": "Host",
                "favoritesong": "Imagine",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 13,
                "reviews": 39,
                "rating": 4.84,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s161",
            "title": "Amsterdam Harbor View",
            "price": 182,
            "loc": {
                "country": "Netherlands",
                "city": "Amsterdam",
                "lat": 52.3676,
                "lng": 4.9041
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/9/9e/Amsterdam_canal_palaces_2018.jpg"
            ],
            "summary": "Modern hideaway in Amsterdam with great walkability.",
            "maxGuests": 3,
            "bedRooms": 4,
            "baths": 3,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.78,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.5,
                    "checkIn": 5.0,
                    "communication": 4.7,
                    "location": 4.9,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 22",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Kenji Smith",
                "imgUrl": "/img/kenji.jpg",
                "role": "Guide",
                "favoritesong": "Hotel California",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 17,
                "reviews": 54,
                "rating": 4.8,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s162",
            "title": "Dubai Harbor View",
            "price": 135,
            "loc": {
                "country": "UAE",
                "city": "Dubai",
                "lat": 25.2048,
                "lng": 55.2708
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/7/7b/Dubai_Montage_2014.jpg"
            ],
            "summary": "Stylish base in Dubai for exploring UAE.",
            "maxGuests": 5,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.8,
                    "checkIn": 4.8,
                    "communication": 4.9,
                    "location": 4.6,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 21",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Chiara Garcia",
                "imgUrl": "/img/chiara.jpg",
                "role": "Engineer",
                "favoritesong": "River Flows in You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 24,
                "reviews": 103,
                "rating": 4.95,
                "responseRate": 95,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s163",
            "title": "Bergen Old Town Home",
            "price": 171,
            "loc": {
                "country": "Norway",
                "city": "Bergen",
                "lat": 60.3913,
                "lng": 5.3221
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/16/Bryggen_Bergen_panorama.jpg"
            ],
            "summary": "Stylish base in Bergen for exploring Norway.",
            "maxGuests": 5,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.72,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.8,
                    "checkIn": 4.8,
                    "communication": 4.5,
                    "location": 4.7,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 20",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Daniel Dubois",
                "imgUrl": "/img/daniel.jpg",
                "role": "Host",
                "favoritesong": "River Flows in You",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 15,
                "reviews": 159,
                "rating": 4.61,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s164",
            "title": "Rome Stone Cottage",
            "price": 163,
            "loc": {
                "country": "Italy",
                "city": "Rome",
                "lat": 41.9028,
                "lng": 12.4964
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/5c/Colosseo_2020.jpg"
            ],
            "summary": "Stylish base in Rome for exploring Italy.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 3,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.63,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.6,
                    "checkIn": 4.7,
                    "communication": 4.8,
                    "location": 4.6,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 12",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Ava Romero",
                "imgUrl": "/img/ava.jpg",
                "role": "Host",
                "favoritesong": "Hotel California",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 14,
                "reviews": 54,
                "rating": 4.73,
                "responseRate": 95,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s165",
            "title": "Cape Town Loft",
            "price": 267,
            "loc": {
                "country": "South Africa",
                "city": "Cape Town",
                "lat": -33.9249,
                "lng": 18.4241
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Cape_Town_panorama_2015.jpg"
            ],
            "summary": "Stylish base in Cape Town for exploring South Africa.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.6,
                    "checkIn": 4.9,
                    "communication": 4.9,
                    "location": 4.6,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 7",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Kenji Rossi",
                "imgUrl": "/img/kenji.jpg",
                "role": "Chef",
                "favoritesong": "Space Oddity",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 13,
                "reviews": 214,
                "rating": 4.93,
                "responseRate": 96,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s166",
            "title": "Cape Town Boutique Apartment",
            "price": 81,
            "loc": {
                "country": "South Africa",
                "city": "Cape Town",
                "lat": -33.9249,
                "lng": 18.4241
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Cape_Town_panorama_2015.jpg"
            ],
            "summary": "Stylish base in Cape Town for exploring South Africa.",
            "maxGuests": 6,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.9,
                    "checkIn": 4.7,
                    "communication": 4.7,
                    "location": 4.9,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 27",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Nora Chen",
                "imgUrl": "/img/nora.jpg",
                "role": "Designer",
                "favoritesong": "Hotel California",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 6,
                "reviews": 128,
                "rating": 4.95,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s167",
            "title": "Zikhron Ya’akov Rooftop Loft",
            "price": 170,
            "loc": {
                "country": "Israel",
                "city": "Zikhron Ya’akov",
                "lat": 32.5733,
                "lng": 34.9523
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/15/Zichron_Ya%27akov_main_street.jpg"
            ],
            "summary": "Stylish base in Zikhron Ya’akov for exploring Israel.",
            "maxGuests": 5,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.77,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 5.0,
                    "checkIn": 4.9,
                    "communication": 4.5,
                    "location": 4.8,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 7",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Jon Romero",
                "imgUrl": "/img/jon.jpg",
                "role": "Teacher",
                "favoritesong": "Space Oddity",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 20,
                "reviews": 194,
                "rating": 4.79,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s168",
            "title": "Queenstown Rooftop Loft",
            "price": 235,
            "loc": {
                "country": "New Zealand",
                "city": "Queenstown",
                "lat": -45.0312,
                "lng": 168.6626
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/e/ef/Queenstown%2C_New_Zealand.jpg"
            ],
            "summary": "Stylish base in Queenstown for exploring New Zealand.",
            "maxGuests": 6,
            "bedRooms": 1,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.7,
                    "checkIn": 4.7,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.5
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 20",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Lea Johnson",
                "imgUrl": "/img/lea.jpg",
                "role": "Guide",
                "favoritesong": "Imagine",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 15,
                "reviews": 171,
                "rating": 4.92,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s169",
            "title": "Marrakesh Retreat",
            "price": 171,
            "loc": {
                "country": "Morocco",
                "city": "Marrakesh",
                "lat": 31.6295,
                "lng": -7.9811
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/15/Marrakesh_Medina.jpg"
            ],
            "summary": "Quiet spot in Marrakesh close to transit and cafes.",
            "maxGuests": 4,
            "bedRooms": 1,
            "baths": 3,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.82,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 4.7,
                    "checkIn": 4.9,
                    "communication": 4.9,
                    "location": 4.8,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 4",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Rina Katz",
                "imgUrl": "/img/rina.jpg",
                "role": "Artist",
                "favoritesong": "Imagine",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 6,
                "reviews": 129,
                "rating": 4.81,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s170",
            "title": "London Stone Cottage",
            "price": 216,
            "loc": {
                "country": "UK",
                "city": "London",
                "lat": 51.5072,
                "lng": -0.1276
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/c/cd/London_Montage_L.jpg"
            ],
            "summary": "Quiet spot in London close to transit and cafes.",
            "maxGuests": 6,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.9,
                    "checkIn": 5.0,
                    "communication": 4.7,
                    "location": 5.0,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 21",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yael Romero",
                "imgUrl": "/img/yael.jpg",
                "role": "Teacher",
                "favoritesong": "Hotel California",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 26,
                "reviews": 125,
                "rating": 4.75,
                "responseRate": 95,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s171",
            "title": "Santorini Coastal Nook",
            "price": 210,
            "loc": {
                "country": "Greece",
                "city": "Santorini",
                "lat": 36.3932,
                "lng": 25.4615
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/1a/Santorini_Thira.jpg"
            ],
            "summary": "Bright space in Santorini, ideal for food and culture lovers.",
            "maxGuests": 2,
            "bedRooms": 3,
            "baths": 2,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.6,
                    "checkIn": 4.8,
                    "communication": 4.8,
                    "location": 4.5,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 30",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Liam Levi",
                "imgUrl": "/img/liam.jpg",
                "role": "Guide",
                "favoritesong": "Shape of You",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 23,
                "reviews": 95,
                "rating": 4.86,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s172",
            "title": "Lisbon Retreat",
            "price": 137,
            "loc": {
                "country": "Portugal",
                "city": "Lisbon",
                "lat": 38.7223,
                "lng": -9.1393
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/c/c1/Lisbon_Montage_2016.jpg"
            ],
            "summary": "Comfortable stay in Lisbon with easy access to main sights.",
            "maxGuests": 2,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 4.7,
                    "location": 4.9,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 8",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Ava Rossi",
                "imgUrl": "/img/ava.jpg",
                "role": "Designer",
                "favoritesong": "Shape of You",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 29,
                "reviews": 30,
                "rating": 4.89,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s173",
            "title": "Tokyo Harbor View",
            "price": 295,
            "loc": {
                "country": "Japan",
                "city": "Tokyo",
                "lat": 35.6762,
                "lng": 139.6503
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/52/Shinjuku_night_skyline.jpg"
            ],
            "summary": "Quiet spot in Tokyo close to transit and cafes.",
            "maxGuests": 4,
            "bedRooms": 3,
            "baths": 3,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.72,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.5,
                    "checkIn": 4.8,
                    "communication": 4.7,
                    "location": 4.5,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 4",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Ethan Garcia",
                "imgUrl": "/img/ethan.jpg",
                "role": "Host",
                "favoritesong": "Plastic Love",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 20,
                "reviews": 99,
                "rating": 4.63,
                "responseRate": 99,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s174",
            "title": "Zurich Retreat",
            "price": 203,
            "loc": {
                "country": "Switzerland",
                "city": "Zurich",
                "lat": 47.3769,
                "lng": 8.5417
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/57/Z%C3%BCrich_-_Grossmuenster_und_Limmat.jpg"
            ],
            "summary": "Stylish base in Zurich for exploring Switzerland.",
            "maxGuests": 4,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.83,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.8,
                    "checkIn": 5.0,
                    "communication": 5.0,
                    "location": 4.7,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 6",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Omer Katz",
                "imgUrl": "/img/omer.jpg",
                "role": "Photographer",
                "favoritesong": "River Flows in You",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 17,
                "reviews": 169,
                "rating": 4.68,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s175",
            "title": "Vienna City Pad",
            "price": 99,
            "loc": {
                "country": "Austria",
                "city": "Vienna",
                "lat": 48.2082,
                "lng": 16.3738
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wien_-_Sch%C3%B6nbrunn_-_Gloriette_%282%29.JPG"
            ],
            "summary": "Modern hideaway in Vienna with great walkability.",
            "maxGuests": 6,
            "bedRooms": 3,
            "baths": 3,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.67,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.8,
                    "checkIn": 4.5,
                    "communication": 4.7,
                    "location": 4.9,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 28",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Daniel Smith",
                "imgUrl": "/img/daniel.jpg",
                "role": "Barista",
                "favoritesong": "Space Oddity",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 28,
                "reviews": 120,
                "rating": 4.83,
                "responseRate": 96,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s176",
            "title": "Marrakesh Harbor View",
            "price": 138,
            "loc": {
                "country": "Morocco",
                "city": "Marrakesh",
                "lat": 31.6295,
                "lng": -7.9811
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/15/Marrakesh_Medina.jpg"
            ],
            "summary": "Quiet spot in Marrakesh close to transit and cafes.",
            "maxGuests": 2,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Bay view balcony",
                "Walkable area",
                "Underground parking"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.73,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.8,
                    "checkIn": 4.5,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 30",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Noa Chen",
                "imgUrl": "/img/noa.jpg",
                "role": "Teacher",
                "favoritesong": "Imagine",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 12,
                "reviews": 189,
                "rating": 4.87,
                "responseRate": 98,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s177",
            "title": "Bergen Retreat",
            "price": 162,
            "loc": {
                "country": "Norway",
                "city": "Bergen",
                "lat": 60.3913,
                "lng": 5.3221
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/16/Bryggen_Bergen_panorama.jpg"
            ],
            "summary": "Comfortable stay in Bergen with easy access to main sights.",
            "maxGuests": 6,
            "bedRooms": 3,
            "baths": 1,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.77,
                "categories": {
                    "cleanliness": 5.0,
                    "accuracy": 4.8,
                    "checkIn": 4.7,
                    "communication": 4.6,
                    "location": 4.5,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 25",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Chiara Garcia",
                "imgUrl": "/img/chiara.jpg",
                "role": "Artist",
                "favoritesong": "Clair de Lune",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 20,
                "reviews": 202,
                "rating": 4.73,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s178",
            "title": "Barcelona Retreat",
            "price": 274,
            "loc": {
                "country": "Spain",
                "city": "Barcelona",
                "lat": 41.3851,
                "lng": 2.1734
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/56/1_barcelona_panorama_2014.jpg"
            ],
            "summary": "Modern hideaway in Barcelona with great walkability.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 3,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 4.8,
                    "accuracy": 5.0,
                    "checkIn": 4.6,
                    "communication": 4.7,
                    "location": 4.8,
                    "value": 4.9
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 17",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yonatan Katz",
                "imgUrl": "/img/yonatan.jpg",
                "role": "Artist",
                "favoritesong": "Space Oddity",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 15,
                "reviews": 138,
                "rating": 4.95,
                "responseRate": 96,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s179",
            "title": "Istanbul Skyline Suite",
            "price": 264,
            "loc": {
                "country": "Turkey",
                "city": "Istanbul",
                "lat": 41.0082,
                "lng": 28.9784
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/b/b8/Hagia_Sophia_Mars_2013.jpg"
            ],
            "summary": "Stylish base in Istanbul for exploring Turkey.",
            "maxGuests": 2,
            "bedRooms": 3,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchenette",
                "Elevator"
            ],
            "ratings": {
                "overall": 4.68,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.6,
                    "checkIn": 4.7,
                    "communication": 4.6,
                    "location": 5.0,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 28",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Sara Levi",
                "imgUrl": "/img/sara.jpg",
                "role": "Designer",
                "favoritesong": "Imagine",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": true,
                "monthsHosting": 26,
                "reviews": 141,
                "rating": 4.81,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s180",
            "title": "Vienna Studio",
            "price": 250,
            "loc": {
                "country": "Austria",
                "city": "Vienna",
                "lat": 48.2082,
                "lng": 16.3738
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wien_-_Sch%C3%B6nbrunn_-_Gloriette_%282%29.JPG"
            ],
            "summary": "Stylish base in Vienna for exploring Austria.",
            "maxGuests": 6,
            "bedRooms": 4,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.65,
                "categories": {
                    "cleanliness": 5.0,
                    "accuracy": 4.5,
                    "checkIn": 4.6,
                    "communication": 4.5,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 14",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Jon Singh",
                "imgUrl": "/img/jon.jpg",
                "role": "Engineer",
                "favoritesong": "Space Oddity",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": true,
                "monthsHosting": 10,
                "reviews": 137,
                "rating": 4.65,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s181",
            "title": "Sydney Coastal Nook",
            "price": 266,
            "loc": {
                "country": "Australia",
                "city": "Sydney",
                "lat": -33.8688,
                "lng": 151.2093
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/b/b6/Sydney_skyline_from_the_north_aerial_2010.jpg"
            ],
            "summary": "Comfortable stay in Sydney with easy access to main sights.",
            "maxGuests": 6,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.68,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.7,
                    "checkIn": 4.6,
                    "communication": 4.8,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 18",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Jon Romero",
                "imgUrl": "/img/jon.jpg",
                "role": "Chef",
                "favoritesong": "Clair de Lune",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 28,
                "reviews": 209,
                "rating": 4.94,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s182",
            "title": "Reykjavik Stone Cottage",
            "price": 309,
            "loc": {
                "country": "Iceland",
                "city": "Reykjavik",
                "lat": 64.1466,
                "lng": -21.9426
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/8/84/Reykjavik_panorama.jpg"
            ],
            "summary": "Bright space in Reykjavik, ideal for food and culture lovers.",
            "maxGuests": 2,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 5.0,
                    "accuracy": 4.6,
                    "checkIn": 4.9,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.5
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 12",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Lucas Chen",
                "imgUrl": "/img/lucas.jpg",
                "role": "Host",
                "favoritesong": "Hotel California",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 25,
                "reviews": 34,
                "rating": 4.69,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s183",
            "title": "Lisbon City Pad",
            "price": 86,
            "loc": {
                "country": "Portugal",
                "city": "Lisbon",
                "lat": 38.7223,
                "lng": -9.1393
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/c/c1/Lisbon_Montage_2016.jpg"
            ],
            "summary": "Stylish base in Lisbon for exploring Portugal.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.5,
                    "checkIn": 4.7,
                    "communication": 4.9,
                    "location": 4.9,
                    "value": 4.5
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 29",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Alina Brown",
                "imgUrl": "/img/alina.jpg",
                "role": "Photographer",
                "favoritesong": "Imagine",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 28,
                "reviews": 215,
                "rating": 4.97,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s184",
            "title": "Nara Old Town Home",
            "price": 303,
            "loc": {
                "country": "Japan",
                "city": "Nara",
                "lat": 34.6851,
                "lng": 135.8048
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/1/1e/Nara_Park_deer.jpg"
            ],
            "summary": "Quiet spot in Nara close to transit and cafes.",
            "maxGuests": 3,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Washer",
                "Dryer"
            ],
            "ratings": {
                "overall": 4.8,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 4.9,
                    "location": 4.7,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 22",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Ava Smith",
                "imgUrl": "/img/ava.jpg",
                "role": "Artist",
                "favoritesong": "Plastic Love",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 27,
                "reviews": 215,
                "rating": 4.81,
                "responseRate": 100,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s185",
            "title": "Paris Harbor View",
            "price": 257,
            "loc": {
                "country": "France",
                "city": "Paris",
                "lat": 48.8566,
                "lng": 2.3522
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg"
            ],
            "summary": "Stylish base in Paris for exploring France.",
            "maxGuests": 4,
            "bedRooms": 4,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.7,
                "categories": {
                    "cleanliness": 4.5,
                    "accuracy": 4.7,
                    "checkIn": 4.8,
                    "communication": 4.9,
                    "location": 4.6,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 13",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Ava Williams",
                "imgUrl": "/img/ava.jpg",
                "role": "Teacher",
                "favoritesong": "Shape of You",
                "bio": "Hosting is my passion and I love meeting new people.",
                "isSuperhost": false,
                "monthsHosting": 15,
                "reviews": 180,
                "rating": 4.6,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s186",
            "title": "Lisbon City Pad",
            "price": 131,
            "loc": {
                "country": "Portugal",
                "city": "Lisbon",
                "lat": 38.7223,
                "lng": -9.1393
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/c/c1/Lisbon_Montage_2016.jpg"
            ],
            "summary": "Quiet spot in Lisbon close to transit and cafes.",
            "maxGuests": 2,
            "bedRooms": 4,
            "baths": 2,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.7,
                    "checkIn": 4.6,
                    "communication": 4.7,
                    "location": 4.8,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 3:00 PM",
                "Checkout before 11:00 AM",
                "No smoking"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Nov 14",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Hannah Smith",
                "imgUrl": "/img/hannah.jpg",
                "role": "Barista",
                "favoritesong": "Imagine",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": false,
                "monthsHosting": 7,
                "reviews": 137,
                "rating": 4.77,
                "responseRate": 97,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s187",
            "title": "Tel Aviv Townhouse",
            "price": 189,
            "loc": {
                "country": "Israel",
                "city": "Tel Aviv",
                "lat": 32.0853,
                "lng": 34.7818
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/f/f3/Tel_Aviv_-_Beach_001.jpg"
            ],
            "summary": "Bright space in Tel Aviv, ideal for food and culture lovers.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                "Historic neighborhood",
                "Quiet street",
                "Tea set included"
            ],
            "amenities": [
                "WiFi",
                "Air conditioning",
                "Pool"
            ],
            "ratings": {
                "overall": 4.67,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 4.7,
                    "checkIn": 4.6,
                    "communication": 4.6,
                    "location": 4.5,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 21",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Yael Johnson",
                "imgUrl": "/img/yael.jpg",
                "role": "Artist",
                "favoritesong": "Plastic Love",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 8,
                "reviews": 101,
                "rating": 4.91,
                "responseRate": 99,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s188",
            "title": "Paris Rooftop Loft",
            "price": 254,
            "loc": {
                "country": "France",
                "city": "Paris",
                "lat": 48.8566,
                "lng": 2.3522
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg"
            ],
            "summary": "Quiet spot in Paris close to transit and cafes.",
            "maxGuests": 3,
            "bedRooms": 2,
            "baths": 3,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.82,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.5,
                    "checkIn": 4.9,
                    "communication": 4.9,
                    "location": 5.0,
                    "value": 5.0
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Carbon monoxide alarm installed"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 1",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Sara Suzuki",
                "imgUrl": "/img/sara.jpg",
                "role": "Host",
                "favoritesong": "Plastic Love",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": true,
                "monthsHosting": 23,
                "reviews": 192,
                "rating": 4.86,
                "responseRate": 100,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s189",
            "title": "Sydney Harbor View",
            "price": 233,
            "loc": {
                "country": "Australia",
                "city": "Sydney",
                "lat": -33.8688,
                "lng": 151.2093
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/b/b6/Sydney_skyline_from_the_north_aerial_2010.jpg"
            ],
            "summary": "Bright space in Sydney, ideal for food and culture lovers.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                "Exceptional check-in experience",
                "Walkable area",
                "Free cancellation"
            ],
            "amenities": [
                "WiFi",
                "Heating",
                "Smart TV"
            ],
            "ratings": {
                "overall": 4.75,
                "categories": {
                    "cleanliness": 4.7,
                    "accuracy": 4.8,
                    "checkIn": 4.9,
                    "communication": 4.8,
                    "location": 4.6,
                    "value": 4.7
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 23",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Emma Katz",
                "imgUrl": "/img/emma.jpg",
                "role": "Designer",
                "favoritesong": "Space Oddity",
                "bio": "Here to make your stay smooth and memorable.",
                "isSuperhost": true,
                "monthsHosting": 26,
                "reviews": 48,
                "rating": 4.79,
                "responseRate": 95,
                "responseTime": "within an hour"
            }
        },
        {
            "_id": "s190",
            "title": "Tiberias Boutique Apartment",
            "price": 88,
            "loc": {
                "country": "Israel",
                "city": "Tiberias",
                "lat": 32.7922,
                "lng": 35.5312
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/4/45/Tiberias_panorama.jpg"
            ],
            "summary": "Quiet spot in Tiberias close to transit and cafes.",
            "maxGuests": 6,
            "bedRooms": 4,
            "baths": 1,
            "highlights": [
                "Self check-in",
                "Near subway",
                "Great city views"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Washer",
                "Air conditioning"
            ],
            "ratings": {
                "overall": 4.72,
                "categories": {
                    "cleanliness": 4.6,
                    "accuracy": 4.7,
                    "checkIn": 4.8,
                    "communication": 4.8,
                    "location": 4.6,
                    "value": 4.8
                }
            },
            "houseRules": [
                "Check-in after 4:00 PM",
                "Checkout before 11:00 AM",
                "Quiet hours after 10 PM"
            ],
            "safety": [
                "First aid kit available",
                "Emergency contact card provided"
            ],
            "cancellationPolicy": [
                "Free cancellation before Jan 15",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Jon Singh",
                "imgUrl": "/img/jon.jpg",
                "role": "Host",
                "favoritesong": "Imagine",
                "bio": "I enjoy sharing local tips and hidden gems.",
                "isSuperhost": false,
                "monthsHosting": 13,
                "reviews": 121,
                "rating": 4.95,
                "responseRate": 95,
                "responseTime": "within a few hours"
            }
        },
        {
            "_id": "s191",
            "title": "Barcelona Skyline Suite",
            "price": 235,
            "loc": {
                "country": "Spain",
                "city": "Barcelona",
                "lat": 41.3851,
                "lng": 2.1734
            },
            "imgs": [
                "https://upload.wikimedia.org/wikipedia/commons/5/56/1_barcelona_panorama_2014.jpg"
            ],
            "summary": "Bright space in Barcelona, ideal for food and culture lovers.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 3,
            "highlights": [
                "Great location",
                "Work-friendly space",
                "Lively area"
            ],
            "amenities": [
                "WiFi",
                "Kitchen",
                "Free parking"
            ],
            "ratings": {
                "overall": 4.78,
                "categories": {
                    "cleanliness": 4.9,
                    "accuracy": 5.0,
                    "checkIn": 4.8,
                    "communication": 4.9,
                    "location": 4.5,
                    "value": 4.6
                }
            },
            "houseRules": [
                "Check-in after 2:00 PM",
                "Checkout before 10:00 AM",
                "No parties or events"
            ],
            "safety": [
                "Smoke alarm installed",
                "Fire extinguisher available"
            ],
            "cancellationPolicy": [
                "Free cancellation before Dec 16",
                "Non-refundable after that"
            ],
            "host": {
                "fullname": "Lea Ivanov",
                "imgUrl": "/img/lea.jpg",
                "role": "Teacher",
                "favoritesong": "Yellow",
                "bio": "Ask me about food spots and scenic walks.",
                "isSuperhost": false,
                "monthsHosting": 22,
                "reviews": 76,
                "rating": 4.62,
                "responseRate": 97,
                "responseTime": "within an hour"
            }
        }
    ]
    saveToStorage(STORAGE_KEY, stays)
}

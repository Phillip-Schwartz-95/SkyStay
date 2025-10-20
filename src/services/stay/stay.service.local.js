import staysJson from '../../data/stays.json'
import { storageService } from '../async-storage.service'
import { loadFromStorage, makeId, saveToStorage, getDistance } from '../util.service'
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

    if (f.coords && f.coords.lat && f.coords.lng) {
        const MAX_DISTANCE_KM = 50
        const userLat = f.coords.lat
        const userLng = f.coords.lng

        res = res.filter(s => {
            const stayLat = s?.loc?.lat
            const stayLng = s?.loc?.lng

            if (typeof stayLat !== 'number' || typeof stayLng !== 'number') return false

            const distance = getDistance(userLat, userLng, stayLat, stayLng)
           
            return distance <= MAX_DISTANCE_KM
        })
    }
    
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

    const requiredCapacity = parseInt(f.capacity)
    if (!isNaN(requiredCapacity) && requiredCapacity > 0) {
        res = res.filter(s => typeof s.maxGuests === 'number' && s.maxGuests >= requiredCapacity)
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

async function query(filterBy = { txt: '', sortField: '', sortDir: '', startDate: null, endDate: null, capacity: 0 }) {
    const all = await ensureSeeded()
    const filtered = await applyFilter(all, filterBy)
    return applySort(filtered, filterBy.sortField, filterBy.sortDir)
    // return await storageService.query(STORAGE_KEY)
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Recent guests gave the check-in process a 5-star rating."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Guests say this area is easy to get around."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation before Dec 4",
                    "desc": "Get a full refund if you change your mind."
                }
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
                "https://upload.wikimedia.org/wikipedia/commons/f/f3/Tel_Aviv_-_Beach_001.jpg",
                "https://upload.wikimedia.org/wikipedia/commons/d/d0/Beaches_of_Tel_Aviv_20180708.jpg",
                "https://upload.wikimedia.org/wikipedia/commons/b/b6/Tel_Aviv_Beach_2021.jpg",
                "https://upload.wikimedia.org/wikipedia/commons/5/52/Night_Tel_Aviv_beach_%2814858107049%29.jpg",
                "https://upload.wikimedia.org/wikipedia/commons/6/6f/PikiWiki_Israel_84421_tel_aviv_beach_promenade.jpg",
                "https://upload.wikimedia.org/wikipedia/commons/9/9c/Beach_Tel-Aviv_-_panoramio.jpg"

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
                    "icon": "mapMarker",
                    "title": "Walkable area",
                    "desc": "Guests say this area is easy to get around."
                },
                {
                    "icon": "schedule",
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
                "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
                "role": "Photographer and travel enthusiast",
                "favoritesong": "Clair de Lune",
                "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
                "isSuperhost": true,
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Check yourself in with the smart lock."
                },
                {
                    "icon": "location",
                    "title": "Near subway",
                    "desc": "Steps away from Shinjuku Station and metro lines."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy panoramic Tokyo skyline views."
                }
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
                {
                    "icon": "location",
                    "title": "Historic neighborhood",
                    "desc": "Stay in Kyoto’s traditional Gion district."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful area with a private courtyard."
                },
                {
                    "icon": "kitchen",
                    "title": "Tea set included",
                    "desc": "Enjoy your own tea ceremony setup."
                }
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
                {
                    "icon": "balcony",
                    "title": "Panoramic terrace",
                    "desc": "Enjoy stunning views of Tuscan hills and olive groves."
                },
                {
                    "icon": "parking",
                    "title": "Free parking",
                    "desc": "Private parking spot available on site for convenience."
                },
                {
                    "icon": "family",
                    "title": "Great for families",
                    "desc": "Spacious villa perfect for group stays and family dinners."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Enjoy sunsets and sea breezes from your private balcony."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Guests say this location is perfect for exploring on foot."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Secure on-site parking spot available below the building."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Guests rate this neighborhood highly for easy subway access and cafes."
                },
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in",
                    "desc": "Smooth and flexible self check-in for a hassle-free arrival."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "A quiet area with a dedicated workspace, perfect for remote work."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Guests rated the check-in process 5 stars for convenience."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Located near Eilat’s beaches, cafes, and shops — easy to explore on foot."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Enjoy flexibility with full refunds before Jan 30."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Guests praised the quick and easy check-in process."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Located near restaurants, the promenade, and cultural landmarks."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Get a full refund if you cancel before Nov 19."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Guests love the central Eilat area close to beaches and nightlife."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Cozy desk setup ideal for remote work or studying."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Close to vibrant bars, restaurants, and local entertainment."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Enjoy panoramic views of the Sea of Galilee right from your balcony."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Steps from cafes, restaurants, and the lakeside promenade."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Private and secure parking available for all guests."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Stay in the heart of Zikhron Ya’akov’s charming old town streets."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful surroundings near wineries and Mediterranean views."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Enjoy complimentary local tea during your stay."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Seamless entry with a smart lock for flexible arrivals."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Conveniently located close to public transport and harbor paths."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Capture unforgettable sunsets over Santorini’s iconic rooftops."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Guests appreciate the smooth and flexible check-in process."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Steps from Chicago’s main attractions, shopping, and dining."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Full refund available for cancellations before Jan 19."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Located in a charming part of Barcelona with cultural landmarks nearby."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Enjoy a peaceful setting just minutes from the Gothic Quarter."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Relax with complimentary local tea during your stay."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Convenient base near cafés, beaches, and Table Mountain views."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Includes a cozy desk setup for remote work or study."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Located near Cape Town’s buzzing food and nightlife scene."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Take in panoramic city and lake views from your private balcony."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to Zurich’s cafés, boutiques, and public transport."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Safe, convenient parking directly below the building."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Stay among Rome’s ancient streets and historic landmarks."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Enjoy calm surroundings near the vibrant heart of Rome."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Complimentary Italian tea selection provided for guests."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Arrive anytime with easy smart lock access."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Just a short walk from Sapporo Station and key attractions."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Panoramic skyline views from your private suite."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Guests love the easy and smooth arrival process."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Right by Vienna’s famous cafés, palaces, and shopping streets."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Full refund available for cancellations before Nov 5."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Check yourself in easily with smart lock access."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Close to public transport, shops, and cafés."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Wake up to mountain and skyline views from your window."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Enjoy breathtaking lake and mountain views from the balcony."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Steps from Queenstown’s best cafés, shops, and scenic trails."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Convenient secure parking available for guests."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Enjoy flexible arrivals with keyless smart lock entry."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Centrally located with easy metro and bus access."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Catch beautiful sunsets over the Los Angeles skyline."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Stay steps from Paris’s most iconic landmarks and cafés."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful retreat in a calm residential area of Paris."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Relax with complimentary tea while enjoying the view."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Central Vienna location with easy access to attractions and cafés."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Equipped with a desk and fast Wi-Fi for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by music halls, restaurants, and night spots."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "In the heart of Buenos Aires, close to shopping and dining."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Comfortable setup for working or studying during your stay."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Experience the city’s energy, with bars and cafés nearby."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Stay among Rome’s ancient streets and iconic landmarks."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful retreat tucked away from the city bustle."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Enjoy complimentary Italian teas during your stay."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Arrive anytime with easy smart lock access."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Just minutes from the metro and popular Vienna spots."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy skyline views over Vienna from your window."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Take in panoramic views of Table Mountain and the bay."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to cafés, beaches, and vibrant nightlife."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Secure parking available on-site for guests."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Located near downtown Chicago and major attractions."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Dedicated workspace and strong Wi-Fi for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by Chicago’s best restaurants and music venues."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Relax on a private terrace overlooking the medina skyline."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Steps away from souks, cafés, and historic landmarks."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Safe, convenient parking available for guests."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Charming area near the lake, rich with Viennese history."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful surroundings perfect for a relaxing getaway."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Unwind with complimentary tea on the terrace."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Arrive anytime with easy, keyless entry."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Central location close to Reykjavik harbor and shops."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy sweeping views of the harbor and city lights."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Watch the sunset over the Tagus River from your balcony."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Centrally located near Lisbon’s scenic streets and cafés."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Secure, on-site parking available for guests."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Highly rated by guests for smooth, hassle-free arrivals."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to local markets, cafés, and historic temples."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Full refund available for cancellations before Jan 30."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Enjoy a smooth arrival with convenient smart lock access."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Just a short stroll from Nara’s main station and deer park."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Panoramic views of the old town and surrounding hills."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Nestled along the canals near famous Venetian landmarks."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Cozy desk area and strong Wi-Fi for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by Venice’s cafés, art galleries, and shops."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Easy keyless entry for a flexible arrival."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Steps from Paris Metro lines and local bakeries."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy skyline views featuring the Eiffel Tower."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Unwind with views of the Tagus River from your terrace."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to the city center, cafés, and tram lines."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Private and secure on-site parking available."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Stay in the heart of Marrakesh’s old medina."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful oasis just steps from vibrant markets."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Traditional Moroccan tea set provided for guests."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Central Vienna apartment close to museums and transport."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Ideal setup for remote work or study with fast Wi-Fi."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by Viennese cafés, music halls, and nightlife."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Unwind with views of the Bosphorus from your private terrace."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Steps away from historic sites like Hagia Sophia and local cafés."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Secure garage parking available for guests."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Relax with sweeping sea views from your balcony."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Centrally located near ferries, markets, and transit."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Private on-site parking for added convenience."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Close to the Golden Gate Bridge and Fisherman’s Wharf."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Dedicated workspace and fast Wi-Fi for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Enjoy nearby coffee shops, galleries, and nightlife."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Smooth, flexible self check-in with smart lock."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Short walk to the harbor, museums, and restaurants."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Cancel anytime before your trip with no fees."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Take in city and water views from your terrace."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Easy access to cafés, trams, and parks."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Private parking garage for guests’ use."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Located near Copacabana Beach and Sugarloaf Mountain."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Peaceful area to stay productive while traveling."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by Rio’s iconic nightlife and music."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Enjoy a flexible arrival with keypad access."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Close to Odori Park and local transit lines."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy views of Sapporo’s skyline and snow peaks."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Seamless arrival with smart lock access."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Minutes from the Metro and city’s top sights."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy Eiffel Tower views from the window."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Walk to the Colosseum and nearby restaurants."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Ideal home base for business or leisure."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Located in the heart of Rome’s Trastevere district."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Private balcony overlooking Lake Zurich."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to Old Town and Bahnhofstrasse shopping."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Secure garage parking available."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Quick and easy arrival with smart lock."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Located near Plaça Catalunya and metro stations."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Balcony views of the Sagrada Família skyline."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Watch the sunset over Biscayne Bay."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to beaches, cafés, and nightlife."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Private garage with guest access."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Located in the heart of the old medina."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful corner near bustling souks."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Traditional Moroccan tea service available."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Easy check-in process with keypad entry."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Convenient access to BART and MUNI lines."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Panoramic views of downtown San Francisco."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Flexible arrival with keyless entry."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Steps from Fira town center and bus station."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Iconic views of whitewashed cliffs and the sea."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Central Berlin flat near Alexanderplatz and cafés."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Comfortable desk setup for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Buzzing neighborhood full of art, culture, and dining."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Smooth arrival with secure keyless entry."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Steps from London Underground and top attractions."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Panoramic views of London’s skyline and landmarks."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Close to Sydney Harbour and the Opera House."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Dedicated workspace and fast Wi-Fi for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by Sydney’s restaurants, bars, and nightlife."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Located near Table Mountain and the V&A Waterfront."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Comfortable setup for work or study with scenic views."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Enjoy the buzz of Cape Town’s cafés and cultural scene."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Stay in Amsterdam’s charming canal district."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful area despite being near the city center."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Complimentary tea service for your comfort."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Prime spot near Dubai Marina and iconic attractions."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Ideal for business travelers with a quiet desk area."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Enjoy the vibrant energy of Dubai’s nightlife and malls."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Overlooks the historic Bryggen waterfront and harbor."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Steps from shops, restaurants, and mountain trails."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Private parking available for your convenience."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Relax with rooftop views of the Eternal City."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to the Colosseum and charming Roman cafés."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Secure parking located directly below the apartment."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Near beaches, art galleries, and the city center."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Quiet nook with reliable Wi-Fi for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Located in Cape Town’s creative and cultural hub."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Enjoy easy and flexible access with smart lock entry."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Close to transit, cafés, and boutique shops."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Admire panoramic Cape Town views from the window."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Effortless entry for a relaxed arrival."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Convenient access to central Israel’s main routes."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy scenic hilltop views over vineyards and sea."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Located near Lake Wakatipu and adventure hubs."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Modern desk setup with high-speed internet."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Enjoy Queenstown’s restaurants, bars, and lakefront energy."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Warm Moroccan welcome with flexible arrival options."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Easily explore the Medina’s vibrant souks and cafés."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Cancel free of charge before your stay begins."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Nestled in one of London’s oldest districts."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Peaceful surroundings in a central location."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Enjoy a relaxing cup of tea, British-style."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Easy self check-in to start your island getaway."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to Fira’s scenic alleys and cliffside cafés."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Flexible cancellation for peace of mind."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Enjoy Tagus River views from your private terrace."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Explore Alfama’s narrow streets and viewpoints nearby."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Convenient parking beneath the building."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Smooth digital check-in for convenience and privacy."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Minutes from Shinjuku Station and local eateries."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Book confidently with flexible cancellation."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Centrally located near the Old Town and Lake Zurich."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Bright workspace with reliable Wi-Fi for remote work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by cafés, boutiques, and art galleries."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Enjoy panoramic views over Vienna’s rooftops."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Just minutes from Schönbrunn Palace and cafés."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Convenient secure parking for your vehicle."
                }
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
                {
                    "icon": "balcony",
                    "title": "Bay view balcony",
                    "desc": "Overlooks Marrakesh rooftops and the Medina skyline."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Steps from souks, cafés, and Jemaa el-Fnaa."
                },
                {
                    "icon": "parking",
                    "title": "Underground parking",
                    "desc": "Private on-site parking for guests."
                }
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
                {
                    "icon": "checkin",
                    "title": "Exceptional check-in experience",
                    "desc": "Fast, smooth self check-in on arrival."
                },
                {
                    "icon": "mapmarker",
                    "title": "Walkable area",
                    "desc": "Close to shops, restaurants, and waterfront views."
                },
                {
                    "icon": "schedule",
                    "title": "Free cancellation",
                    "desc": "Cancel free of charge before your stay begins."
                }
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
                {
                    "icon": "heritage",
                    "title": "Historic neighborhood",
                    "desc": "Set in the heart of Barcelona’s Gothic Quarter."
                },
                {
                    "icon": "nature",
                    "title": "Quiet street",
                    "desc": "Tranquil area tucked away from the main bustle."
                },
                {
                    "icon": "teacup",
                    "title": "Tea set included",
                    "desc": "Enjoy an evening tea on your private terrace."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Smart lock entry for easy, flexible arrival."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Quick access to public transit and major sites."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Views of Hagia Sophia and the Bosphorus skyline."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Near the MuseumsQuartier and Schönbrunn Palace."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Spacious desk area with strong Wi-Fi connection."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Surrounded by restaurants, bars, and historic streets."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Close to beaches, parks, and central Sydney."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Comfortable desk and fast internet for work."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Experience Sydney’s waterfront dining and nightlife."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Contactless check-in for a stress-free arrival."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Close to Reykjavik’s main bus routes and landmarks."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Admire colorful rooftops and mountain backdrops."
                }
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
                {
                    "icon": "checkin",
                    "title": "Self check-in",
                    "desc": "Effortless arrival with smart keypad entry."
                },
                {
                    "icon": "mapmarker",
                    "title": "Near subway",
                    "desc": "Steps from Baixa-Chiado metro station and cafés."
                },
                {
                    "icon": "cityview",
                    "title": "Great city views",
                    "desc": "Enjoy Lisbon’s red rooftops and river vistas."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "In the heart of Nara, near temples and deer park."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Peaceful desk setup surrounded by traditional charm."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Enjoy local markets and cozy eateries nearby."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Minutes from the Seine and the Eiffel Tower."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Charming setup for work or study with natural light."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Bustling Parisian neighborhood with cafés and galleries."
                }
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
                {
                    "icon": "mapmarker",
                    "title": "Great location",
                    "desc": "Central Lisbon flat near Rossio Square and trams."
                },
                {
                    "icon": "workspace",
                    "title": "Work-friendly space",
                    "desc": "Comfortable desk area with fast internet."
                },
                {
                    "icon": "lively",
                    "title": "Lively area",
                    "desc": "Vibrant neighborhood full of music and culture."
                }
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
                { "icon": "heritage", "title": "Historic neighborhood", "desc": "Located in the heart of Tel Aviv’s White City district." },
                { "icon": "nature", "title": "Quiet street", "desc": "Peaceful area near Rothschild Boulevard." },
                { "icon": "teacup", "title": "Tea set included", "desc": "Enjoy complimentary teas from local blends." }
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
                { "icon": "checkin", "title": "Exceptional check-in experience", "desc": "Smooth arrival with flexible check-in." },
                { "icon": "mapmarker", "title": "Walkable area", "desc": "Close to Montmartre cafés and metro stops." },
                { "icon": "schedule", "title": "Free cancellation", "desc": "Cancel for free before your stay begins." }
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
                { "icon": "checkin", "title": "Exceptional check-in experience", "desc": "Seamless self check-in process." },
                { "icon": "mapmarker", "title": "Walkable area", "desc": "Steps from Circular Quay and restaurants." },
                { "icon": "schedule", "title": "Free cancellation", "desc": "Flexible booking with free cancellation." }
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
                { "icon": "checkin", "title": "Self check-in", "desc": "Enter easily using keyless smart lock." },
                { "icon": "mapmarker", "title": "Near subway", "desc": "Quick access to city transit and lake views." },
                { "icon": "cityview", "title": "Great city views", "desc": "Enjoy vistas over Tiberias and the Sea of Galilee." }
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
                { "icon": "mapmarker", "title": "Great location", "desc": "Centrally located near La Rambla and the beach." },
                { "icon": "workspace", "title": "Work-friendly space", "desc": "Bright desk area and strong Wi-Fi." },
                { "icon": "lively", "title": "Lively area", "desc": "Surrounded by shops and nightlife spots." }
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
        },
        {
            "_id": "s192",
            "title": "Tel Aviv Rothschild Studio",
            "price": 198,
            "loc": { "country": "Israel", "city": "Tel Aviv", "lat": 32.065, "lng": 34.777 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/4/4f/Tel_Aviv_Bauhaus_building.jpg"],
            "summary": "Minimal studio off Rothschild Boulevard with balcony.",
            "maxGuests": 2,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "mapmarker", "title": "Central", "desc": "Right off iconic Rothschild Boulevard." },
                { "icon": "checkin", "title": "Self check-in", "desc": "Smart lock access anytime." },
                { "icon": "workspace", "title": "Workspace", "desc": "Desk and natural light for remote work." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Washer"],
            "ratings": { "overall": 4.83, "categories": { "cleanliness": 4.8, "accuracy": 4.8, "checkIn": 4.9, "communication": 4.9, "location": 5.0, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM", "No parties"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 20", "Non-refundable after that"],
            "host": { "fullname": "Maya Levi", "imgUrl": "/img/maya.jpg", "role": "Photographer", "favoritesong": "Clair de Lune", "bio": "Hidden beaches and cafés included.", "isSuperhost": true, "monthsHosting": 26, "reviews": 149, "rating": 4.92, "responseRate": 99, "responseTime": "within an hour" }
        },
        {
            "_id": "s193",
            "title": "Jerusalem German Colony Garden Apt",
            "price": 179,
            "loc": { "country": "Israel", "city": "Jerusalem", "lat": 31.761, "lng": 35.219 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/1/1d/Emek_Refaim_Street.jpg"],
            "summary": "Ground-floor apartment with quiet garden patio.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "garden", "title": "Garden", "desc": "Private patio with local greenery and shade." },
                { "icon": "nature", "title": "Quiet street", "desc": "Tucked away in a peaceful neighborhood." },
                { "icon": "mapmarker", "title": "Walkable", "desc": "Steps from cafés, shops, and parks." }
            ],
            "amenities": ["WiFi", "Heating", "Kitchenette"],
            "ratings": { "overall": 4.78, "categories": { "cleanliness": 4.8, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.9, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 2:00 PM", "Checkout before 10:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 18", "Non-refundable after that"],
            "host": { "fullname": "Shira Cohen", "imgUrl": "/img/shira.jpg", "role": "Guide", "favoritesong": "Hallelujah", "bio": "Local markets and bakeries map provided.", "isSuperhost": true, "monthsHosting": 19, "reviews": 141, "rating": 4.9, "responseRate": 99, "responseTime": "within an hour" }
        },
        {
            "_id": "s194",
            "title": "Haifa Carmel View Flat",
            "price": 165,
            "loc": { "country": "Israel", "city": "Haifa", "lat": 32.794, "lng": 34.989 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/7/77/Bah%C3%A1%27%C3%AD_Gardens%2C_Haifa.jpg"],
            "summary": "Carmel neighborhood apartment with bay views.",
            "maxGuests": 4,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                { "icon": "cityview", "title": "Bay view", "desc": "Overlooks Haifa Bay and Baháʼí Gardens." },
                { "icon": "parking", "title": "Free parking", "desc": "Private parking space for guests." },
                { "icon": "nature", "title": "Near gardens", "desc": "Close to Baháʼí terraces and Carmel trails." }
            ],
            "amenities": ["WiFi", "Kitchen", "Washer"],
            "ratings": { "overall": 4.72, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 27", "Non-refundable after that"],
            "host": { "fullname": "Noa Peretz", "imgUrl": "/img/noa.jpg", "role": "Marine biologist", "favoritesong": "Space Oddity", "bio": "Coastline hikes and coffee tips.", "isSuperhost": false, "monthsHosting": 8, "reviews": 44, "rating": 4.69, "responseRate": 96, "responseTime": "within a few hours" }
        },
        {
            "_id": "s195",
            "title": "Eilat Red Sea Suite",
            "price": 172,
            "loc": { "country": "Israel", "city": "Eilat", "lat": 29.557, "lng": 34.95 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/6/6a/Eilat_Beach.jpg"],
            "summary": "Sunny suite near the promenade and coral beach.",
            "maxGuests": 4,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "beach", "title": "Near beach", "desc": "Just steps from Eilat’s Coral Beach." },
                { "icon": "pool", "title": "Pool access", "desc": "Cool off in the shared outdoor pool." },
                { "icon": "parking", "title": "Parking", "desc": "Free guest parking near the suite." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Smart TV"],
            "ratings": { "overall": 4.68, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.7, "location": 4.8, "value": 4.6 } },
            "houseRules": ["Check-in after 2:00 PM", "Checkout before 10:00 AM"],
            "safety": ["First aid kit available"],
            "cancellationPolicy": ["Free cancellation before Dec 22", "Non-refundable after that"],
            "host": { "fullname": "Nadav Halevi", "imgUrl": "/img/nadav.jpg", "role": "Chef", "favoritesong": "Imagine", "bio": "Best shawarma and diving spots listed.", "isSuperhost": false, "monthsHosting": 7, "reviews": 37, "rating": 4.66, "responseRate": 96, "responseTime": "within a few hours" }
        },
        {
            "_id": "s196",
            "title": "Safed Old City Stone House",
            "price": 139,
            "loc": { "country": "Israel", "city": "Safed", "lat": 32.966, "lng": 35.496 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/3/34/Tzfat_old_city.jpg"],
            "summary": "Romantic stone house in the artists’ quarter.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "heritage", "title": "Historic lane", "desc": "Set in the artists’ quarter’s cobblestone alleys." },
                { "icon": "cityview", "title": "Views", "desc": "Beautiful panoramas of the Galilee hills." },
                { "icon": "nature", "title": "Quiet", "desc": "Serene retreat ideal for couples." }
            ],
            "amenities": ["WiFi", "Heating", "Kitchenette"],
            "ratings": { "overall": 4.74, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.9, "location": 4.8, "value": 4.7 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 14", "Non-refundable after that"],
            "host": { "fullname": "Adi Bar", "imgUrl": "/img/adi.jpg", "role": "Artist", "favoritesong": "River Flows in You", "bio": "Gallery and wine bar suggestions.", "isSuperhost": true, "monthsHosting": 21, "reviews": 66, "rating": 4.86, "responseRate": 99, "responseTime": "within an hour" }
        },
        {
            "_id": "s197",
            "title": "Herzliya Marina Penthouse",
            "price": 249,
            "loc": { "country": "Israel", "city": "Herzliya", "lat": 32.166, "lng": 34.844 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/8/8b/Herzliya_marina.jpg"],
            "summary": "Penthouse with large terrace over the marina.",
            "maxGuests": 4,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                { "icon": "balcony", "title": "Terrace", "desc": "Spacious terrace overlooking the marina." },
                { "icon": "elevator", "title": "Elevator", "desc": "Easy access to top-floor penthouse." },
                { "icon": "parking", "title": "Parking", "desc": "Private garage space for one vehicle." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Washer"],
            "ratings": { "overall": 4.81, "categories": { "cleanliness": 4.8, "accuracy": 4.8, "checkIn": 4.9, "communication": 4.9, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed", "CO alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 28", "Non-refundable after that"],
            "host": { "fullname": "Yarden Azulay", "imgUrl": "/img/yarden.jpg", "role": "Photographer", "favoritesong": "Ocean Eyes", "bio": "Sailing and café tips provided.", "isSuperhost": false, "monthsHosting": 10, "reviews": 63, "rating": 4.76, "responseRate": 97, "responseTime": "within a few hours" }
        },
        {
            "_id": "s198",
            "title": "Netanya Promenade Family Apt",
            "price": 168,
            "loc": { "country": "Israel", "city": "Netanya", "lat": 32.321, "lng": 34.853 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/4/4d/Netanya_cliffs_and_beach.jpg"],
            "summary": "Family apartment near the clifftop promenade.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 1,
            "highlights": [
                { "icon": "beach", "title": "Sea breeze", "desc": "Overlooks the Mediterranean cliffs and sea." },
                { "icon": "playground", "title": "Playground nearby", "desc": "Perfect for families with kids." },
                { "icon": "parking", "title": "Parking", "desc": "Free parking right next to the building." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Kitchenette"],
            "ratings": { "overall": 4.7, "categories": { "cleanliness": 4.6, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 2:00 PM", "Checkout before 10:00 AM"],
            "safety": ["First aid kit available"],
            "cancellationPolicy": ["Free cancellation before Dec 12", "Non-refundable after that"],
            "host": { "fullname": "Lior Ben-David", "imgUrl": "/img/lior.jpg", "role": "Designer", "favoritesong": "Rolling in the Deep", "bio": "Beach and food recs included.", "isSuperhost": true, "monthsHosting": 15, "reviews": 91, "rating": 4.81, "responseRate": 98, "responseTime": "within an hour" }
        },
        {
            "_id": "s199",
            "title": "Zichron Ya’akov Wine Cottage",
            "price": 158,
            "loc": { "country": "Israel", "city": "Zichron Ya’akov", "lat": 32.572, "lng": 34.953 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/c/cf/Zichron_Ya%27akov_Panorama.jpg"],
            "summary": "Cozy cottage near wineries and mountain views.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "patio", "title": "Patio", "desc": "Outdoor seating with mountain views." },
                { "icon": "cityview", "title": "Great views", "desc": "Panoramic view of vineyards and hills." },
                { "icon": "parking", "title": "Parking", "desc": "Private space next to the cottage." }
            ],
            "amenities": ["WiFi", "Heating", "Kitchenette"],
            "ratings": { "overall": 4.73, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.9, "location": 4.8, "value": 4.7 } },
            "houseRules": ["Check-in after 2:00 PM", "Checkout before 10:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 10", "Non-refundable after that"],
            "host": { "fullname": "Eden Shalev", "imgUrl": "/img/eden.jpg", "role": "Sommelier", "favoritesong": "Perfect Day", "bio": "Winery passes and routes available.", "isSuperhost": false, "monthsHosting": 6, "reviews": 29, "rating": 4.65, "responseRate": 95, "responseTime": "within a few hours" }
        },
        {
            "_id": "s200",
            "title": "Tiberias Lakeside Balcony",
            "price": 162,
            "loc": { "country": "Israel", "city": "Tiberias", "lat": 32.79, "lng": 35.53 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/1/1c/Sea_of_Galilee_from_Tiberias.jpg"],
            "summary": "Lakeside apartment with balcony facing the Kinneret.",
            "maxGuests": 4,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "lake", "title": "Lake view", "desc": "Balcony overlooking the Sea of Galilee." },
                { "icon": "mapmarker", "title": "Walkable", "desc": "Close to Tiberias promenade and restaurants." },
                { "icon": "parking", "title": "Parking", "desc": "On-site free parking for guests." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Washer"],
            "ratings": { "overall": 4.71, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 24", "Non-refundable after that"],
            "host": { "fullname": "Tal Green", "imgUrl": "/img/tal.jpg", "role": "Rowing coach", "favoritesong": "Sail", "bio": "Boat rental and trails guide.", "isSuperhost": true, "monthsHosting": 13, "reviews": 72, "rating": 4.84, "responseRate": 98, "responseTime": "within an hour" }
        },
        {
            "_id": "s201",
            "title": "New York West Village Nest",
            "price": 255,
            "loc": { "country": "USA", "city": "New York", "lat": 40.733, "lng": -74.003 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/3/33/West_Village_Street_2011.jpg"],
            "summary": "Charming studio on a tree-lined West Village street.",
            "maxGuests": 2,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "mapmarker", "title": "Prime location", "desc": "Charming West Village block near Hudson River." },
                { "icon": "elevator", "title": "Elevator", "desc": "Easy access to your floor without stairs." },
                { "icon": "checkin", "title": "Self check-in", "desc": "Flexible entry with keypad access." }
            ],
            "amenities": ["WiFi", "Heating", "Smart TV"],
            "ratings": { "overall": 4.79, "categories": { "cleanliness": 4.8, "accuracy": 4.8, "checkIn": 4.9, "communication": 4.9, "location": 4.9, "value": 4.5 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["CO alarm installed", "Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 23", "Non-refundable after that"],
            "host": { "fullname": "Jamal Ortiz", "imgUrl": "/img/jamal.jpg", "role": "Music producer", "favoritesong": "Empire State of Mind", "bio": "Live music tips nearby.", "isSuperhost": true, "monthsHosting": 21, "reviews": 106, "rating": 4.88, "responseRate": 100, "responseTime": "within an hour" }
        },
        {
            "_id": "s202",
            "title": "San Francisco North Beach Flat",
            "price": 238,
            "loc": { "country": "USA", "city": "San Francisco", "lat": 37.806, "lng": -122.410 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/2/21/San_Francisco_North_Beach.jpg"],
            "summary": "Sunlit flat near cafés, Coit Tower, and the bay.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "mapmarker", "title": "Walkable", "desc": "Steps from Coit Tower and cafés." },
                { "icon": "cityview", "title": "Bay glimpses", "desc": "Partial views of the San Francisco Bay." },
                { "icon": "checkin", "title": "Keyless entry", "desc": "Smart lock for easy check-in." }
            ],
            "amenities": ["WiFi", "Washer", "Heating"],
            "ratings": { "overall": 4.8, "categories": { "cleanliness": 4.8, "accuracy": 4.8, "checkIn": 4.9, "communication": 4.9, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["CO alarm installed", "Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 18", "Non-refundable after that"],
            "host": { "fullname": "Mia Johnson", "imgUrl": "/img/mia.jpg", "role": "Engineer", "favoritesong": "Yellow", "bio": "Coffee and bakery list provided.", "isSuperhost": true, "monthsHosting": 29, "reviews": 209, "rating": 4.95, "responseRate": 99, "responseTime": "within an hour" }
        },
        {
            "_id": "s203",
            "title": "Los Angeles Silver Lake Bungalow",
            "price": 210,
            "loc": { "country": "USA", "city": "Los Angeles", "lat": 34.092, "lng": -118.275 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/1/1a/Los_Angeles_skyline_during_sunset.jpg"],
            "summary": "Design-forward bungalow with patio and parking.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "patio", "title": "Patio", "desc": "Outdoor dining area with plants and shade." },
                { "icon": "parking", "title": "Parking", "desc": "Free private parking spot on property." },
                { "icon": "food", "title": "Great food nearby", "desc": "Walk to Silver Lake’s best cafés and tacos." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Kitchen"],
            "ratings": { "overall": 4.75, "categories": { "cleanliness": 4.8, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.8, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 31", "Non-refundable after that"],
            "host": { "fullname": "Amir Katz", "imgUrl": "/img/amir.jpg", "role": "Guide", "favoritesong": "Yellow", "bio": "Street art and tacos itinerary.", "isSuperhost": false, "monthsHosting": 9, "reviews": 40, "rating": 4.71, "responseRate": 97, "responseTime": "within a few hours" }
        },
        {
            "_id": "s204",
            "title": "Seattle Capitol Hill Studio",
            "price": 195,
            "loc": { "country": "USA", "city": "Seattle", "lat": 47.619, "lng": -122.322 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/6/6b/Seattle_skyline_from_Smith_Tower.jpg"],
            "summary": "Quiet studio steps from cafes and parks.",
            "maxGuests": 2,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "mapmarker", "title": "Walkable", "desc": "Close to bars, parks, and light rail." },
                { "icon": "checkin", "title": "Self check-in", "desc": "Keypad entry for convenient arrival." },
                { "icon": "workspace", "title": "Workspace", "desc": "Cozy desk area for laptop work." }
            ],
            "amenities": ["WiFi", "Washer", "Dryer"],
            "ratings": { "overall": 4.78, "categories": { "cleanliness": 4.8, "accuracy": 4.8, "checkIn": 4.9, "communication": 4.8, "location": 4.9, "value": 4.7 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 17", "Non-refundable after that"],
            "host": { "fullname": "Avery Lee", "imgUrl": "/img/avery.jpg", "role": "Designer", "favoritesong": "Holocene", "bio": "Coffee and parks guide.", "isSuperhost": true, "monthsHosting": 13, "reviews": 72, "rating": 4.85, "responseRate": 98, "responseTime": "within an hour" }
        },
        {
            "_id": "s205",
            "title": "Miami South Beach Deco Apt",
            "price": 219,
            "loc": { "country": "USA", "city": "Miami", "lat": 25.781, "lng": -80.134 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/6/6f/Miami_Beach_skyline.jpg"],
            "summary": "Art Deco gem a block from Ocean Drive.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "beach", "title": "Near beach", "desc": "One block from Ocean Drive and the sand." },
                { "icon": "heritage", "title": "Historic building", "desc": "Classic Art Deco architecture from the 1930s." },
                { "icon": "checkin", "title": "Keyless entry", "desc": "Smart lock access for smooth check-in." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Kitchen"],
            "ratings": { "overall": 4.77, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 2:00 PM", "Checkout before 10:00 AM"],
            "safety": ["First aid kit available"],
            "cancellationPolicy": ["Free cancellation before Dec 15", "Non-refundable after that"],
            "host": { "fullname": "Carlos Rivera", "imgUrl": "/img/carlos.jpg", "role": "Chef", "favoritesong": "Despacito", "bio": "Food and salsa tips ready.", "isSuperhost": false, "monthsHosting": 11, "reviews": 58, "rating": 4.71, "responseRate": 97, "responseTime": "within a few hours" }
        },
        {
            "_id": "s206",
            "title": "Austin Barton Springs Casita",
            "price": 187,
            "loc": { "country": "USA", "city": "Austin", "lat": 30.264, "lng": -97.769 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/6/63/Austin_skyline_from_the_river.jpg"],
            "summary": "Private casita near greenbelt and Barton Springs.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "patio", "title": "Patio", "desc": "Private outdoor sitting area with greenery." },
                { "icon": "parking", "title": "Parking", "desc": "Free on-site parking for guests." },
                { "icon": "mapmarker", "title": "Walkable", "desc": "Close to Barton Springs and local cafés." }
            ],
            "amenities": ["WiFi", "Kitchenette", "Smart TV"],
            "ratings": { "overall": 4.75, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.8, "value": 4.6 } },
            "houseRules": ["Check-in after 2:00 PM", "Checkout before 10:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 21", "Non-refundable after that"],
            "host": { "fullname": "Tessa Grant", "imgUrl": "/img/tessa.jpg", "role": "Musician", "favoritesong": "Space Oddity", "bio": "Live music and taco runs.", "isSuperhost": true, "monthsHosting": 23, "reviews": 127, "rating": 4.88, "responseRate": 99, "responseTime": "within an hour" }
        },
        {
            "_id": "s207",
            "title": "Boston North End Brick Loft",
            "price": 229,
            "loc": { "country": "USA", "city": "Boston", "lat": 42.366, "lng": -71.054 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/4/42/Boston_Beacon_Hill.jpg"],
            "summary": "Exposed-brick loft near pastry shops and harborwalk.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "heritage", "title": "Historic area", "desc": "Located in Boston’s classic North End." },
                { "icon": "mapmarker", "title": "Walkable", "desc": "Steps from Freedom Trail and pastry shops." },
                { "icon": "checkin", "title": "Self check-in", "desc": "Easy access with keypad entry." }
            ],
            "amenities": ["WiFi", "Heating", "Kitchen"],
            "ratings": { "overall": 4.8, "categories": { "cleanliness": 4.8, "accuracy": 4.8, "checkIn": 4.9, "communication": 4.9, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["CO alarm installed", "Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 19", "Non-refundable after that"],
            "host": { "fullname": "Noah Adams", "imgUrl": "/img/noah.jpg", "role": "Historian", "favoritesong": "Here Comes the Sun", "bio": "Museums and pasta trail.", "isSuperhost": false, "monthsHosting": 12, "reviews": 60, "rating": 4.74, "responseRate": 96, "responseTime": "within a few hours" }
        },
        {
            "_id": "s208",
            "title": "Denver RiNo Townhome",
            "price": 214,
            "loc": { "country": "USA", "city": "Denver", "lat": 39.768, "lng": -104.974 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/3/38/Denver_skyline.jpg"],
            "summary": "Modern townhome near murals, breweries, and parks.",
            "maxGuests": 5,
            "bedRooms": 2,
            "baths": 2,
            "highlights": [
                { "icon": "garage", "title": "Garage", "desc": "Private garage with direct entry." },
                { "icon": "balcony", "title": "Rooftop", "desc": "Rooftop patio for sunset views." },
                { "icon": "family", "title": "Family friendly", "desc": "Spacious setup ideal for small families." }
            ],
            "amenities": ["WiFi", "Washer", "Air conditioning"],
            "ratings": { "overall": 4.73, "categories": { "cleanliness": 4.7, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.8, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 29", "Non-refundable after that"],
            "host": { "fullname": "Olivia Park", "imgUrl": "/img/olivia.jpg", "role": "Chef", "favoritesong": "Hotel California", "bio": "Trail and brunch map included.", "isSuperhost": true, "monthsHosting": 10, "reviews": 47, "rating": 4.8, "responseRate": 98, "responseTime": "within an hour" }
        },
        {
            "_id": "s209",
            "title": "Chicago Wicker Park Loft",
            "price": 221,
            "loc": { "country": "USA", "city": "Chicago", "lat": 41.909, "lng": -87.677 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/9/9f/Chicago_River_2016-10-13.jpg"],
            "summary": "Sunny loft with big windows and quick ‘L’ access.",
            "maxGuests": 4,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "workspace", "title": "Workspace", "desc": "Dedicated desk with city light views." },
                { "icon": "food", "title": "Great food", "desc": "Surrounded by Chicago’s top eateries." },
                { "icon": "checkin", "title": "Self check-in", "desc": "Flexible arrival with keypad entry." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Elevator"],
            "ratings": { "overall": 4.78, "categories": { "cleanliness": 4.8, "accuracy": 4.8, "checkIn": 4.8, "communication": 4.8, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 27", "Non-refundable after that"],
            "host": { "fullname": "Daniel Rossi", "imgUrl": "/img/daniel.jpg", "role": "Guide", "favoritesong": "Yellow", "bio": "Architecture and pizza crawl.", "isSuperhost": true, "monthsHosting": 16, "reviews": 103, "rating": 4.9, "responseRate": 98, "responseTime": "within a few hours" }
        },
        {
            "_id": "s210",
            "title": "Portland Pearl District Flat",
            "price": 189,
            "loc": { "country": "USA", "city": "Portland", "lat": 45.526, "lng": -122.68 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/6/6f/Portland_Oregon_downtown.jpg"],
            "summary": "Calm flat in the Pearl near cafés and bookstores.",
            "maxGuests": 3,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "mapmarker", "title": "Walkable", "desc": "Steps from Powell’s Books and coffee shops." },
                { "icon": "balcony", "title": "Balcony", "desc": "Enjoy views of downtown Portland." },
                { "icon": "checkin", "title": "Keyless entry", "desc": "Contactless check-in anytime." }
            ],
            "amenities": ["WiFi", "Washer", "Heating"],
            "ratings": { "overall": 4.76, "categories": { "cleanliness": 4.8, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["CO alarm installed", "Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 26", "Non-refundable after that"],
            "host": { "fullname": "Riley Chen", "imgUrl": "/img/riley.jpg", "role": "Barista", "favoritesong": "Holocene", "bio": "Coffee and trail suggestions.", "isSuperhost": false, "monthsHosting": 7, "reviews": 34, "rating": 4.7, "responseRate": 96, "responseTime": "within a few hours" }
        },
        {
            "_id": "s211",
            "title": "Nashville Gulch Music Loft",
            "price": 206,
            "loc": { "country": "USA", "city": "Nashville", "lat": 36.152, "lng": -86.783 },
            "imgs": ["https://upload.wikimedia.org/wikipedia/commons/8/8c/Nashville_skyline_2009.jpg"],
            "summary": "Bright loft with skyline views near live music venues.",
            "maxGuests": 4,
            "bedRooms": 1,
            "baths": 1,
            "highlights": [
                { "icon": "balcony", "title": "Balcony", "desc": "Private balcony with skyline views." },
                { "icon": "parking", "title": "Free parking", "desc": "Complimentary on-site parking." },
                { "icon": "checkin", "title": "Self check-in", "desc": "Keyless access for flexible arrival." }
            ],
            "amenities": ["WiFi", "Air conditioning", "Kitchen"],
            "ratings": { "overall": 4.77, "categories": { "cleanliness": 4.8, "accuracy": 4.7, "checkIn": 4.8, "communication": 4.8, "location": 4.9, "value": 4.6 } },
            "houseRules": ["Check-in after 3:00 PM", "Checkout before 11:00 AM"],
            "safety": ["Smoke alarm installed"],
            "cancellationPolicy": ["Free cancellation before Dec 30", "Non-refundable after that"],
            "host": { "fullname": "Parker Lane", "imgUrl": "/img/parker.jpg", "role": "Guitarist", "favoritesong": "Free Fallin'", "bio": "Best venues and BBQ list.", "isSuperhost": true, "monthsHosting": 14, "reviews": 83, "rating": 4.86, "responseRate": 99, "responseTime": "within an hour" }
        }
    ]

    saveToStorage(STORAGE_KEY, stays)
}

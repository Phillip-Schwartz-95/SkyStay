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
        "_id": "s103",
        "title": "Beach Bungalow",
        "price": 200,
        "loc": {
            "country": "Israel",
            "city": "Tel Aviv",
            "lat": 32.087275358487595,
            "lng": 34.77065000907147,
            "address": "Tel Aviv, Israel"
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
                "title": "Free cancellation before Nov 1",
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
            },
            "cleanliness": 4.7
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
        "_id": "s104",
        "title": "Westin Kaanapali KORVN 2BR",
        "price": 595,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.78889441525218,
            "lng": -156.3452963080071,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436975/hx9ravtjop3uqv4giupt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436294/mvhb3iazpiar6duvy9we.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436496/ihozxprafjzuhil9qhh4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436952/aef9ajipinpjhkley1e3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436948/vgfxpvmcpd2q40qxtuv3.jpg"
        ],
        "summary": "Westin Kaanapali Ocean Resort Villas North timeshare - Pay resort: $14-20/day, stays under 7 night $38/res - Inquire about availability, I review then offer/approve if available :) - READ \"The Space\" for cleaning/etc AND brief explanation about timeshare reservations - Want guaranteed view for additional cost? Must be weekly rental, other restrictions - Wheelchair accessible / ADA, call resort directly to ensure U receive. If U need ADA U MUST inform us BEFORE booking.",
        "maxGuests": 8,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Doorman",
            "Gym",
            "Elevator",
            "Hot tub",
            "Heating",
            "Family/kid friendly",
            "Suitable for events",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Building staff",
            "Private entrance",
            "Room-darkening shades",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Ethernet connection",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Ground floor access",
            "Wide hallway clearance",
            "Step-free access",
            "Wide doorway",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Disabled parking spot",
            "Step-free access",
            "Wide doorway",
            "Wide clearance to bed",
            "Step-free access",
            "Wide doorway",
            "Step-free access",
            "Wide entryway",
            "Waterfront",
            "Beachfront"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s105",
            "fullname": "Patty And Beckett",
            "location": "Eureka, California, United States",
            "about": "Adventurous couple loves to travel :)",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/542dba0c-eb1b-4ab3-85f3-94d3cc8f87a4.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/542dba0c-eb1b-4ab3-85f3-94d3cc8f87a4.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "36133410",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s105",
        "title": "Belle chambre à côté Metro Papineau",
        "price": 30,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.5106009047446,
            "lng": -73.56486623407542,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437045/dmquvficldi8ssfdlrrx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437033/rhw6gycttaimzocc1poz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437330/mmhkmfvg8o3freucyekc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436867/yocip4igdbruuh2grzpf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436993/yzxnnw83e9qyas022au4.jpg"
        ],
        "summary": "Chambre dans un bel appartement moderne avec balcon, ascenseur et terrasse. Private room in a beautiful modern apartment  with balcony, elevator and patio. La chambre est fermée avec une lit double. Vous aurez accès à une salle de bain avec une douche, terrasse. L'appartement est climatisé.  Votre chambre est équipé d'une connexion Wi-Fi illimité. Vous serez proche du centre ville, au pied du pont Jacques Cartier et à distance de marche de toutes les commodités (métro, supermarché, pharmacie",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Iron",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s107",
            "fullname": "Angel",
            "location": "Montreal, Québec, Canada",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/12be1141-74de-4f04-bf28-82c3ed589d11.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/12be1141-74de-4f04-bf28-82c3ed589d11.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "80344827",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s106",
        "title": "M&M Space MM2  Apartamento no centro da cidade",
        "price": 65,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.17275405588738,
            "lng": -8.61711524692827,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436861/xrxhgsif3ekhxgn8irlm.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436556/mb70fifvvpvde8jub5cg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437241/wt0seud4ot4cmdrztdzz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437308/p80ndulkcghpcfsnvjdo.jpg"
        ],
        "summary": "O apartamento fica perto de arte e cultura e dos mais belos monumentos da cidade. Belos jardins e paisagens da cidade e do rio Douro ficam perto e podem ser apreciadas.  Existem restaurantes típicos e de comida internacional ao redor do apartamento.   O espaço fica numa rua típica da cidade, cheia da sua magia e magnetismo e é muito pratico e confortável. O espaço é excelente para quem pretende visitar e conhecer a zona histórica e turística do Porto. Transportes públicos ficam próximos.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Free street parking",
            "Buzzer/wireless intercom",
            "Family/kid friendly",
            "Washer",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Private entrance",
            "Crib",
            "Room-darkening shades",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Patio or balcony",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Wide doorway",
            "Well-lit path to entrance",
            "Step-free access",
            "Wide doorway",
            "Accessible-height bed",
            "Step-free access",
            "Wide doorway",
            "Accessible-height toilet",
            "Step-free access",
            "Wide entryway",
            "Host greets you",
            "Handheld shower head",
            "Paid parking on premises",
            "Fixed grab bars for shower"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s109",
            "fullname": "Maria",
            "location": "Porto, Porto District, Portugal",
            "about": "Simples, muito comunicativa, mas de elevado sentido de responsabilidade, de organização e de confiança.\r\nGosto muito de contacto humano, sem o qual não me sinto estável. Adoro conhecer pessoas de culturas diferentes.\r\nFaço várias viagens, mas de curta duração, pois tenho necessidade de sentir o lar e a família. Por ser assim, tento fazer tudo para que os meus hospedes se sintam confortáveis como em suas casas.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/c9b876fc-b30e-4951-8f88-af9add00939e.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/c9b876fc-b30e-4951-8f88-af9add00939e.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "78704763",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s107",
        "title": "Fresh and modern 1BR in Bed-Stuy",
        "price": 79,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.70576971300359,
            "lng": -73.99868875414946,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436912/xle8ueqxjeazbs4bp09p.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436460/qi3vkpts37b4k0dedosc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436481/tqwkxtbalipudzhivoag.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437250/o8uutj3t2bvfafvxkr9j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436855/khyvb5q3yzcqaoscuppz.jpg"
        ],
        "summary": "A spacious, art-filled one-bedroom apartment near the express train (28 minutes to Times Square) and a Citibike station. Sample Bed-Stuy life at a nearby French restaurant,  a sunny Haitian cafe, a boutique grocery and more. We do NOT discriminate based on race, religion or sexual orientation.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Heating",
            "Family/kid friendly",
            "Smoke detector",
            "Carbon monoxide detector",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "Self check-in",
            "Lockbox"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s111",
            "fullname": "Shaila & Alex",
            "location": "New York, New York, United States",
            "about": "I'm a journalist from Texas and my husband is an artist from the Ukraine by way of Kansas City. We recently welcomed our son into the world. (Don't worry, he sleeps all night.)  We love exploring New York, especially Brooklyn, from the Brooklyn Flea to tiny taco joints to the Botanic Gardens to performance art in Bushwick storefronts (really). We've both spent a lot of time in the South, so hospitality is second nature to us. ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/6334250/profile_pic/1368287493/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/6334250/profile_pic/1368287493/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "6334250",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s108",
        "title": "Habitación centro de Barcelona",
        "price": 40,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.391339495350906,
            "lng": 2.151402637987332,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436983/pivldxmrxssnhyzixhes.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436394/kscsvxyn0uro9tjhefeb.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436281/doubvhbpwjfx81yfzpxq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436376/phpltehcr6uq9lh5jlax.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436571/fvqbazrysqpymjlhhdqu.jpg"
        ],
        "summary": "Mi piso está en el centro de Barcelona. Cerca del metro, las ramblas, los museos, el Portal del Ángel, Plaza Cataluña. Mi alojamiento es bueno para turistas, aventureros, y viajeros de negocios....y tiene ascensor.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Doorman",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Essentials",
            "Hangers",
            "Hair dryer",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s113",
            "fullname": "Marián",
            "location": "Barcelona, Catalonia, Spain",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/users/31635864/profile_pic/1429604852/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/31635864/profile_pic/1429604852/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "31635864",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s109",
        "title": "DOUBLE ROOM IN THE HEART OF BCN",
        "price": 25,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.385484442334715,
            "lng": 2.159067718460459,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436793/httqod38otalkzp9kynq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436236/ctnbnqazpqhotjcauqwp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436937/mkbcjfockxezgrvimska.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436553/hbkx9lwxjd0wabqk0bmo.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436852/y3scgbn8d6evumdpwdp4.jpg"
        ],
        "summary": "Lit room with balcony. The apartment is in the center, just meters from the Palau de la Musica Catalana. Well connected, a few minutes from Las Ramblas and the Born. Very close to the beach and Ciutadella Park",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Paid parking off premises",
            "Smoking allowed",
            "Heating",
            "Washer",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Bed linens",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s115",
            "fullname": "Isabel",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Mi nombre es Isabel, pero me llamo Isa. Nací en Vigo (Galicia). Con 20 años me fuí a vivir a Madrid con intención de ser actriz; ahora resido en Barcelona desde los 28. Soy una joven de 43 años, cantante de Jazz. Me gusta salir, pero también quedarme en casa a leer o ver alguna buena película.\r\nHe compartido piso muchos años, pero estas serán mis primeras experiencias como anfitriona.\r\n\r\n¡Sed bienvenidos!\r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/72a579ce-37d7-466e-9c25-9876ee8de037.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/72a579ce-37d7-466e-9c25-9876ee8de037.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "35858044",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s110",
        "title": "Home, Sweet, Harlem. Welcome!",
        "price": 110,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.722295167887324,
            "lng": -74.01579495353563,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436390/om97cgufeacwlric2r5w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436827/znh7gqzbwb4wm6bdziy7.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436334/nqgdwv3ljfkrbvynoetv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436376/phpltehcr6uq9lh5jlax.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436937/mkbcjfockxezgrvimska.jpg"
        ],
        "summary": "Welcome! Upgrades Added as of January 2018 This listing is located in the Spanish Harlem Section of Manhattan. I offer a cozy apartment that has great transportation in and out the city! The area has a lot of ethnic restaurants and a lot of local, active residents. This residence is great for a quick, inexpensive stay in New York whether its for business, travel, or personal purposes. I am glad to welcome all guests!",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free street parking",
            "Heating",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Private living room",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s117",
            "fullname": "Kevin",
            "location": "New York, New York, United States",
            "about": "Welcome Everyone! Thank you for stopping by. \r\n\r\nI was born and raised in Manhattan and I am here to help  share the New York City Experience with others through Airbnb!  I am easy to connect with and very reachable and always willing to interact with people. \r\n\r\nI am big on cleanliness and hospitality. I strive on making Guests feel as comfortable as possible. \r\n\r\nI hope you would like to get a chance to visit my location and enjoy the hosting I provide. If you have any questions/ comments, feel free to contact me. \r\n",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/61b62b90-e38b-4609-a3c4-ff5ff06b5c08.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/61b62b90-e38b-4609-a3c4-ff5ff06b5c08.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "24800102",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s111",
        "title": "Heroísmo IV",
        "price": 29,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.171473158258706,
            "lng": -8.617429083415974,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436823/af6elioxovkhvp6cg1un.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437327/epcnh2tzpafwmvi3srcp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437310/tus71yfpnvgulenrli6a.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436453/ndl8odasqgnyquvsbalp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436821/b4ejulqdhsvyseyfnfr0.jpg"
        ],
        "summary": "If the dates you wish are not available, we have other options in the same location. You can find them on my profile. My goal is for you to have your days with the most comfort i can propose. I want you to taste all the feelings in Porto, as our food, as our best places, our best pointviews. I just love to help you enjoying this beautiful city :)",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Free street parking",
            "Heating",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Room-darkening shades",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Stove",
            "Single level home",
            "Long term stays allowed",
            "Host greets you",
            "Handheld shower head"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s119",
            "fullname": "Apartments2Enjoy",
            "location": "Porto, Porto District, Portugal",
            "about": "Welcome!\r\nThe apartments has all the things to provide you a perfect days in Porto. It is located in a very central area, inside a typical oporto building. \r\nI will give you lots of informations about Porto, my personal tips, and I'll always be available to help you with anything. All I want is for you to go home knowing Porto and inevitably loving the city! :)\r\n\r\n",
            "responseTime": "within a day",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/f3e85f0c-e28d-4698-9da9-2f203aea1f3d.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/f3e85f0c-e28d-4698-9da9-2f203aea1f3d.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "9320470",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s112",
        "title": "Monte dos Burgos - Cosy Room",
        "price": 26,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.1604755552043,
            "lng": -8.627138628128218,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436993/yzxnnw83e9qyas022au4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436329/cvylwkta0uannbxm3zns.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437168/vbmfmdmwrxt7xfwbsw7c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436821/b4ejulqdhsvyseyfnfr0.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436553/hbkx9lwxjd0wabqk0bmo.jpg"
        ],
        "summary": "The neighbourhood is a quiet, family residential area, 20 minutes by bus from the historic center of Porto and 20 minutes from the beach (Matosinhos - where you may eat very GOOD fish!). You will love to stay in a very spacious, familiar and bright room, where you can enjoy a large and flowery garden, comfortable kitchen and laundry with washer and dryer machine. My space is good for couples, solo adventures, and business travelers!",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Cat(s)",
            "Washer",
            "Dryer",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s121",
            "fullname": "Patrícia Sousa Casimiro",
            "location": "Senhora da Hora, Porto, Portugal",
            "about": "",
            "responseTime": "a few days or more",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/87b9ccba-154a-4546-8cbe-8bdb25ddb36c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/87b9ccba-154a-4546-8cbe-8bdb25ddb36c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "80558077",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s113",
        "title": "Nice Cosy Room In Taksim",
        "price": 105,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.00798700321967,
            "lng": 28.997440361633565,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437241/wt0seud4ot4cmdrztdzz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436867/yocip4igdbruuh2grzpf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436460/qi3vkpts37b4k0dedosc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436261/hwqt72njlhf9hkqou9ka.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437040/oarfkdxx7gyyvcynvwko.jpg"
        ],
        "summary": "Welcome if you want to stay at a cozy flat with local experience.:) It is in the center of Istanbul.The neighborhood is safe and close to attractions.Transportation is easy. I will help you always.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Heating",
            "Washer",
            "Essentials",
            "Shampoo"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s123",
            "fullname": "Nihat",
            "location": "Istanbul",
            "about": "I live alone in Taksim area and i work at bar.\r\nI like meet new friends from all of the world.\r\nI like to Travel a lot ofcourse if i have free time :) East Asia , Sun , Sea , Sand , Movie  :) ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/6bf03261-e7ac-4e0e-8121-3828612bbb6a.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/6bf03261-e7ac-4e0e-8121-3828612bbb6a.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "5823933",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s114",
        "title": "Penthouse Sands of Kahana Sandy Swimmable Beach",
        "price": 800,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.789299902047823,
            "lng": -156.32721516331765,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436917/mqkfjmfpmyqpqmzmqgau.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436204/wzbrvr4mcsuub6gvwbry.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436523/ptcgbydjsamgf67a0npw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436597/l90ukcpzpv6yvv6vhsnd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436368/noebywqae4x0u42srsv3.jpg"
        ],
        "summary": "Price includes nightly rate & 14.42% tax.  Our fully remodeled 9th floor Penthouse unit offers the most amazing views.  The entire front of the condo is windows offering you a fantastic view of beautiful Pacific Ocean, Molokai & Lana'i.  Perfect location for watching beautiful sunsets, see our resident sea turtles & an excellent place for spotting whales during the whale migration season. This spacious two level 3 bedroom and 3 full bath Penthouse unit has over 2,050 sq ft of living space w/ AC.",
        "maxGuests": 9,
        "bedRooms": 3,
        "beds": 1,
        "baths": 3,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Gym",
            "Elevator",
            "Hot tub",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Building staff",
            "Private entrance",
            "Bathtub",
            "Baby bath",
            "High chair",
            "Children’s books and toys",
            "Crib",
            "Pack ’n Play/travel crib",
            "Children’s dinnerware",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "BBQ grill",
            "Patio or balcony",
            "Beach essentials",
            "Step-free access",
            "Disabled parking spot",
            "Step-free access",
            "Step-free access",
            "Step-free access",
            "Beachfront",
            "Pool with pool hoist"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s125",
            "fullname": "Cynthia",
            "location": "California, United States",
            "about": "My husband and I are Real Estate Investors.  We enjoy traveling and no matter where we go, we always find ourselves looking at properties.  Since we still have school age children I have found that a beach vacation is usually the most enjoyable for everyone.  Living on the West Coast, Hawaii continued to be a place that we would return to time and time again.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/07c98f2f-9ffe-4ed8-82ca-1e9cd00c673f.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/07c98f2f-9ffe-4ed8-82ca-1e9cd00c673f.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "82827178",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s115",
        "title": "+Spacious Studio&Kitchenette near Blue Mosque+",
        "price": 264,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.02531725441018,
            "lng": 28.97989444752803,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436321/g2cs1w7tkxsx58penq9j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436542/e96nrbkjz8mecvsbzukk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437250/o8uutj3t2bvfafvxkr9j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436957/ehhcyscwtvxw55mptkok.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436294/mvhb3iazpiar6duvy9we.jpg"
        ],
        "summary": "A spacious, private studio with high speed Wi-Fi wireless internet. It is located in historical district of Sultanahmet oldcity center. It's Only 10 minutes (by walking) away from Sultanahmet  Blue Mosque, Hagia Sophia, Topkapı Palace, Underground Cistern and Hippodrome. This area is called Kadirga and it's famous with it's local restaurants. There are more gorcery stores and supermarkets in this are since it's not %100 touristic area. There is children playground right in front of the building.",
        "maxGuests": 5,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Heating",
            "Family/kid friendly",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Hot water",
            "Microwave",
            "Refrigerator",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s127",
            "fullname": "Kadirga",
            "location": "Istanbul, İstanbul, Turkey",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/7620074d-86d6-49c3-b7fe-cafe084051dd.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/7620074d-86d6-49c3-b7fe-cafe084051dd.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "98780303",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s116",
        "title": "Grand apartment Sagrada Familia",
        "price": 169,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.38156781638871,
            "lng": 2.1462777673230558,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436811/ym5nh1anownexsyzgbqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436772/nplkpwclhrdvvspkpmbg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437033/rhw6gycttaimzocc1poz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436897/iz1ik9nibj3sobzrqomf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436353/wqah1dfim6hcosaq0ve3.jpg"
        ],
        "summary": "4 rooms apartment in the heart of the right “Eixample” broadening. Perfect location in the notorious area of Sagrada Familia that will ensure and unforgettable stay in Barcelona. HUTB-003275",
        "maxGuests": 8,
        "bedRooms": 4,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Smoking allowed",
            "Buzzer/wireless intercom",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s129",
            "fullname": "Alexandra Y Juan",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Hola, \r\n\r\nSomos Alexandra y Juan dos amigos que estamos enamorados de Barcelona, nuestras pasiones son viajar y conocer gente por lo que nos encantaría compartir con vosotros nuestros espacios  para que disfrutéis a vuestro gusto de toda la cultura, actualidad y diversidad de ofertas que la ciudad os ofrece.\r\nPara nosotros lo mas importante es que nuestros huéspedes puedan aprovechar al máximo su estancia en Barcelona,  que viváis vuestra historia  reflejada en  rincones únicos de la ciudad y por supuesto nuestra mayor satisfacción es que os sintáis como en casa según lo que busquéis.\r\n\r\nHello, \r\n\r\nWe are Alexandra and Juan two friends who are in love with Barcelona, our passion is to travel and meet new people so we would love to share our spaces with you and that you can enjoy the culture, the present and the diversity of offers that the city has to offer. \r\nFor us the most important thing is that our guests can make the most of their stay in Barcelona, that you live our history full of unique places and of course our greatest satisfaction is that you feel as if you where at home according to what you are looking for.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/3fceba9a-ce84-4841-88df-b699105119b4.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/3fceba9a-ce84-4841-88df-b699105119b4.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "54320669",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s117",
        "title": "Spacious and quiet duplex apartment in Poble Sec",
        "price": 130,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.37994996027234,
            "lng": 2.1770136030344767,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436397/nde7l2hrwezdfzbvhczj.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436539/jy85me6y4bcsgfjvytwv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436948/vgfxpvmcpd2q40qxtuv3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436801/mcuu1w2188ndpd6hezzt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436907/abikktroqknzhch6b9ly.jpg"
        ],
        "summary": "Spacious apartment in a peculiar building in the central neighbourhood of Poble Sec, with patio and terrace, ideal for families with children or groups. Walking distance from center, Montjuïc, Plaza España, Fira Montjuïc/Gran Vía, Sant Antoni, Raval.",
        "maxGuests": 7,
        "bedRooms": 3,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Outlet covers",
            "Bathtub",
            "High chair",
            "Stair gates",
            "Children’s books and toys",
            "Crib",
            "Pack ’n Play/travel crib",
            "Room-darkening shades",
            "Children’s dinnerware",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Ethernet connection",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Patio or balcony",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Wide doorway",
            "Well-lit path to entrance",
            "Wide entryway",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s131",
            "fullname": "Cristina",
            "location": "Barcelona, Catalonia, Spain",
            "about": "(ES) Soy mujer, mamá y traductora. Me gusta tener tiempo para pensar, viajar, jugar con mis hijas y descubrir algo nuevo cada día. A veces por trabajo tengo que viajar, y entonces mi amiga Yamila, gran mujer y fantástica anfitriona, amante del campo y fotógrafa de profesión, me ayuda con los huéspedes.\r\n\r\n(EN) I am a woman, a mother and a translator. I like having time to think, to travel, to play with my daughters and to discover something new every day. Sometimes I have to travel because of my job: in those occasions my friend Yamila, great woman and fantastic host, outdoor lover and photographer, helps me out with guests.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/6107595/profile_pic/1442432675/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/6107595/profile_pic/1442432675/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "6107595",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s118",
        "title": "*CoZy Private Williamsburg Home*",
        "price": 225,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.71686785984639,
            "lng": -74.02129232454506,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436394/kscsvxyn0uro9tjhefeb.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437269/u6wxkpazgvqdxiceky9l.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436978/mhqf1tttzqr33ecrrwb2.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436811/ym5nh1anownexsyzgbqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436453/ndl8odasqgnyquvsbalp.jpg"
        ],
        "summary": "*NO PARTIES OR EVENTS* **Minutes From MANHATTAN / NYC BY TRAIN* 1 BLOCK FROM GRAND ST. First Floor Newly Renovated And Furnished Williamsburg Apartment Duplex  Back yard access. Wood Floors. Wifi. Marble & Granite Bathroom. *NEW-CLEAN* *BAKYARD PATIO* *CABLE TV*",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Smoking allowed",
            "Hot tub",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s133",
            "fullname": "Sal",
            "location": "US",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/217e78d8-bb65-46c5-af28-ecd1939e1945.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/217e78d8-bb65-46c5-af28-ecd1939e1945.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "62130666",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s119",
        "title": "Newly and comfortable apt",
        "price": 463,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.32643415718097,
            "lng": 114.15267172238703,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436867/yocip4igdbruuh2grzpf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437330/mmhkmfvg8o3freucyekc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437025/haliwehueqfkmxo1tv7j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436978/mhqf1tttzqr33ecrrwb2.jpg"
        ],
        "summary": "The comfortable apartment at the heart of busy Tsim Sha Tsui.2minutes walk to the MTR/Subway station.There are many biggest shopping mall around here:K-11,The One,Harbour city ect.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Kitchen",
            "Doorman",
            "Elevator",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "Hair dryer",
            "Iron"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s135",
            "fullname": "Michelle&May",
            "location": "Hong Kong",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/37031267/profile_pic/1441373303/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/37031267/profile_pic/1441373303/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "37031267",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s120",
        "title": "302 Kanai A Nalu Ocean front/view",
        "price": 400,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.806885159484374,
            "lng": -156.3309431151262,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437013/gz1hfzv47xzfwcmosadc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437168/vbmfmdmwrxt7xfwbsw7c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436582/vv0y7twjl7zcj9g71sjf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437033/rhw6gycttaimzocc1poz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437361/h7fdhfrwoo9jtcgwqzn7.jpg"
        ],
        "summary": "Welcome to Kana'i A Nalu a quiet resort that sits on the ocean away from the road. This property has the BEST ocean front views of Molokini Crater and Kaho'Olawe Island. There is a resort swimming pool and BBQs next to the ocean. This gorgeous 2 bed 2 bath unit is on the third floor look over the Pacific Ocean with views of Sugar Beach and Mount Haleakalea!  The condo is light and bright with all the creature comforts of home.  The beds are very comfortable.",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Elevator",
            "Free street parking",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Essentials",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Lockbox",
            "Babysitter recommendations",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "BBQ grill",
            "Patio or balcony",
            "Garden or backyard",
            "Beach essentials",
            "Long term stays allowed",
            "Wide hallway clearance",
            "Step-free access",
            "Wide doorway",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Disabled parking spot",
            "Step-free access",
            "Step-free access",
            "Step-free access",
            "Waterfront",
            "Beachfront"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s137",
            "fullname": "Kathy",
            "location": "Hawaii, United States",
            "about": "I am the owner of Maui Vision Rental. Maui Vision became a reality and a business starting with my personal condo at the Kihei Akahi Resort C618.\r\n\r\nMaui Vision is a business I love because I get to share the Aloha Spirit, the beauty of the land, and talk story with people from around the world. It is nice to know that we can contribute to someone’s Hawaiian vacation experience in a positive way. We love to hear back from our happy guests.\r\n\r\nI used to live on the island of Oahu with my US Navy family when I was young.  We later moved to Southern California.  I knew one day I would return to Hawaii, the place I fell in love with long ago. I took a leap of faith and purchased my Maui condo June 2002 this was the beginning of fulfilling her prophecy to once again return to Hawaii soil.\r\n\r\nI am a tropical expression artist who paints on canvas and etched metal.  My work is inspired by the beauty of the islands and has been displayed in several Maui art galleries over the years.  I am a writer and have my first book on Amazon.  I recently took up hula dancing and love to immerse myself in the culture and grace of this island.\r\n\r\nI have over 25 years of business administration and customer service experience working for large corporations and high tech startups.\r\n\r\nIf you are in need of a caring Realtor here on Maui, please contact Kathy McCartney RS#77317 of La Costa Realty Hawai’i, LLC Brokerage Lic #18349 .",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/ddcc4146-9abc-4f4d-b347-8f30deb10f6c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/ddcc4146-9abc-4f4d-b347-8f30deb10f6c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "733802",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s121",
        "title": "Spacious, Sunny Room in Park Slope",
        "price": 85,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.72812291805894,
            "lng": -74.01746868065378,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436380/ez5caladc00mgsssl6ws.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436597/l90ukcpzpv6yvv6vhsnd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436937/mkbcjfockxezgrvimska.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436266/num9wnb6uzdsvqr6nyuu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437358/cy8kzj8jeofwkev6tlq9.jpg"
        ],
        "summary": "Spacious, sunny room in owner occupied house in the heart of Park Slope. Shared  bathroom with shower/bath tub. Steps away from restaurants/bars and shopping. Within walking distance of major subway lines, Prospect Park, BAM and Barclay Center.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Air conditioning",
            "Heating",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Fire extinguisher",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s139",
            "fullname": "Lisah",
            "location": "New York, New York, United States",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/24253453/profile_pic/1434065920/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/24253453/profile_pic/1434065920/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "24253453",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s122",
        "title": "Apartamento en casco antiguo",
        "price": 55,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.38608901779499,
            "lng": 2.1843608022961023,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437006/kcsenznwf3pnka6hjwoh.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436801/mcuu1w2188ndpd6hezzt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436385/sorbz7rdtxacu1ds9vel.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436993/yzxnnw83e9qyas022au4.jpg"
        ],
        "summary": "Apartamento en el centro del casco antiguo de Barcelona, a 50 mts del mar, a 1 minuto de Las Ramblas, Borne, Plaza Real y Barceloneta.",
        "maxGuests": 4,
        "bedRooms": 3,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "High chair",
            "Crib",
            "Room-darkening shades",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Cleaning before checkout",
            "Wide doorway",
            "Step-free access",
            "Wide clearance to bed",
            "Step-free access",
            "Host greets you",
            "Handheld shower head"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s141",
            "fullname": "Luis",
            "location": "Barcelona, Catalonia, Spain",
            "about": "",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/users/22076771/profile_pic/1415724202/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/22076771/profile_pic/1415724202/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "22076771",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s123",
        "title": "Elegant Flat in the Center",
        "price": 190,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 40.99831637002016,
            "lng": 28.980963203563626,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437330/mmhkmfvg8o3freucyekc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436453/ndl8odasqgnyquvsbalp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436402/jtsg0m0t0x0ciyuzvbun.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436948/vgfxpvmcpd2q40qxtuv3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436306/be2v9wssznxs4hebudb4.jpg"
        ],
        "summary": "A part of a famous Poet Orhan Veli Kanık's poem: I am listening to Istanbul, intent, my eyes closed.  The Grand Bazaar is serene and cool,  A hubbub at the hub of the market,  Mosque yards are brimful of pigeons,  At the docks while hammers bang and clang  I am listening to Istanbul, intent, my eyes closed.  In the heart of Istanbul, and a step back from Bosphorus, our flat is ideal for a guest looking for to visit magical corners to listen epic Istanbul.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Kitchen",
            "Paid parking off premises",
            "Smoking allowed",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s143",
            "fullname": "Pelin",
            "location": "Çalışıyorum",
            "about": "I live in Cihangir and love to meet people and share our lively neighbourhood with them.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/d741db02-7680-4a52-940e-52dae808cd1f.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/d741db02-7680-4a52-940e-52dae808cd1f.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "2769925",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s124",
        "title": "Westin Kaanapali KORVS 2BR OCEAN VIEW",
        "price": 799,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.801818672294168,
            "lng": -156.33680362500755,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437349/thl7eoxar7dc7kpbahhj.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436236/ctnbnqazpqhotjcauqwp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436571/fvqbazrysqpymjlhhdqu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436811/ym5nh1anownexsyzgbqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436948/vgfxpvmcpd2q40qxtuv3.jpg"
        ],
        "summary": "Westin Kaanapali Ocean Resort Villas South timeshare - Pay resort: $14-20/day, stays under 7 night $38/res - Inquire about availability, I review then offer/approve if available :) - READ \"The Space\" for cleaning/etc AND brief explanation about timeshare reservations - Guaranteed view MUST BE 7 nights (mult weeks avail), check-in Fri/Sat/Sun. More/Less nights @ higher cost - Wheelchair accessible / ADA, call resort directly to ensure U receive. If U need ADA U MUST inform us BEFORE booking.",
        "maxGuests": 8,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Doorman",
            "Gym",
            "Elevator",
            "Hot tub",
            "Heating",
            "Family/kid friendly",
            "Suitable for events",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Building staff",
            "Private entrance",
            "Room-darkening shades",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Ethernet connection",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "BBQ grill",
            "Patio or balcony",
            "Garden or backyard",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Wide hallway clearance",
            "Step-free access",
            "Wide doorway",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Disabled parking spot",
            "Step-free access",
            "Wide doorway",
            "Wide clearance to bed",
            "Step-free access",
            "Wide doorway",
            "Step-free access",
            "Wide entryway",
            "Waterfront",
            "Beachfront"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s145",
            "fullname": "Patty And Beckett",
            "location": "Eureka, California, United States",
            "about": "Adventurous couple loves to travel :)",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/542dba0c-eb1b-4ab3-85f3-94d3cc8f87a4.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/542dba0c-eb1b-4ab3-85f3-94d3cc8f87a4.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "36133410",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s125",
        "title": "Burgazada da çarşıya yakın daire",
        "price": 348,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.01549431932848,
            "lng": 28.979989512157786,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436886/cvc2yfmhfg9dabfkyiqw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436368/noebywqae4x0u42srsv3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437321/lb1j83rv5xox1ovn5pgz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436397/nde7l2hrwezdfzbvhczj.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436978/mhqf1tttzqr33ecrrwb2.jpg"
        ],
        "summary": "Yeşillikler ve tipik ada evleri arasında yürüyüş yapmak, bisiklete binmek, yüzmek, S.F.Abasıyanık Müzesini gezmek, İstanbul un en güzel gün batımına şahit Kalpazankaya da yemek yemek, baharda mimoza toplamak, Marta yı anlamak koyunda yüzerken",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Kitchen",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Children’s books and toys",
            "Hot water",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s147",
            "fullname": "Eser",
            "location": "Istanbul, İstanbul, Turkey",
            "about": "",
            "responseTime": "within a day",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/fda23efa-e51c-40be-8cd8-3ab6ee05c140.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/fda23efa-e51c-40be-8cd8-3ab6ee05c140.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "57921954",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s126",
        "title": "Artsy 4BR in Plateau by Sonder",
        "price": 152,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.509408015523285,
            "lng": -73.58046298182006,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437025/haliwehueqfkmxo1tv7j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436310/acidri8oahpcoxa0idns.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436372/d32ktdsaqfoiogz5dpvf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437049/gpanmdffbwd9crhnzswa.jpg"
        ],
        "summary": "At this Sonder, you'll love the bright and airy decor, expansive living area, and beautiful fully-equipped kitchen with modern appliances. Located in the Le Plateau, known for its assortment of delicious restaurants and relaxed cafes.",
        "maxGuests": 8,
        "bedRooms": 4,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free street parking",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Lockbox",
            "Private living room",
            "Hot water",
            "Bed linens",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Long term stays allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s149",
            "fullname": "Sonder",
            "location": "San Francisco, California, United States",
            "about": "Sonder provides everything you need for an exceptional stay. Every booking is instantly confirmed. Every call or message is answered within minutes. Every home is equipped with crisp linens, high-speed Wi-Fi, and kitchen and bath essentials. And every experience is one-of-a-kind, thanks to our unique spaces and Neighborhood Guides.\r\n\r\nTo provide a better Sonder guest experience, we're creating local Airbnb accounts, and moving our listings to those new accounts. If you don't see a property you like here, there may be more on one of our new local profiles. Please reach out for more information!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/c92b0b12-e019-4bb1-b0a8-c0b671096eb2.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/c92b0b12-e019-4bb1-b0a8-c0b671096eb2.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "12243051",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s127",
        "title": "2 bedroom Upper east side",
        "price": 275,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.72308466999043,
            "lng": -74.00979506755908,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436525/wdod0zfzsipkigajueda.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436844/vowx18k0arro8jyekcap.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436385/sorbz7rdtxacu1ds9vel.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436897/iz1ik9nibj3sobzrqomf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436864/ww1gixcmzwryfe1amps1.jpg"
        ],
        "summary": "Near 70th and 1st.  A very nice 6th floor walk-up with true 2 bedrooms and one bath. Full Kitchen. One bedroom has a queen and the other a double.  Living room has a couch you could sleep on too. New powerful air conditioner cools whole apt. Great area with restaurants, shopping and walk to Central Park Please contact us first if reserving on same day, we might need time to arrange for keys. Holiday weekends we prefer 3 night stays. Thank you!",
        "maxGuests": 5,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Pets allowed",
            "Pets live on this property",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Essentials",
            "Shampoo",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s151",
            "fullname": "Chelsea",
            "location": "Sea Cliff, New York, United States",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/4d361f57-f65e-4885-b934-0e92eebf288d.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/4d361f57-f65e-4885-b934-0e92eebf288d.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "52004369",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s128",
        "title": "1 Stop fr. Manhattan! Private Suite,Landmark Block",
        "price": 130,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.69939754130762,
            "lng": -74.00410045509368,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436456/aazeb5pemja3ddxauatd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437282/qy0p7yyaukasripzwc7w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436886/cvc2yfmhfg9dabfkyiqw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437049/gpanmdffbwd9crhnzswa.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436310/acidri8oahpcoxa0idns.jpg"
        ],
        "summary": "Private room, dedicated bath and a separate entrance. Totally renovated Queen Anne Historic Townhouse Home on a safe, Landmark Block. Only one stop from Midtown Manhattan! Enjoy the rear private Garden at breakfast time. Beautiful tree lined,quiet street. 4 subway lines ( E, M, 7 and G ) are one block away! Great restaurants, supermarket and cafes nearby.",
        "maxGuests": 4,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Air conditioning",
            "Pets live on this property",
            "Dog(s)",
            "Heating",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Luggage dropoff allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s153",
            "fullname": "Orestes",
            "location": "New York, New York, United States",
            "about": "Photographer/Developer. \r\nI enjoy NYC tremendously but love traveling and have visited\r\nover 40 countries. My house is filled with artwork from those travels.\r\nI work my photography business from my home studio, in a restored 1890 landmark townhouse with all the modern amenities.\r\nMy house has been used for filming scenes for Sex & The City, The Sopranos, Gossip Girl & White Collar.\r\nMy photography column,\"Orestes'LIC\", appears every month in the local paper.\r\nI love Asian, Spanish & Cuban food, along with a good bottle of red wine.\r\nTalking about travel, art, design and photograph,is my favorite pastime. Sorry,I dont shop or know where the best electronics bargains are located ! \r\nI love giving great walking tour information of different parts of NYC, and info on non-touristy places to eat real food in the area.\r\nI will provide you the privacy level you require to make your stay here is as comfortable as possible.\r\nEnjoy a great, clean, stylish place to stay, only 7 minutes from Manhattan!\r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/50124/profile_pic/1443072360/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/50124/profile_pic/1443072360/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "50124",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s129",
        "title": "Two bedroom apartment",
        "price": 155,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.40197699766027,
            "lng": 2.179082274501675,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437025/haliwehueqfkmxo1tv7j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436886/cvc2yfmhfg9dabfkyiqw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436867/yocip4igdbruuh2grzpf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436390/om97cgufeacwlric2r5w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436983/pivldxmrxssnhyzixhes.jpg"
        ],
        "summary": "Cozy apartment with wooden floors, two bedrooms, one with double bed, the second with two single beds, two bathrooms and equipped kitchen.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Smoking allowed",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Bathtub",
            "Bed linens",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Oven",
            "Patio or balcony"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s155",
            "fullname": "Mariana & Ramón",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Nos encanta Barcelona, conocemos la ciudad y algunos de sus secretos. Podemos ayudarte a planificar tu visita.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/6544866/profile_pic/1400529085/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/6544866/profile_pic/1400529085/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "6544866",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s130",
        "title": "Sunny and quiet room with private shower room",
        "price": 40,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.40410122655001,
            "lng": 2.1673828572614937,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436385/sorbz7rdtxacu1ds9vel.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436329/cvylwkta0uannbxm3zns.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437339/qgs3hrnx0accbjkzuh9s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436376/phpltehcr6uq9lh5jlax.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437279/vgq4tkkecvdo2nzxdudx.jpg"
        ],
        "summary": "Very quite and sunny room with private shower room My place is in Poble Sec, one of the most charming neighborhood in Barcelona. Located in the shadow of Montjuic's hill,the biggest and most beautiful parc in the city Just 2min far from  metro station and 15min from the airport bus stop Poble Sec is sizzling with open air bars and  quite streets ,pretty squares and friendly locals make it worthy The flat is in the 5th FLOOR NO LIFT  There's a lovely fat cat living",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Kitchen",
            "Pets live on this property",
            "Cat(s)",
            "Buzzer/wireless intercom",
            "Heating",
            "Washer",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Bed linens",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Stove"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s157",
            "fullname": "Montserrat",
            "location": "Barcelona, Catalonia, Spain",
            "about": "\r\nI love traveling. Therefore, I am delighted to help travelers to discover the magical places of this incredible city. I am completely available to give any kind of suggestions, information and help on what they need to make the stay in Barcelona as pleasant as possible !!\r\n\r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/fdb58b71-1613-4905-8850-024dc23f1cb0.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/fdb58b71-1613-4905-8850-024dc23f1cb0.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "80740340",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s131",
        "title": "Inner City Terrace - 2 rooms 2 beds - 4 ppl.",
        "price": 171,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.86045761304589,
            "lng": 151.2156979396811,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436236/ctnbnqazpqhotjcauqwp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436588/cxkvvaext8m0kjuaxcrk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436542/e96nrbkjz8mecvsbzukk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436787/gcz7mgmxb6dcl4vz6h0a.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437259/pw5sosryaebjynvwppcy.jpg"
        ],
        "summary": "Our home is located in Darlington, a small niche suburb of Sydney with a relaxed, friendly and safe atmosphere. We are located a 10 min walk to Broadway, Glebe, Newtown, The University, surrounded by fantastic restaurants, cafes, pubs, markets and public transport. It is a 20 min walk to the city centre.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Paid parking off premises",
            "Smoking allowed",
            "Free street parking",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s159",
            "fullname": "Jason",
            "location": "New South Wales, Australia",
            "about": "Hey I'm Jason. I enjoy travelling, photography and beer!\r\n\r\nWe have had a little girl!\r\nOur calender will be closed for a while. If you are a repeat guest send me a message and we might be able to open the calender for you.\r\n\r\nI spent many years living in England, Ireland and Italy; and have travelled to Andorra, Austria, Bali, Belgium, Bulgaria, France, Germany, Hungary, Malaysia, Portugal, Romania, Singapore, Spain, Switzerland, Thailand & Vietnam. \r\n\r\nMy partner Luana is from Verona, Italy. \r\n\r\nWe started hosting in Oct 2015 and enjoy meeting people from around the world and listening to stories about their country and travels.\r\n\r\nWe have a good knowledge of Sydney (sights, attractions, shopping, beaches, day treks, restaurants, pubs & night clubs) and various places around Australia. ",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/440690bd-73f1-411a-8194-5e6a17bc39ff.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/440690bd-73f1-411a-8194-5e6a17bc39ff.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "9031139",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s132",
        "title": "Nice room with queen sized bed",
        "price": 30,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.4969264372095,
            "lng": -73.55716222491891,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436864/ww1gixcmzwryfe1amps1.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437053/cg3bpdujvsd9lswwpfgy.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436588/cxkvvaext8m0kjuaxcrk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437269/u6wxkpazgvqdxiceky9l.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437006/kcsenznwf3pnka6hjwoh.jpg"
        ],
        "summary": "A lovely room with a queen sized bed, chair, dresser, lamp and closet. This room has AC for the hotter months. Guests are welcome to use the kitchen, living room and study.",
        "maxGuests": 1,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free street parking",
            "Heating",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s161",
            "fullname": "Jen",
            "location": "Montreal, Quebec, Canada",
            "about": "Massage therapist, artist, writer, gardener, traveler, filmmaker and B&B Host.",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/users/528512/profile_pic/1303510673/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/528512/profile_pic/1303510673/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "528512",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s133",
        "title": "Cozy and modern Lapa-studio",
        "price": 112,
        "loc": {
            "country": "Brazil",
            "city": "Rio De Janeiro",
            "lat": -22.895346921583116,
            "lng": -43.16022178953134,
            "address": "Rio De Janeiro, Brazil"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436582/vv0y7twjl7zcj9g71sjf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436359/abuiyexl2xyemq8uon4s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436321/g2cs1w7tkxsx58penq9j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436470/jrzh7wvpvulqxo42xocc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436801/mcuu1w2188ndpd6hezzt.jpg"
        ],
        "summary": "Studio in modernized building with games room, gym, computer room, ballroom and rooftop pool. The studio with modern, cheerful decor, with light vintage feel is divided into bedroom and living room with kitchen.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Paid parking off premises",
            "Doorman",
            "Gym",
            "Elevator",
            "Buzzer/wireless intercom",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Building staff",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "BBQ grill",
            "Patio or balcony",
            "Garden or backyard",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Wide hallway clearance",
            "Wide doorway",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Accessible-height bed",
            "Step-free access"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s163",
            "fullname": "Dejanira",
            "location": "Rio de Janeiro, Rio de Janeiro, Brazil",
            "about": "Moro no Rio de Janeiro, nascida em Salvador. Resolvi alugar este apartamento,  principalmente por que gosto muito de viajar e quando viajo, prefiro alugar um espaço para ficar. Alugar um apartamento em outra cidade, outro país, além de ser mais barato do que hotel, possibilita uma maior interação com os moradores locais e um maior conhecimento sobre o seu modo de vida. Como são os supermercados e as padarias, o que vendem ali ? qual é o dia a dia da população?  Além disto não há horário para o café da manhã e posso fazer um lanche ou almoço se não quiser ir a um restaurante.\r\nProcuro trazer as minhas experiências de hospedagem para o meu apartamento, pois quero que o hóspede se sinta confortável, em casa.\r\nAlém de gostar muito de viajar, adoro ler e ouvir música e pretendo com o dinheiro que ganho hospedando, poder me hospedar mais pelo mundo a fora. ",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/users/8557006/profile_pic/1378865375/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/8557006/profile_pic/1378865375/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "8557006",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s134",
        "title": "Double room with private bathroom",
        "price": 38,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.377146211228236,
            "lng": 2.1828171906045744,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436588/cxkvvaext8m0kjuaxcrk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436310/acidri8oahpcoxa0idns.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437049/gpanmdffbwd9crhnzswa.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437250/o8uutj3t2bvfafvxkr9j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436414/trl4n8noogyun10qmds8.jpg"
        ],
        "summary": "Double room on the second floor of a new constructed duplex of modern design. There are a wardrobe, a small table and its own air conditioner that could be used  for winter as well as for summer. Large family size bed of 135 x 190 cm. Inside the apartment you could freely use large kitchen with dining table and a lot of modern kitchen devices. Itºs located in a quiet neighborhood just in  15 min by train or metro (the train or metro station are just in 5 min by foot from apartment).",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Luggage dropoff allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s165",
            "fullname": "Sonia",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Soy una persona extrovertida, sociable, sencilla y me gusta conocer a gente nueva.\r\nEntre mis aficiones están el cine, el baile, los paseos por la playa y la montaña y viajar.",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/7df7595b-806c-46f4-a4d9-62f41a38393d.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/7df7595b-806c-46f4-a4d9-62f41a38393d.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "16022141",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s135",
        "title": "Quarto Taquara - Jacarepaguá",
        "price": 101,
        "loc": {
            "country": "Brazil",
            "city": "Rio De Janeiro",
            "lat": -22.910329587848604,
            "lng": -43.17102546507803,
            "address": "Rio De Janeiro, Brazil"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436255/nmccht42mpd6erdeqjhi.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436872/i3jblqgpdttpwvshbffo.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437009/zuu2udtrkcs6sxjiym40.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437344/r4w6s3af55tdt5y1lrcc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436556/mb70fifvvpvde8jub5cg.jpg"
        ],
        "summary": "Quarto exclusivo com armário e sofá cama de casal, possui ainda um colchão de casal. Apartamento localizado próximo a estação do BRT - Aracy Cabral - Bairro da Taquara - Jacarepaguá de fácil acesso aos bairros da Barra da Tijuca, Recreio, etc.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Cable TV",
            "Wifi",
            "Kitchen",
            "Smoking allowed",
            "Elevator",
            "Buzzer/wireless intercom",
            "Family/kid friendly",
            "Washer",
            "Essentials",
            "Lock on bedroom door",
            "24-hour check-in",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s167",
            "fullname": "Luana",
            "location": "Rio de Janeiro, Rio de Janeiro, Brazil",
            "about": "Carioca, profissional de marketing, maquiadora e que ama viajar, conhecer lugares, culturas e pessoas! ",
            "responseTime": "a few days or more",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/ef5a70f4-27ad-4377-b5c6-90483ed8ac91.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/ef5a70f4-27ad-4377-b5c6-90483ed8ac91.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "3026612",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s136",
        "title": "18C.  NICE AND COZY 2 BEDROOMS. PERFECT LOCATION!",
        "price": 90,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.48415739248231,
            "lng": -73.56963720052265,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437349/thl7eoxar7dc7kpbahhj.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436578/y1fshh0nppk5nxbfzqoz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436864/ww1gixcmzwryfe1amps1.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436255/nmccht42mpd6erdeqjhi.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437061/xwqh3jtahjqxod0p1a0c.jpg"
        ],
        "summary": "NICE AND COZY APARTMENT WITH 2 BEDROOMS ON A TOP FLOOR. LOCATED ON ST-LAURENT BOULEVARD. WALKING DISTANCE TO MANY GOOD RESTAURANTS, BARS, SHOPPING AND OTHER SERVICES.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Lockbox",
            "Hot water"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s169",
            "fullname": "Simple Stay",
            "location": "Montreal, Quebec, Canada",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/a4a32ba2-8d89-474a-adab-2c39c1bc0adb.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/a4a32ba2-8d89-474a-adab-2c39c1bc0adb.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "9998124",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s137",
        "title": "Ipanema: moderno apê 2BR + garagem",
        "price": 298,
        "loc": {
            "country": "Brazil",
            "city": "Rio De Janeiro",
            "lat": -22.899796542581793,
            "lng": -43.17648192946671,
            "address": "Rio De Janeiro, Brazil"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436406/id1oo8krwgxvdf9s02qp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436961/rj6eo6v6npy65bckaxvr.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437040/oarfkdxx7gyyvcynvwko.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436933/ysvap4wzv8ziwtpbznf8.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437272/e2id7kpaglrrdug3i6if.jpg"
        ],
        "summary": "Moderno apartamento de 2 quartos com garagem em bucólica rua de Ipanema, a poucos metros da Lagoa Rodrigo de Freitas.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Smoking allowed",
            "Doorman",
            "Elevator",
            "Buzzer/wireless intercom",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s171",
            "fullname": "Barbara",
            "location": "Rio de Janeiro, State of Rio de Janeiro, Brazil",
            "about": "My name is Barbara.\r\nI'm an administrator and real state manager. I study photography.\r\nI've always enjoyed showing Rio around and helping people take the most out of the city.\r\nIt has been seven years I share my love for Rio renting apartments for short period and helping my guests with hints on tourist spots.\r\nI love cooking and It will be a pleasure to be able to help with information about restaurants, bars and gastronomy in general.\r\nI love to make new friends and to know different cultures.\r\nMy husband Ricardo is  a chemical engeneer, a great companion, but not talkative as I'm.\r\nOur daughter Alice is 8 years-old. She is into dancing classical ballet, jazz and loves to exchange experiences with people in general.\r\nI look foward to having you at my place!\r\n\r\nSeja bem vindo (a)! Meu nome é Bárbara, sou administradora de empresas e estudante de fotografia.\r\nHá 7 anos eu compartilho o amor pela cidade do Rio de Janeiro alugando apartamentos por temporada e ajudando meus hóspedes com dicas sobre a cidade e pontos turísticos.\r\nUma das minhas paixões é cozinhar e será um prazer poder compartilhar dicas sobre restaurantes, bares e gastronomia em geral.\r\nAdoro viajar, fazer novos amigos e conhecer diferentes culturas.\r\nSe você ficar na minha casa também vai conhecer o meu marido Ricardo, que é engenheiro químico e meu grande parceiro na hospedagem, gente boa, mas não tão falante como eu. Nossa filha Alice tem 8 anos, dança ballet e jazz e  também adora conhecer novas pessoas e trocar experiências.\r\nTambém tenho apartamentos inteiros no Centro, Lapa e Zona Sul da cidade.\r\nSeja bem vindo a um cantinho para chamar de seu. :)",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/users/2537111/profile_pic/1418360168/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/2537111/profile_pic/1418360168/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "2537111",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s138",
        "title": "Oceanfront & Breath Taking Views.",
        "price": 230,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.79898660790925,
            "lng": -156.31782093343097,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436797/hzfu8ihyoecadrermn14.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436886/cvc2yfmhfg9dabfkyiqw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436772/nplkpwclhrdvvspkpmbg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437168/vbmfmdmwrxt7xfwbsw7c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436912/xle8ueqxjeazbs4bp09p.jpg"
        ],
        "summary": "A spectacular oceanfront ground level condo. 10 feet away from the ocean.  Enjoy an unobstructed 180% Amazing Ocean Views, of Molokai & Lanai Islands with awesome sunsets & whale watching in season while sipping your favorite wine from your living room or lanai. Explore & swim  2 reefs just outside your lanai. You have got it all from this renovated private unit. Your backyard is the ocean. In walking distance to town, children friendly, protected by 2 reefs. FREE parking 12 steps to front door.",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Free street parking",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Lockbox",
            "Private entrance",
            "Bathtub",
            "High chair",
            "Stair gates",
            "Children’s books and toys",
            "Window guards",
            "Pack ’n Play/travel crib",
            "Room-darkening shades",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "BBQ grill",
            "Patio or balcony",
            "Garden or backyard",
            "Beach essentials",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Step-free access",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Step-free access",
            "Wide clearance to bed",
            "Step-free access",
            "Bathtub with bath chair",
            "Step-free access",
            "Waterfront",
            "Beachfront"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s173",
            "fullname": "Francesco",
            "location": "Rancho Palos Verdes, California, United States",
            "about": "I was born on the island of Ischia, Capri, Italy. Maui is my dream come true second home. Staying close to the ocean and enjoying the beaches and lush grounds makes life great.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/f1457fda-ca3a-427b-9fd2-8c864d35d156.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/f1457fda-ca3a-427b-9fd2-8c864d35d156.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "104714699",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s139",
        "title": "East Village Sanctuary",
        "price": 200,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.69934315214819,
            "lng": -73.99587737026475,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436578/y1fshh0nppk5nxbfzqoz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437262/ifklqhihs1qinbmap5hd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437250/o8uutj3t2bvfafvxkr9j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436562/aflmntpgocp5l2zxikhl.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436301/etz0n0umubahfkgmmwt8.jpg"
        ],
        "summary": "Walking distance to NYU. Large one bedroom with full kitchen and living room. In the hustle and bustle of the east village night, hide away in this green oasis to recharge and reset. Right next to the L, 4, 5, 6, N,R, W and F lines this apartment is the perfect central location for anywhere you want to go in NYC as well as just walking a block or two for a cheap amazing meal.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Heating",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Long term stays allowed",
            "Other"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s175",
            "fullname": "Molly",
            "location": "New York, New York, United States",
            "about": "I love a good adventure.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/92528d0c-6ec8-4e6c-81a7-75fad07c511d.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/92528d0c-6ec8-4e6c-81a7-75fad07c511d.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "57107571",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s140",
        "title": "2017 , férias no Rio",
        "price": 250,
        "loc": {
            "country": "Brazil",
            "city": "Rio De Janeiro",
            "lat": -22.909593911416504,
            "lng": -43.16013443593933,
            "address": "Rio De Janeiro, Brazil"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436281/doubvhbpwjfx81yfzpxq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437045/dmquvficldi8ssfdlrrx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436942/cfa0wa2uwfyunrhgp4mt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436460/qi3vkpts37b4k0dedosc.jpg"
        ],
        "summary": "Casa com excelente espaço, localizada no meio da natureza, próximo ao um dos acessos do Parque Estadual da Pedra Branca, que conta com cachoeiras e trilhas na Mata Atlântica e a 10 minutos de carro ou 35 minutos a pé do Parque Olímpico (3.5km) e 3 minutos de carro ou 12 minutos a pé da Vila Olímpica. A casa pricipal conta com 2 quartos com suíte, 2 salas, cozinha, 1 banheiro social e área de serviço.Também contamos com um anexo com 1 quarto com suíte. Os quartos poderão ser compartilhados!",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Dog(s)",
            "Family/kid friendly",
            "Washer",
            "Hangers",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s177",
            "fullname": "Maria Alice",
            "location": "Rio de Janeiro, State of Rio de Janeiro, Brazil",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/5b44ea07-3550-47af-9b68-8c1be2f4d18c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/5b44ea07-3550-47af-9b68-8c1be2f4d18c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "66720687",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s141",
        "title": "One bdrm apt in Central/Sheung Wan next to Soho",
        "price": 416,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.326449080763922,
            "lng": 114.16342731051122,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436287/my8eunlgiiflc2ohslgx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437287/mns2lapesdourab6dn7u.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436787/gcz7mgmxb6dcl4vz6h0a.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436456/aazeb5pemja3ddxauatd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436772/nplkpwclhrdvvspkpmbg.jpg"
        ],
        "summary": "Located between Hollywood and Caine Road, just down from Soho bars/restaurants and not far from Wyndham St. and LKF nightlife. 5 minute walk to the escalator. Good for travelling couples, solo adventurers, and business travellers.",
        "maxGuests": 2,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Doorman",
            "Elevator",
            "Buzzer/wireless intercom",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Other"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s179",
            "fullname": "Daniel",
            "location": "Hong Kong",
            "about": "Hello, I'm originally from the LA area but have been back in Hong Kong for about 6 years. I also spent some time on the east coast of the U.S. in the Washington, D.C. area. I teach middle school math at an international school here in Hong Kong and have enjoyed the lifestyle of living and working in this vibrant city. \r\n\r\nHong Kong has always had plenty of options to stay active. I've played in an expat softball league here for many years and still try to get out as much as I can. When I first arrived, I did a few of the popular hikes, but not so much anymore unfortunately. There are still some places in Hong Kong that I would like to explore and I also find the city to be a great hub for travelling throughout southeast Asia. \r\n\r\nI'm new to Airbnb and open to suggestions on making your stay in Hong Kong an enjoyable experience. Nice to meet you!",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/a8b75580-b8d5-4a7e-bc36-420941c37ec4.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/a8b75580-b8d5-4a7e-bc36-420941c37ec4.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "37153965",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s142",
        "title": "Center of Istanbul, comfortable for family house",
        "price": 200,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.023519000450634,
            "lng": 28.990398769033362,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436978/mhqf1tttzqr33ecrrwb2.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437344/r4w6s3af55tdt5y1lrcc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436390/om97cgufeacwlric2r5w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437021/cw6mtrxza5fzmmgxen4j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436394/kscsvxyn0uro9tjhefeb.jpg"
        ],
        "summary": "This house is very special house. The area is amazing. Personally I live here. So this house is not a commercial house. I love the area of this house. It is really really in the center of Istanbul. The house is like 100m2 but I will lock one room for my personal belongings.",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Smoking allowed",
            "Breakfast",
            "Heating",
            "Family/kid friendly",
            "Dryer",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Luggage dropoff allowed",
            "Well-lit path to entrance",
            "Step-free access",
            "Wide clearance to bed",
            "Accessible-height bed",
            "Step-free access",
            "Step-free access",
            "Handheld shower head",
            "Fixed grab bars for toilet"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s181",
            "fullname": "Erdem",
            "location": "Istanbul, Turkey",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/56b1af83-c006-4845-8c33-fe0a8d4c2b52.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/56b1af83-c006-4845-8c33-fe0a8d4c2b52.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "15863875",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s143",
        "title": "Spacious 3bdrm. Artsy and Perfect Location!",
        "price": 1146,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.322407626792817,
            "lng": 114.15400220309002,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436306/be2v9wssznxs4hebudb4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436582/vv0y7twjl7zcj9g71sjf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436539/jy85me6y4bcsgfjvytwv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436837/fyczvvyuelceouxja8yy.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436372/d32ktdsaqfoiogz5dpvf.jpg"
        ],
        "summary": "Welcome to stay in my 3bed apartment. Its a rare gem in HK,  as its Huge compared to other Hk apts! Perfect for a few friends sharing or a family. Walk everywhere in Central in  few min. Soho, Escalator, Hollywood road, MTR. It’s walk up building! please check my profile, I have many reviews :)",
        "maxGuests": 5,
        "bedRooms": 3,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Heating",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s183",
            "fullname": "Melanie",
            "location": "Seattle, Washington, United States",
            "about": "Raised in the west, I decided to travel and work abroad for a few years. Working and backpacking away from home has helped me gain so much experience and insight from living away from home, I think everyone should try it! \r\n\r\nI love hosting! And I put my heart into it and always think about how I can make my place enjoyable and comfy.\r\nif you have any feedback I'd love to hear and learn how to grow from it.\r\n\r\nI can speak English and hope to make your stay as pleasant as possible :) We can definitely give you suggestions for eating, shopping, art and museums and also night life. Just ask!",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/5db18be8-88b0-40d8-9960-46275d99ac3b.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/5db18be8-88b0-40d8-9960-46275d99ac3b.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "930612",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s144",
        "title": "Ocean View Hawaiian Bungalow on a private ranch",
        "price": 469,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.797528421374984,
            "lng": -156.3363326055403,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437221/wczn7rdpbtjbcvgspakp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436281/doubvhbpwjfx81yfzpxq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436852/y3scgbn8d6evumdpwdp4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437009/zuu2udtrkcs6sxjiym40.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436912/xle8ueqxjeazbs4bp09p.jpg"
        ],
        "summary": "Miles Away is a plantation era bungalow that we lovingly restored to host visiting guests from all around the world. The ranch has 4 cottages available. Each are very private and separated.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Dog(s)",
            "Cat(s)",
            "Other pet(s)",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Keypad",
            "High chair",
            "Crib",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "BBQ grill",
            "Patio or balcony",
            "Garden or backyard",
            "Beach essentials",
            "Luggage dropoff allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s185",
            "fullname": "Christie",
            "location": "Hawi, HI & Santa Monica Ca United States",
            "about": "I'm the creator of Puakea Ranch in Hawi, HI.  We purchased the ranch in 2006 and restored all the historic homes and brought the property back to life. Now people can enjoy a more authentic and unique Hawaiian vacation. My vision was to create a relaxing, comfortable & eco friendly environment in this rugged Hawaiian landscape.  We are a great fit for adventurous travelers who also appreciate life's little luxires, like pressed sheets, sharp knives and farm fresh eggs. ",
            "responseTime": "within a day",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/e3f52405-c67a-4bf4-a8aa-555e8889cf66.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/e3f52405-c67a-4bf4-a8aa-555e8889cf66.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "4967433",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s145",
        "title": "Nuevo espacioso apartamento en BCN",
        "price": 320,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.394806129752226,
            "lng": 2.1553472729428513,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437045/dmquvficldi8ssfdlrrx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436902/cidqzea6jlj827teokyg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436975/hx9ravtjop3uqv4giupt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436397/nde7l2hrwezdfzbvhczj.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436372/d32ktdsaqfoiogz5dpvf.jpg"
        ],
        "summary": "If you like to stay in a beautiful local area but still close to all the tourist attractions we have a place for you. Spacious and renovated three bedrooms Apartment in the magnificent district of Barcelona, with a capacity of a group up to 8 people.",
        "maxGuests": 8,
        "bedRooms": 3,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Air conditioning",
            "Wheelchair accessible",
            "Kitchen",
            "Doorman",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s187",
            "fullname": "Dimitry",
            "location": "Barcelona, Cataluña, Spain",
            "about": "PROVENZA MBS, a  small company managing an apartment building at nice centric neighborhood one block away from central hospital, a polytechnic university and a Ninot Market. Centric but safe surroundings.",
            "responseTime": "within a day",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/cd951be5-6cf9-4978-bbb6-6a07aad43e3d.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/cd951be5-6cf9-4978-bbb6-6a07aad43e3d.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "2201772",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s146",
        "title": "Modern Beachside Apartment with Balcony",
        "price": 90,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.39717205844393,
            "lng": 2.175109788875837,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436385/sorbz7rdtxacu1ds9vel.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436556/mb70fifvvpvde8jub5cg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436942/cfa0wa2uwfyunrhgp4mt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436928/ouvft4oeavr7ceeha4gk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436933/ysvap4wzv8ziwtpbznf8.jpg"
        ],
        "summary": "Wind down in an elegant designer apartment just steps from the beach. Indulge in the laid back lifestyle of this space featuring thoughtfully curated furnishings and decor, soothing earth tones throughout, and a private balcony.",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Elevator",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Pack ’n Play/travel crib",
            "Body soap",
            "Bath towel",
            "Toilet paper",
            "Bed linens",
            "Extra pillows and blankets",
            "Coffee maker",
            "Dishwasher",
            "Oven",
            "Smart TV",
            "DVD player",
            "Beach view",
            "Rain shower",
            "Terrace",
            "Balcony",
            "Sound system",
            "Breakfast table",
            "Espresso machine",
            "Double oven",
            "Murphy bed",
            "Bedroom comforts",
            "Bathroom essentials"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s189",
            "fullname": "David",
            "location": "Barcelona, Catalonia, Spain",
            "about": "I was born in Barcelona, and love my city and Catalonia.\r\nI have a background in Security and HSE, and as hobbies, I like cinema, computers, electronics and sports, and above all meeting people from all around the world and showing them my hospitality!\r\nI have been hosting guests for years at Tripadvisor, and probably I am number one in reviews in Barcelona!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/c043af77-03fa-417a-9a0d-ed8697336ef5.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/c043af77-03fa-417a-9a0d-ed8697336ef5.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "50345502",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s147",
        "title": "Clean, comfortable and convenient",
        "price": 1099,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.322638004509642,
            "lng": 114.1588943769957,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436236/ctnbnqazpqhotjcauqwp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436204/wzbrvr4mcsuub6gvwbry.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437344/r4w6s3af55tdt5y1lrcc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437021/cw6mtrxza5fzmmgxen4j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436823/af6elioxovkhvp6cg1un.jpg"
        ],
        "summary": "Great apartment centrally located within 5 mins walking distance to Causeway Bay and Tin Hau MTR's.  Times Square, SOGO Dept store and various other shops within walking distance. Lots of restaurants to choose from in the area.",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Kitchen",
            "Doorman",
            "Elevator",
            "Heating",
            "Washer",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s191",
            "fullname": "Dominique",
            "location": "Hong Kong",
            "about": "I am a 33 year old Australian expat living with another 31 year old female. Have lived in Hong Kong for 13 years. As we are both teachers, we usually travel during the school holidays therefore will be renting our flat during these times. ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/1a5f6a5e-6bf2-458d-8772-9c7e0cc75d49.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/1a5f6a5e-6bf2-458d-8772-9c7e0cc75d49.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "26586136",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s148",
        "title": "Beautiful 1 Bedroom Apartment",
        "price": 997,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.322446813596827,
            "lng": 114.17966421258875,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436236/ctnbnqazpqhotjcauqwp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436219/yida7pxwpup9rtgnguhv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437301/af9yuihshv3wh24bu07u.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437250/o8uutj3t2bvfafvxkr9j.jpg"
        ],
        "summary": "This one bedroom apartment in Sheung Wan/Central is the perfect hideaway for a young couple or single person looking to explore everything that Hong Kong has to offer.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Buzzer/wireless intercom",
            "Washer",
            "Essentials",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s193",
            "fullname": "Mai-Britt",
            "location": "Hong Kong",
            "about": "Hong Kong is a beautiful city, so vibrant and diverse. I have been living in Hong Kong since 2010. I enjoy traveling and use my personal experience to point you to fantastic restaurants, exciting cafes and bars, the best shopping areas and of course to the local grocer and great supermarkets.",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/22a8b8ef-e551-4341-b5a4-abf0b3e51ff6.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/22a8b8ef-e551-4341-b5a4-abf0b3e51ff6.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "36481278",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s149",
        "title": "PORTO DOWNTOWN FLATS-RIBEIRA STUDIO",
        "price": 55,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.16893538772054,
            "lng": -8.631439014743593,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437002/rfon5llzyvk94eilgk5r.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436562/aflmntpgocp5l2zxikhl.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437336/u9ttr09gqo3hmfumwdww.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436460/qi3vkpts37b4k0dedosc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436306/be2v9wssznxs4hebudb4.jpg"
        ],
        "summary": "Porto Downtown Flats RIBEIRA STUDIO is a newly remodelled apartment, located in the most beautiful area of Porto. It is situated in Rua São Joao, in the old Ribeira of Porto, an area classified as World´s heritage. Fully equiped kitchen and wi-fi.",
        "maxGuests": 4,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Kitchen",
            "Paid parking off premises",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "High chair",
            "Pack ’n Play/travel crib",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Stove",
            "Long term stays allowed",
            "Step-free access",
            "Wide doorway",
            "Step-free access",
            "Wide doorway",
            "Wide clearance to bed",
            "Accessible-height bed",
            "Step-free access",
            "Wide doorway",
            "Accessible-height toilet",
            "Host greets you",
            "Paid parking on premises"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s195",
            "fullname": "Tim",
            "location": "Porto, Porto District, Portugal",
            "about": "I´M EAGER TO BE YOUR HOST\r\nANSIOSO POR SER O SEU ANFITRIÃO",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/7acb937f-b6b3-41ae-966d-2e3052e1f55f.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/7acb937f-b6b3-41ae-966d-2e3052e1f55f.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "35484736",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s150",
        "title": "Large well-lit & quiet room in the Plateau",
        "price": 35,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.515617058202245,
            "lng": -73.57555913288323,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436481/tqwkxtbalipudzhivoag.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436301/etz0n0umubahfkgmmwt8.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437006/kcsenznwf3pnka6hjwoh.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437013/gz1hfzv47xzfwcmosadc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436556/mb70fifvvpvde8jub5cg.jpg"
        ],
        "summary": "Fully furnished.  The room has lots of natural light through the day New windows = great insulation from the cold Meshed windows = almost no bugs Each room has its own heating The kitchen has its own balcony and fire exit Anything you need, please don't hesitate to ask!",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Pets allowed",
            "Free street parking",
            "Heating",
            "Family/kid friendly",
            "Suitable for events",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Bed linens",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "Patio or balcony",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Well-lit path to entrance",
            "Step-free access",
            "Wide clearance to bed",
            "Accessible-height bed",
            "Firm mattress",
            "Host greets you",
            "Paid parking on premises"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s197",
            "fullname": "Yannick",
            "location": "Montreal, Quebec, Canada",
            "about": "Hello, my housemate Naomi and I are looking forward to hosting you! Montreal has been our home for atleast few years now so we know Montreal very well to be able to give you insider suggestions ;).We can communicate in French, English, German, Hindi. We love to travel and move around ourselves, and understand your needs as a visitor. Search for us on Face book and Couchsurfing if you would like to know more. We are involved in Science, Psychology, Engineering and Entrepreneurship and are familiar with different types of dance, martial arts, sports, and music. We are easygoing although we like being active, and can easily find a way to relate to you!  If you need anything at all, please don't hesitate to let us know during your stay, and we'd be happy to provide it.",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/ec80f2bb-ced3-4f60-8cb0-952bf00f0b21.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/ec80f2bb-ced3-4f60-8cb0-952bf00f0b21.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "8579366",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s151",
        "title": "Luxury 1-Bdrm in Downtown Brooklyn",
        "price": 144,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.70786348277599,
            "lng": -74.01032240218598,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436827/znh7gqzbwb4wm6bdziy7.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436550/mqmwpqdel4nxrmogeawh.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436837/fyczvvyuelceouxja8yy.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436998/atpmgujjvdqnlfwfrntf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437327/epcnh2tzpafwmvi3srcp.jpg"
        ],
        "summary": "A perfect blend of one of BKLYN's hippest areas with a new, high-rise apartment building. You'll be hard pressed to find a corner unit like this closer the the City. Almost 800 sf of living space with luxury amenities & modern but comfy furnishings.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Kitchen",
            "Doorman",
            "Gym",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s199",
            "fullname": "Ashley",
            "location": "New York, New York, United States",
            "about": "I'm an executive at a wellness company in New York City. Educated in Fashion at Parsons, I'm into fitness and nutrition. I've lived in the city since enrolling at Parsons in the late 90s.\r\n\r\nIf you're looking for restaurant reservations, boutique fitness studios, or things to do in the city, then just let me know what you're interested in. I'd love to offer some suggestions and help you have a wonderful stay in New York City.",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/afca1b34-30e9-43c0-969b-7b9cf913cb8d.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/afca1b34-30e9-43c0-969b-7b9cf913cb8d.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "10099253",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s152",
        "title": "Modern West Kowloon Based Apartment",
        "price": 502,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.307983463706975,
            "lng": 114.15658913595523,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436787/gcz7mgmxb6dcl4vz6h0a.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436266/num9wnb6uzdsvqr6nyuu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436876/bskkmribzul6cjzbprvi.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436315/nyglbkkyaednuygn6eik.jpg"
        ],
        "summary": "single bedroom available for rent. Good for people on business or have lay overs in Hong Kong or family holidays Safe, Convenient, Accessible, Cosy apartment.  This apartment is located in west Kowloon Tai Kok Tsui Area. it is very easy to access the MTR (Train) stations and get to Hong Kong Island or the new territories, also great to relax in doors. can provide a list of help items if required.",
        "maxGuests": 1,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Doorman",
            "Gym",
            "Elevator",
            "Buzzer/wireless intercom",
            "Family/kid friendly",
            "Smoke detector",
            "Essentials",
            "24-hour check-in",
            "Iron",
            "Hot water",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s201",
            "fullname": "Govinda",
            "location": "Hong Kong",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/5bbd9579-1d7c-4f95-9f3b-85d24b159ce6.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/5bbd9579-1d7c-4f95-9f3b-85d24b159ce6.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "70727802",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s153",
        "title": "Vista magnifica mar,lagoa,montanha.",
        "price": 209,
        "loc": {
            "country": "Brazil",
            "city": "Rio De Janeiro",
            "lat": -22.914508590018595,
            "lng": -43.186170715111025,
            "address": "Rio De Janeiro, Brazil"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436359/abuiyexl2xyemq8uon4s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437040/oarfkdxx7gyyvcynvwko.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436801/mcuu1w2188ndpd6hezzt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436310/acidri8oahpcoxa0idns.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437330/mmhkmfvg8o3freucyekc.jpg"
        ],
        "summary": "Sol da manhã,andar alto, aconchegante,cheio de charme , perto aos eventos Rio 2016 e shoppings como Barra Shopping, New York e casas de show. Rodoviaria BRT.Metrô direto para Copacabana.Onibus na porta para Zona Sul.Predio com total seguranca.",
        "maxGuests": 4,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Doorman",
            "Gym",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Fire extinguisher",
            "Essentials",
            "Hangers",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s203",
            "fullname": "Ana Cristina",
            "location": "Rio de Janeiro, State of Rio de Janeiro, Brazil",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/8828e6c0-5224-462d-90b4-042daf56464c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/8828e6c0-5224-462d-90b4-042daf56464c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "63618115",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s154",
        "title": "Elegance and Peace in Potts Point",
        "price": 125,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.8576297591817,
            "lng": 151.2230340554179,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436496/ihozxprafjzuhil9qhh4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436559/sbtoepvxxobkogznuiw4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437339/qgs3hrnx0accbjkzuh9s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436266/num9wnb6uzdsvqr6nyuu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436600/rt3ldgx1xfqct3961yjz.jpg"
        ],
        "summary": "My beautifully renovated Art Deco studio apartment is in the heart of Kings Cross, yet so peaceful and quiet. New bathroom and modern kitchen, in the Art Deco tradition, are stunning to be in. A Sleeping Duck queen bed which is absolutely fabulous, 4G unlimited wifi, high quality washer/dryer and dishwasher. Fully self contained!",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Kitchen",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Stove",
            "Long term stays allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s205",
            "fullname": "Mariana",
            "location": "Elizabeth Bay, New South Wales, Australia",
            "about": "I love Sydney and all her natural beauty.  I immigrated here many years ago and still get excited every time I step out the door. I know this city well and can help you with information and tips. Bird watching and snorkelling are high on my list of things to do. I also love hosting people and making sure they feel at home in my home. Mi casa es su casa.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/4a760ed0-9e9f-4122-9b4a-85dff1f7bdb6.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/4a760ed0-9e9f-4122-9b4a-85dff1f7bdb6.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "14073279",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s155",
        "title": "Unit 414 Luxurious Top Floor Condo Great Views",
        "price": 385,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.80110375812543,
            "lng": -156.3374278861903,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436912/xle8ueqxjeazbs4bp09p.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436872/i3jblqgpdttpwvshbffo.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436338/oifgxuovghbgnabppike.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436922/ytr7znhbuqnxnotutplv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436893/pkhxv5j90ubdzbpgdbdb.jpg"
        ],
        "summary": "If you prefer high-end living, this condo is for you!  It is fully renovated and gorgeous with amazing ocean and courtyard views!   Kana'i A Nalu is a quiet resort on the ocean front away from the road.  This complex sits  on a 3-mile stretch of white sand beach that spans almost the entire Ma'alaea Bay. Wonderful for romantic sunset strolls or for a beach run.   This property is located less than a mile walking distance to Ma'alaea Harbor and centrally located between South and North Maui.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Elevator",
            "Free street parking",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Lockbox",
            "Babysitter recommendations",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "BBQ grill",
            "Patio or balcony",
            "Garden or backyard",
            "Beach essentials",
            "Long term stays allowed",
            "Step-free access",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Disabled parking spot",
            "Step-free access",
            "Step-free access",
            "Step-free access"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s207",
            "fullname": "Kathy",
            "location": "Hawaii, United States",
            "about": "I am the owner of Maui Vision Rental. Maui Vision became a reality and a business starting with my personal condo at the Kihei Akahi Resort C618.\r\n\r\nMaui Vision is a business I love because I get to share the Aloha Spirit, the beauty of the land, and talk story with people from around the world. It is nice to know that we can contribute to someone’s Hawaiian vacation experience in a positive way. We love to hear back from our happy guests.\r\n\r\nI used to live on the island of Oahu with my US Navy family when I was young.  We later moved to Southern California.  I knew one day I would return to Hawaii, the place I fell in love with long ago. I took a leap of faith and purchased my Maui condo June 2002 this was the beginning of fulfilling her prophecy to once again return to Hawaii soil.\r\n\r\nI am a tropical expression artist who paints on canvas and etched metal.  My work is inspired by the beauty of the islands and has been displayed in several Maui art galleries over the years.  I am a writer and have my first book on Amazon.  I recently took up hula dancing and love to immerse myself in the culture and grace of this island.\r\n\r\nI have over 25 years of business administration and customer service experience working for large corporations and high tech startups.\r\n\r\nIf you are in need of a caring Realtor here on Maui, please contact Kathy McCartney RS#77317 of La Costa Realty Hawai’i, LLC Brokerage Lic #18349 .",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/ddcc4146-9abc-4f4d-b347-8f30deb10f6c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/ddcc4146-9abc-4f4d-b347-8f30deb10f6c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "733802",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s156",
        "title": "1 sunny bedroom in large St-Henri appartment",
        "price": 70,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.512779795953755,
            "lng": -73.57275424819791,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436562/aflmntpgocp5l2zxikhl.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437168/vbmfmdmwrxt7xfwbsw7c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436912/xle8ueqxjeazbs4bp09p.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436410/shdfxkcohvm8beh5rkar.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436533/lw91nt07jhq6khiacu2d.jpg"
        ],
        "summary": "The apartment  is located in the  up and coming neighbourhood St. Henri. Close to new hip cafés and restaurants, as well as Canal Lachine and metro station. The apartment is very spacious, with two closed bedrooms and a shared backyard.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Pets live on this property",
            "Dog(s)",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s209",
            "fullname": "Kim-Sanh",
            "location": "Montreal, Quebec, Canada",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/users/9018452/profile_pic/1404735233/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/9018452/profile_pic/1404735233/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "9018452",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s157",
        "title": "Downtown Exposed Brick Studio",
        "price": 90,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.49415661290998,
            "lng": -73.58068005790433,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436942/cfa0wa2uwfyunrhgp4mt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436975/hx9ravtjop3uqv4giupt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436902/cidqzea6jlj827teokyg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436855/khyvb5q3yzcqaoscuppz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436368/noebywqae4x0u42srsv3.jpg"
        ],
        "summary": "Amazing loft style apartment in the heart of the action  in downtown Montréal with a private patio and shared backyard. Come stay on the doorstep of some of Montréal's top restaurants with all of the top attractions within a hop a skip and a jump.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Bed linens",
            "Microwave",
            "Coffee maker",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Patio or balcony"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s211",
            "fullname": "Tyler",
            "location": "Montreal, Quebec, Canada",
            "about": "Once someone described me as \"without guile\". Best compliment I've ever received. \r\n\r\nI'm a native Vancouverite and a current Montréalais. Je suis à l'aise dans les langues de Molière et de Shakespeare. I'm pretty easy going, and like most everyone I love a beer on a hot day. ",
            "thumbnailUrl": "https://a0.muscache.com/im/users/28702061/profile_pic/1437949646/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/28702061/profile_pic/1437949646/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "28702061",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s158",
        "title": "BEACH ESCAPE",
        "price": 689,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.877072194932516,
            "lng": 151.2047813169409,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436271/mqf7uxzlufmjc77jpl5k.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436481/tqwkxtbalipudzhivoag.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437049/gpanmdffbwd9crhnzswa.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437053/cg3bpdujvsd9lswwpfgy.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436902/cidqzea6jlj827teokyg.jpg"
        ],
        "summary": "Summer is here enjoy the beach on your door step, work on that tan or simply unwind .Perfect for Winter getaways also enjoy a nice glass of wine by the open fire, or Perhaps a soak in the spa overlooking Pittwater. Located on the beach, you'll feel like your miles away from anywhere a tranquil setting for any holiday.  Drift off to sleep with the sound of the waves lapping up on the beach.  The House is spilt over 4 levels with a lounge room on each level , lots of space for adults & children.",
        "maxGuests": 14,
        "bedRooms": 7,
        "beds": 1,
        "baths": 4,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Pets allowed",
            "Elevator",
            "Free street parking",
            "Hot tub",
            "Indoor fireplace",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Lockbox",
            "Children’s books and toys",
            "Hot water",
            "Long term stays allowed",
            "Full kitchen"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s213",
            "fullname": "Bailey",
            "location": "Mosman, New South Wales, Australia",
            "about": "I Like to make sure that all guests are comfortable and can get the most out of what Sydney and the northern Beaches has to offer.\r\n\r\nLove the finer things in life , the best of the best.\r\n\r\nMy motto is try to be the best person you can and look after one another\r\n \"Life's too short\"",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/users/5167360/profile_pic/1361423030/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/5167360/profile_pic/1361423030/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "5167360",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s159",
        "title": "LUXURY! 3BR ,Bathtub, 1min MTR 4-9ppl",
        "price": 1350,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.321401978927568,
            "lng": 114.17417787563065,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436975/hx9ravtjop3uqv4giupt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436804/m7h5fpqvy5ctvkysvg6o.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436410/shdfxkcohvm8beh5rkar.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436952/aef9ajipinpjhkley1e3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436525/wdod0zfzsipkigajueda.jpg"
        ],
        "summary": "NEWLY (JULY 2016) and LUXURY Bathtub apartment with 3-Bedrooms and Kitchen in the very center of HK.  It fit 4-9 people and is centrally located close to Causeway Bay MTR (1 min by walk) and Airport Bus A11 (1 min by walk) **We have also list other apartment.**    Contact us to know more :)",
        "maxGuests": 9,
        "bedRooms": 3,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Pets allowed",
            "Elevator",
            "Buzzer/wireless intercom",
            "Family/kid friendly",
            "Washer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Keypad",
            "Window guards",
            "Room-darkening shades",
            "Hot water",
            "Luggage dropoff allowed",
            "Long term stays allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s215",
            "fullname": "Wilson&Shan",
            "location": "Kowloon, Hong Kong",
            "about": "I LOVE HONG KONG. I LOVE traveling.:)",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/9c737756-ee4a-494f-9b35-03f8185d1a40.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/9c737756-ee4a-494f-9b35-03f8185d1a40.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "31255164",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s160",
        "title": "Cozy place in Hong Kong Island",
        "price": 1499,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.334900368896648,
            "lng": 114.16860474205022,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436481/tqwkxtbalipudzhivoag.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436797/hzfu8ihyoecadrermn14.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436306/be2v9wssznxs4hebudb4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436559/sbtoepvxxobkogznuiw4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436496/ihozxprafjzuhil9qhh4.jpg"
        ],
        "summary": "Great location near to Wan Chai and Admiralty MTR station. Walkable distance to many fabulous restaurants in town. Good for both business or leisure traveller.",
        "maxGuests": 3,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Elevator",
            "Family/kid friendly",
            "Washer",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Private living room",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Coffee maker",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Stove",
            "Luggage dropoff allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s217",
            "fullname": "Carmen",
            "location": "Hong Kong",
            "about": "Frequent traveler who likes to know more about the locals in addition to the sightseeing.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/b2420a9b-1ca6-41e0-bea8-37ecfae52a8f.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/b2420a9b-1ca6-41e0-bea8-37ecfae52a8f.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "32083388",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s161",
        "title": "Vacances de reve à Espinho (Porto)",
        "price": 45,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.157414047096864,
            "lng": -8.635615584714351,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436353/wqah1dfim6hcosaq0ve3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436550/mqmwpqdel4nxrmogeawh.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436793/httqod38otalkzp9kynq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436359/abuiyexl2xyemq8uon4s.jpg"
        ],
        "summary": "Amoureux du nord du Portugal, nous avons acheté cet appartement à Espinho, station balnéaire à 15 kms au sud de Porto (20 minutes en train). Idéalement situé, dans le quartier des Pêcheurs, à 250 m de l'océan (vue mer depuis le séjour) et à 5 minutes du coeur d'Espinho et des commerces.  La plage d'Espinho est un des 10 meilleurs spots de surf du Portugal.",
        "maxGuests": 6,
        "bedRooms": 3,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Pets allowed",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Bathtub",
            "High chair",
            "Children’s books and toys",
            "Babysitter recommendations",
            "Crib",
            "Pack ’n Play/travel crib",
            "Room-darkening shades",
            "Children’s dinnerware",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Beach essentials",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Beachfront"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s219",
            "fullname": "Marie",
            "location": "Saintes, Aquitaine-Limousin-Poitou-Charentes, France",
            "about": "Habitant en Charente Maritime, nous sommes tombés amoureux du nord du Portugal.\nNous souhaitons vous faire decouvrir ce magnifique pays.\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/dae4baaf-7e4b-4f18-9986-f12f9d203f51.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/dae4baaf-7e4b-4f18-9986-f12f9d203f51.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "69799996",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s162",
        "title": "The Porto Concierge - Beach Manor",
        "price": 100,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.14474548678962,
            "lng": -8.627520516259615,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436787/gcz7mgmxb6dcl4vz6h0a.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437327/epcnh2tzpafwmvi3srcp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436287/my8eunlgiiflc2ohslgx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436852/y3scgbn8d6evumdpwdp4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436582/vv0y7twjl7zcj9g71sjf.jpg"
        ],
        "summary": "Totally renovated and fully furnished apartment with sea view in vibrant Porto beach area. Lots of bars, restaurants and shops are just around the corner.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Elevator",
            "Heating",
            "Family/kid friendly",
            "Suitable for events",
            "Washer",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s221",
            "fullname": "Jorge",
            "location": "PT",
            "about": "The Porto Concierge ajuda os proprietários de imóveis que pretendem alugar as suas casas mas não têm a possibilidade de receber os seus convidados. Alugar uma casa é um trabalho árduo: garantir a sua limpeza e a manutenção da casa, receber os seus convidados quando chegam e estar disponível para eles durante a estadia. Se vive longe ou se simplesmente não tem tempo suficiente para fazer tudo isso, não se preocupe, nós podemos ajudar.",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/83f82964-b160-4150-a302-8538799c4e36.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/83f82964-b160-4150-a302-8538799c4e36.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "80649936",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s163",
        "title": "Peaceful Apartment near Casa da Música",
        "price": 35,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.15146473790804,
            "lng": -8.626792048849317,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436801/mcuu1w2188ndpd6hezzt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436310/acidri8oahpcoxa0idns.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436872/i3jblqgpdttpwvshbffo.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437241/wt0seud4ot4cmdrztdzz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437221/wczn7rdpbtjbcvgspakp.jpg"
        ],
        "summary": "Our apartment is in the city center and one of the noblest areas of Porto. It is next door (about 50m) to Casa da Música of architect Rem Koolhaas authorship where you can see building uniqueness as well as benefit from quality, diverse and constant programming . It is very close to public transport, shopping and access to and from the city. Despite being very well located and central it is extremely quiet and peaceful, ideal for vacation for two or for a some family days.",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Kitchen",
            "Elevator",
            "Buzzer/wireless intercom",
            "Family/kid friendly",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Stove",
            "Long term stays allowed",
            "Step-free access",
            "Wide clearance to bed",
            "Accessible-height bed",
            "Step-free access",
            "Step-free access",
            "Host greets you",
            "Paid parking on premises"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s223",
            "fullname": "Rita",
            "location": "Portugal",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/ed544183-8cf3-4f79-8b10-82bf2a060760.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/ed544183-8cf3-4f79-8b10-82bf2a060760.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "65709135",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s164",
        "title": "SUPERHOST-LARGE&CLEAN-Near Pierloti",
        "price": 74,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.01245214702712,
            "lng": 28.99068138334474,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436835/pose0fy4kkms4qkln2hg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437241/wt0seud4ot4cmdrztdzz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436266/num9wnb6uzdsvqr6nyuu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436368/noebywqae4x0u42srsv3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437233/q5ilz1oo9v4x8njmtjhl.jpg"
        ],
        "summary": "You will never forget this holiday. If you want really enjoyable holiday you should choose my home. At first read reviews and ask me all questions what you want to learn about Istanbul I'll help you all your travel. ADVANTAGES: 1-Safe place-metro-bus every 6 minutes 2-24 Hour help desk 3-Istanbulcard for transportation 4-Pick up from airport,taxi drivers cant cheat 5-Unlimited wifi, Big kitchen and living room for you 6-Breakfast, fruits, tea, coffee, deserts, nuts all free 7. Towels, shampoo",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Smoking allowed",
            "Pets allowed",
            "Breakfast",
            "Free street parking",
            "Heating",
            "Family/kid friendly",
            "Suitable for events",
            "Washer",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Private entrance",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s225",
            "fullname": "Kubilay",
            "location": "Istanbul, Turkey",
            "about": "I'm from İstanbul.I'm industrial engineer at Istanbul Technical University. I like meeting with new people from different countries so I believe that sharing my apartment with my guest is a good opportunity to know more people all around the world. I like travelling. (I visited Sevilla, Granada, Madrid, Barselona, Athens, Skopje, Sofia, Beograd, Budapest, Prag, Moscow, Krakow, Sarajevo, Chisinau, Lisbon, Napels, Amsterdam, Wienna, Milano, Foggia, Rome, Frenze, Venice, Thaossaloniki, Kavala, Thassos, Beirut, Lviv, Gent, Brussels)\r\nYou will never forget this holiday. If you want really enjoyable holiday you should choose my home. At first read my all reviews and ask me all questions what you want to learn about Istanbul and other things. I'll help you all your travel. ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/095a97c5-87d3-430c-b459-5476e9f663e3.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/095a97c5-87d3-430c-b459-5476e9f663e3.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "7902155",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s165",
        "title": "Charming and cozy condo Plateau Mt-Royal/ McGill",
        "price": 68,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.51572836637096,
            "lng": -73.56072910897643,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436578/y1fshh0nppk5nxbfzqoz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437336/u9ttr09gqo3hmfumwdww.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436912/xle8ueqxjeazbs4bp09p.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436804/m7h5fpqvy5ctvkysvg6o.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436266/num9wnb6uzdsvqr6nyuu.jpg"
        ],
        "summary": "Charming and cozy ground floor studio condo in Plateau Mont-Royal. Steps from McGill University (3 min) or trendy St-Laurent Street (5-7 min). Located right on Prince Arthur. Easy access to public transportation, groceries, restaurants, cafes, bars.",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s227",
            "fullname": "Tarek",
            "location": "Montreal, Quebec, Canada",
            "about": "Great food, that's what Montreal is all about!",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/3cb97f20-f6f8-4266-aeb4-14b616d481e2.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/3cb97f20-f6f8-4266-aeb4-14b616d481e2.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "27836110",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s166",
        "title": "Appartement lumineux , Terrasse privée sur le toît",
        "price": 38,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.50572293094985,
            "lng": -73.59076136709373,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437021/cw6mtrxza5fzmmgxen4j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436942/cfa0wa2uwfyunrhgp4mt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436525/wdod0zfzsipkigajueda.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436902/cidqzea6jlj827teokyg.jpg"
        ],
        "summary": "Notre logement est accessible en transport en commun via deux lignes de métro (orange et bleu),  du centre-ville de Montréal. Dans un quartier vivant, près de la plaza st-Hubert, du cinéma beaubien, du parc Molson, vous trouverez à proximité tout ce donc vous aurez besoin pour vous divertir et vous accommoder: pharmacie, épicerie, restaurent, bar, bixi, etc, et vous pourrez jouir des commodités offertes par notre logement et la ville de Montréal.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Free street parking",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Iron",
            "Laptop friendly workspace",
            "Bathtub",
            "Hot water",
            "Patio or balcony",
            "Long term stays allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s229",
            "fullname": "Jonathan",
            "location": "Montreal, Quebec, Canada",
            "about": "Painter, textile artist, costume designer, traveller, I love cooking, reading and yoga. I am also down to earth, social and respectful.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/2872199/profile_pic/1415930099/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/2872199/profile_pic/1415930099/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "2872199",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s167",
        "title": "Trendy Bright Loft in The Plateau",
        "price": 75,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.50479064852798,
            "lng": -73.5752240673044,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436952/aef9ajipinpjhkley1e3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437339/qgs3hrnx0accbjkzuh9s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436419/jg5q36rc5mpn23kavp6b.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436315/nyglbkkyaednuygn6eik.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436271/mqf7uxzlufmjc77jpl5k.jpg"
        ],
        "summary": "Discover daily local life in the Plateau, friendly neighbourhood, cafes, bars, old-style artisans, few steps from Parc La fountain, Mont Royal, Downtown area and subways. Enjoy Free WIFI and access to your own personal desktop. Artsy modern loft, sky light, large windows, two balconies, decorated with our personal art collection, vintage objects, designer furniture.",
        "maxGuests": 4,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Pets allowed",
            "Breakfast",
            "Heating",
            "Suitable for events",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Safety card",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Private entrance"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s231",
            "fullname": "Colvin",
            "location": "Montreal, Québec, Canada",
            "about": "Just a couple who loves traveling and seeing the world!",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/f7314f42-df2e-4162-a275-a0f99fa82ba9.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/f7314f42-df2e-4162-a275-a0f99fa82ba9.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "48341156",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s168",
        "title": "Bright, sunny quite room Bushwick",
        "price": 60,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.72197472756274,
            "lng": -73.99711614600231,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437330/mmhkmfvg8o3freucyekc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436837/fyczvvyuelceouxja8yy.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436414/trl4n8noogyun10qmds8.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436978/mhqf1tttzqr33ecrrwb2.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437040/oarfkdxx7gyyvcynvwko.jpg"
        ],
        "summary": "A bright, sunny quite room in the heart of bushwick/ridgewood border.  7 min walk form the Jefferson L train which brings you directly into the Manhattan in about 20 min including 14th St Union Square stop.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Pets allowed",
            "Heating",
            "Family/kid friendly",
            "Smoke detector",
            "Carbon monoxide detector",
            "Lock on bedroom door",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s233",
            "fullname": "Louise",
            "location": "New York, New York, United States",
            "about": "young responsible adult",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/16f75571-d106-4f3e-80e7-94c39fe61952.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/16f75571-d106-4f3e-80e7-94c39fe61952.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "10929225",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s169",
        "title": "SUİTE ROOM 2 or 3 people WİTH TERRACE",
        "price": 264,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 40.998013677827885,
            "lng": 28.967940759451327,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437333/iycoq0rywibijlncdqxh.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436556/mb70fifvvpvde8jub5cg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436533/lw91nt07jhq6khiacu2d.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437282/qy0p7yyaukasripzwc7w.jpg"
        ],
        "summary": "*BREAKFAST *Airconditioning *Flat Tv/ Satellite with thousand of world channels *Heating system  *Refrigarator *Bathroom with hair dryer *All linens and towels are provided  *No housekeeping fee *Nearby parking on Street Within 1-5 minutes walk: -Grocery, bakery and mini markets -Restaurants with Turkish and European Cousin -A Hamam (Turkish Bath), -Several banks,  -A pharmacy,  -A post office,  -Famous Kumkapi Fish Restaurants  -Beyazid Grand Bazaar -Supermarkets (BIM and ŞOK),",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Air conditioning",
            "Paid parking off premises",
            "Breakfast",
            "Heating",
            "Family/kid friendly",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Self check-in",
            "Building staff",
            "Hot water",
            "Luggage dropoff allowed",
            "Long term stays allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s235",
            "fullname": "Muro",
            "location": "Istanbul, Istanbul, Turkey",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/e8367d67-e067-416a-b53f-2a9894b76b37.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/e8367d67-e067-416a-b53f-2a9894b76b37.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "148393842",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s170",
        "title": "COMFORTABLE & COZY! MAUI BY DAY...RELAX AT NIGHT!!",
        "price": 110,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.780619450335998,
            "lng": -156.33354125637297,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437241/wt0seud4ot4cmdrztdzz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436823/af6elioxovkhvp6cg1un.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437282/qy0p7yyaukasripzwc7w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437308/p80ndulkcghpcfsnvjdo.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437301/af9yuihshv3wh24bu07u.jpg"
        ],
        "summary": "A charming studio apartment located in the Island Sands ocean front condominium complex!!! You will find everything you need to enhance your stay in our direct ocean front location with unique West Maui mountain views.   Our Premier condo offers a central Maui location for exploring Maui beaches, sights and beauty!  Then relax in a comfortable condo where you can Cuddle & Cozy up after soaking up glorious Maui sun filled activities.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Air conditioning",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Breakfast",
            "Elevator",
            "Free street parking",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Keypad",
            "Private entrance",
            "Room-darkening shades",
            "Hot water",
            "Long term stays allowed",
            "Other",
            "Waterfront",
            "Beachfront"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s237",
            "fullname": "Ralph",
            "location": "Kihei, Hawaii, United States",
            "about": "Ralph & his wife Nancy are former residents of Maalaea Village and are permanent Maui residents living in Kihei!  We live just 20 minutes drive from our condo which enhances communication and we welcome the chance to serve as your host!  We are active in the Maui community and support various community organizations.   We are active adults and enjoy the many outdoor activities that Maui offers...we relish the opportunity to be your host!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/fb5c0d62-a663-4ca0-810b-f014d8f5e680.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/fb5c0d62-a663-4ca0-810b-f014d8f5e680.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "38354021",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s171",
        "title": "Quaint Polynesian Style Cabin on a Working Farm",
        "price": 60,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.790064584382456,
            "lng": -156.34148579273415,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436525/wdod0zfzsipkigajueda.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436922/ytr7znhbuqnxnotutplv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436266/num9wnb6uzdsvqr6nyuu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436815/ou3m2jicqonj8yhxdshq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437339/qgs3hrnx0accbjkzuh9s.jpg"
        ],
        "summary": "This adorable cabin includes a cute bathroom complete with shower/toilet/vanity.  The walk-in closet is a nice touch to store away personals. There is a sitting area, the sleeping area, the outdoor kitchen and a shaded patio that serves as an outdoor living room.  Views of the ocean, the Hawi windfarm, Maui all set on a working farm just a short walk from downtown Hawi!  The décor is set in a Polynesian style, bright, cheerful, and peace filled.  Wifi enabled.  Created with Pure Aloha!",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Breakfast",
            "Pets live on this property",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Lock on bedroom door",
            "Hangers",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Private entrance"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s239",
            "fullname": "Rev. Les",
            "location": "Hawi, Hawaii, United States",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/3ffa517d-51f3-4573-b1be-72c0f63d64e2.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/3ffa517d-51f3-4573-b1be-72c0f63d64e2.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "94682212",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s172",
        "title": "Feel at home.. in a cosy and warm",
        "price": 74,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.01585519100833,
            "lng": 28.98478692196952,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436359/abuiyexl2xyemq8uon4s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436542/e96nrbkjz8mecvsbzukk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437355/fy46xsk3yd7xujzcs2uz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436419/jg5q36rc5mpn23kavp6b.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437025/haliwehueqfkmxo1tv7j.jpg"
        ],
        "summary": "My place is very close to public transportations. Bus stops, metrobus and subway is only five minutes walk. There are plenty of restaurans and a very big shopping mall including cinemas, theatre and amusement park. 7/24 open shops around...",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Kitchen",
            "Doorman",
            "Free street parking",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Safety card",
            "Essentials",
            "Shampoo",
            "Hair dryer",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Refrigerator",
            "Dishwasher",
            "Cooking basics",
            "Patio or balcony",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s241",
            "fullname": "Naz&Gulcin",
            "location": "istanbul",
            "about": "Hey!\r\n\r\nI'm Naz, a teacher living in istanbul trying to survive and enjoy at the same time :) I have been in istanbul for many years and i love sharing my ideas about the hidden parts of istanbul. As i like talking a lot, do not hesitate to ask anything.\r\nI share the flat with my sister. Either my sister or I will be meeting you. Both of us are generally described as very friendly and easy going people . Hope to meet you \r\n\r\n",
            "responseTime": "within a day",
            "thumbnailUrl": "https://a0.muscache.com/im/users/126480/profile_pic/1434312385/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/126480/profile_pic/1434312385/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "126480",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s173",
        "title": "SOOTHING WAVES WITH A 180* OCEAN VIEW",
        "price": 148,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.812254219994713,
            "lng": -156.32820366860406,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436957/ehhcyscwtvxw55mptkok.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437361/h7fdhfrwoo9jtcgwqzn7.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437168/vbmfmdmwrxt7xfwbsw7c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437021/cw6mtrxza5fzmmgxen4j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436456/aazeb5pemja3ddxauatd.jpg"
        ],
        "summary": "Valley Isle Resort 306  We are located beachfront with an amazing view  of the ocean and sunset. We can look right down into the water and watch the turtles swimming. We offer a full kitchen including poolside barbecue grills. Within a block of our Resort are several restaurants and bars. Our condo has a comfy queen-size wall bed along with a small sofa bed.   The ambiance is soothing and relaxing. Our place is good for couples, solo adventurers, and families (with one child).",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Elevator",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Keypad",
            "Private entrance",
            "Bathtub",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Disabled parking spot",
            "Step-free access",
            "Beachfront",
            "Fixed grab bars for shower"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s243",
            "fullname": "Sherry",
            "location": "Lake Havasu City, Arizona, United States",
            "about": "I am currently a 6th grade math teacher and competitive baton twirling coach.  I fell in love with Maui and the Valley Isle Resort over 7 years ago.  I have an amazing husband, 2 daughters with great husbands, and 3 grandchildren.  I have a love for the island and the culture of Hawaii!\r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/4a3aaaa1-f748-4233-a7e6-bb9668467046.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/4a3aaaa1-f748-4233-a7e6-bb9668467046.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "85370695",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s174",
        "title": "Habitación indiv con cama extra",
        "price": 49,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.39094850751114,
            "lng": 2.16313282639056,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437013/gz1hfzv47xzfwcmosadc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436528/xfryowvexdic3k1gjush.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436804/m7h5fpqvy5ctvkysvg6o.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436588/cxkvvaext8m0kjuaxcrk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436511/ru9vwmfqgv3yvdvny3tw.jpg"
        ],
        "summary": "Acogedora habitacion doble con posibilidad de una cama extra en el barrio de gracia en un tipico piso modernista. Situado en pleno centro geografico de Barcelona y todos sus distritos. zona tranquila y bien comunicada por metro y bus.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Elevator",
            "Heating",
            "Family/kid friendly",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Coffee maker",
            "Refrigerator",
            "Dishes and silverware",
            "Luggage dropoff allowed",
            "Wide hallway clearance",
            "Paid parking on premises"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s245",
            "fullname": "Txus",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Hola me llamo txus trabajo en el mundo de las terapias como osteopata y llevo 12 años viviendo en barcelona , me encanta esta ciudad y en especial el barrio de gracia , tranquilo y animado al mismo tiempo . Como viajero me gusta conocer gente de culturas diferentes y si lo necesitan ayudar a conocer esta maravillosa ciudad ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/a63534fe-c841-4bdc-b879-0ea5edc7e2be.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/a63534fe-c841-4bdc-b879-0ea5edc7e2be.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "25807335",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s175",
        "title": "Sydney Hyde Park City Apartment (checkin from 6am)",
        "price": 185,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.865652792912705,
            "lng": 151.1894217945993,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436793/httqod38otalkzp9kynq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436922/ytr7znhbuqnxnotutplv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437061/xwqh3jtahjqxod0p1a0c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436523/ptcgbydjsamgf67a0npw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436978/mhqf1tttzqr33ecrrwb2.jpg"
        ],
        "summary": "Our city apartment is a bright, comfortable 1 bedroom with 24hr front-desk access. It is conveniently located directly across from Hyde Park and within walking distance of delightful cafes, restaurants, parks, major city attractions and public transport, including Museum Station which has a direct connection to Sydney Airport.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Pool",
            "Kitchen",
            "Gym",
            "Elevator",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Building staff",
            "Private living room",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Patio or balcony",
            "Cleaning before checkout",
            "Step-free access",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Step-free access"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s247",
            "fullname": "Desireé",
            "location": "Australia",
            "about": "At the centre of my life is my beautiful family...home is wherever my family is.\r\n\r\nI enjoy filling my life with positive experiences and love to travel and experience new cultures, to meet new people, to read and just enjoy the beauty and wonders of the 'littlest' things in the world around me and my family. \r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/16187044/profile_pic/1402737505/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/16187044/profile_pic/1402737505/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "16187044",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s176",
        "title": "205 Punahoa 2 Bed Condo- Oceanfront",
        "price": 311,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.795858121107187,
            "lng": -156.3249516735297,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437049/gpanmdffbwd9crhnzswa.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436376/phpltehcr6uq9lh5jlax.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436861/xrxhgsif3ekhxgn8irlm.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436287/my8eunlgiiflc2ohslgx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436772/nplkpwclhrdvvspkpmbg.jpg"
        ],
        "summary": "2 Bedroom Corner unit on the ocean! Since all Punahoa Beach condos are individually owned, each is decorated in its own island-style and all have an ocean front lanai perfect for your own outdoor dining above the Pacific. \"ALL UNITS ARE NON-SMOKING\"",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Family/kid friendly",
            "Smoke detector",
            "Essentials"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s249",
            "fullname": "Zaldy",
            "location": "Kihei, Hawaii, United States",
            "about": "Aloha,\r\nHere at Punahoa Oceanfront Vacation Rental's in Kihei, Maui Hawaii.  We offer Studios, One bedrooms, Two bedrooms, and One Bedroom Penthouses that is Ocean front and located right on the beach!  The amenities we provide in Punahoa is FREE PARKING, FREE WIFI INTERNET ACCESS CODE, & FULLY EQUIPPED KITCHEN / KITCHENETTES.  \r\nInside the units additional amenities such as:\r\n\r\n- Hair dryer, Shampoo, Conditioner.\r\n\r\n-Small cooler for your usage to take out and enjoy/travel beach or long drive around Maui.\r\n\r\n-Beach chair & beach towels\r\n\r\nOn property we have two outside shower stalls to rinse off after enjoying your time at the beach.\r\n\r\nWe also have a gas barbecue grill.\r\n\r\nSpectacular sunsets and perfect location for surfer's, stand up paddle boarding, and kayak.  Snorkeling from the Cove beach to Charley Young's beach is a must!  We frequently have visits from tired Honu's (Hawaiian sea turtles) resting on our shores / beach.  \r\n\r\n***Please be respectful and DO NOT TOUCH/ FEED/ OR BOTHER THE HAWAIIAN SEA TURTLES & HAWAIIAN MONK SEALS!***\r\n\r\nSend us a message or any inquires for additional information, we would love to welcome you to be our guest, stay with us here at Punahoa oceanfront vacation rentals, in Kihei Maui Hawaii!  Aloha nui loa!\r\n\r\n- Zaldy \r\n\r\nWithin walking distances from Fresh local farmers market and produces, outlets and little boutiques, variety of restaurants and bars, rent stand up paddle boards, boogie boards, and snorkeling gears.  Located right on the beach between Maui's famous Charley Young's beach & The Cove.  Close by Kalama beach park and playground.  ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/e1263d65-eea5-4606-b178-5252d66ae85f.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/e1263d65-eea5-4606-b178-5252d66ae85f.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "65960798",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s177",
        "title": "Very special island bed and brunch",
        "price": 139,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.88005227413591,
            "lng": 151.2193237685731,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436607/w0q3sn89rqfwyrxtsear.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436456/aazeb5pemja3ddxauatd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436793/httqod38otalkzp9kynq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436359/abuiyexl2xyemq8uon4s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436948/vgfxpvmcpd2q40qxtuv3.jpg"
        ],
        "summary": "A  new exquisite guest bathroom for you to enjoy, a king sized heated waterbed, air conditioning or heating or 3/4 single bed with innersprung mattress.  Both beds have sheepskin overlays - cosy or cool - your choice.   Experience the Hawkesbury River first hand. Hire a tinny, orwith a licence, a  fishing boat.  Bed, shower, brunch $140 per night, per person. This includes a lavish Brunch, with local fare, provided by the owner, who stays to look after you.   Customer happiness is paramount!",
        "maxGuests": 4,
        "bedRooms": 3,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Air conditioning",
            "Pets allowed",
            "Breakfast",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Private entrance",
            "Baby bath",
            "Crib",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Long term stays allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s251",
            "fullname": "Ann",
            "location": "Dangar Island, New South Wales, Australia",
            "about": " We are used to international travellers as my husband was a well known opera singer in Europe, so feel assured that any special needs will be catered for.  Looking forward to meeting you. Ann",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/7101594/profile_pic/1372148487/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/7101594/profile_pic/1372148487/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "7101594",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s178",
        "title": "Old Montreal.  ( Rent for at least 12 months)",
        "price": 149,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.49128028834459,
            "lng": -73.57452288418298,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436539/jy85me6y4bcsgfjvytwv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436334/nqgdwv3ljfkrbvynoetv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436975/hx9ravtjop3uqv4giupt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436797/hzfu8ihyoecadrermn14.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437033/rhw6gycttaimzocc1poz.jpg"
        ],
        "summary": "Great Apartment ideal for 1-2 guests, located in the heart of Old Montreal in the historic Basilica Notre-Dame area, surrounded by best restaurants, shops and major city attractions,two minutes walking to the Old Port. Very quiet building.  Condo rent  for at least 12 months, Contact me for detail",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Elevator",
            "Heating",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s253",
            "fullname": "Olga/Andrei",
            "location": "Canada",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/45563128/profile_pic/1443767923/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/45563128/profile_pic/1443767923/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "45563128",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s179",
        "title": "Chic 2BR in Festival Quarter by Sonder",
        "price": 123,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.516218222435235,
            "lng": -73.56699273128629,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436525/wdod0zfzsipkigajueda.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436511/ru9vwmfqgv3yvdvny3tw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437221/wczn7rdpbtjbcvgspakp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437339/qgs3hrnx0accbjkzuh9s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436528/xfryowvexdic3k1gjush.jpg"
        ],
        "summary": "At this Sonder, you'll love the beautiful panoramic windows, sleek decor, and fully-equipped kitchen. Located in the Quartier des Spectacles, known for the renowned Contemporary Art museum - Place-des-Arts, you're close to an array of wonderful local shops and restaurants.",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Gym",
            "Elevator",
            "Free street parking",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Keypad",
            "Private living room",
            "Hot water",
            "Bed linens",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Patio or balcony",
            "Long term stays allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s255",
            "fullname": "Sonder",
            "location": "San Francisco, California, United States",
            "about": "Sonder provides everything you need for an exceptional stay. Every booking is instantly confirmed. Every call or message is answered within minutes. Every home is equipped with crisp linens, high-speed Wi-Fi, and kitchen and bath essentials. And every experience is one-of-a-kind, thanks to our unique spaces and Neighborhood Guides.\r\n\r\nTo provide a better Sonder guest experience, we're creating local Airbnb accounts, and moving our listings to those new accounts. If you don't see a property you like here, there may be more on one of our new local profiles. Please reach out for more information!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/c92b0b12-e019-4bb1-b0a8-c0b671096eb2.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/c92b0b12-e019-4bb1-b0a8-c0b671096eb2.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "12243051",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s180",
        "title": "ROOM + ENSUITE INNER CITY MOD HOUSE",
        "price": 125,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.85927636729195,
            "lng": 151.19536263170437,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436481/tqwkxtbalipudzhivoag.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436811/ym5nh1anownexsyzgbqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436255/nmccht42mpd6erdeqjhi.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437233/q5ilz1oo9v4x8njmtjhl.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436419/jg5q36rc5mpn23kavp6b.jpg"
        ],
        "summary": "Large room with en-suite full personal bathroom plus own TV  in modern house with all mod cons less than 10 minutes to the city by bus and a short walk to cafes, restaurants and pubs plus shopping. Set in a quiet friendly back street with parking.",
        "maxGuests": 1,
        "bedRooms": 1,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Essentials",
            "Shampoo"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s257",
            "fullname": "Alison",
            "location": "Sydney, New South Wales, Australia",
            "about": "Hi, What can I say other than I am 39 years old, professional female in a relationship. Very easy going. I just recently renovated my whole house, pretty much a knock down job so new everything. I heard about air B&B and thought what a great idea. I have a clean house including a great kitchen so feel free to make yourself at home when you stay with me. Just let me know if there is anything in particular you may need. This is also the perfect room to shut yourself away in if that is what you'd prefer.",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/users/6172276/profile_pic/1375850690/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/6172276/profile_pic/1375850690/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "6172276",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s181",
        "title": "Sunny, private room on St. Denis",
        "price": 20,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.511309763119534,
            "lng": -73.5830625542191,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437045/dmquvficldi8ssfdlrrx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436566/dsqwjeelwr1bwjxfkdxv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436993/yzxnnw83e9qyas022au4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436948/vgfxpvmcpd2q40qxtuv3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436301/etz0n0umubahfkgmmwt8.jpg"
        ],
        "summary": "1 sunny, large, bright room available in 4 bedroom, 3rd floor walk up apartment on the corner of St. Denis & Sherbrooke. Close to vibrant night life but quiet apartment, downtown easily accessible. Bed, desk, window, dresser in a private room.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Kitchen",
            "Heating",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s259",
            "fullname": "Stephanie",
            "location": "Montreal, Québec, Canada",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/users/33813811/profile_pic/1432126275/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/33813811/profile_pic/1432126275/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "33813811",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s182",
        "title": "Allotja't en un elegant i lluminós pis modernista al costat de Passeig de Gràcia",
        "price": 255,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.376626437514105,
            "lng": 2.172441819822235,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437352/wejdxpvadcm8d7svkxqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436385/sorbz7rdtxacu1ds9vel.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436827/znh7gqzbwb4wm6bdziy7.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437269/u6wxkpazgvqdxiceky9l.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436496/ihozxprafjzuhil9qhh4.jpg"
        ],
        "summary": "Deixa't seduir per l'encant dels paviments de mosaic i els alts sostres artesonats d'aquest elegant i lluminós apartament modernista  ubicat en un edifici classic rehabilitat i  a tant sols 30 metres del Passeig de Gracia",
        "maxGuests": 6,
        "bedRooms": 3,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Doorman",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Outlet covers",
            "Bathtub",
            "High chair",
            "Children’s books and toys",
            "Window guards",
            "Crib",
            "Pack ’n Play/travel crib",
            "Room-darkening shades",
            "Hot water",
            "Body soap",
            "Bath towel",
            "Toilet paper",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Single level home",
            "Patio or balcony",
            "Long term stays allowed",
            "Step-free access",
            "Step-free access",
            "Wide doorway",
            "Wide clearance to bed",
            "Step-free access",
            "Wide doorway",
            "Wide entryway",
            "Host greets you",
            "Mountain view",
            "Balcony",
            "Sound system",
            "Breakfast table",
            "Espresso machine",
            "Convection oven",
            "Standing valet",
            "En suite bathroom",
            "Paid parking on premises",
            "Bedroom comforts",
            "Bathroom essentials"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s261",
            "fullname": "Lluís¬Lali",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Hi we are Lluis and Lali, we have rehabilitated this luminous apartment at heart of Barcelona. If you come to our city, this is a fantastic option, premium located, to enjoy your stay. See you at BCN :)",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/6600521/profile_pic/1418981400/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/6600521/profile_pic/1418981400/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "6600521",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s183",
        "title": "Museum Mile 1 BR - Madison Ave",
        "price": 133,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.70161232735137,
            "lng": -74.01463721931911,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437355/fy46xsk3yd7xujzcs2uz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436897/iz1ik9nibj3sobzrqomf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437321/lb1j83rv5xox1ovn5pgz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436359/abuiyexl2xyemq8uon4s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436287/my8eunlgiiflc2ohslgx.jpg"
        ],
        "summary": "Welcome to our Madison Ave apartment. You will find this listing so charming, and well located. The apartment has a queen bedroom, balcony off the living room, and a spacious living room with a sleep sofa, and desk.",
        "maxGuests": 4,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s263",
            "fullname": "Corporate Housing",
            "location": "US",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/33521259-4314-4f61-bb54-4905a0ff587c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/33521259-4314-4f61-bb54-4905a0ff587c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "61391963",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s184",
        "title": "Wellyet Guest House@Room 2",
        "price": 267,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.33409190103194,
            "lng": 114.1754551566422,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437262/ifklqhihs1qinbmap5hd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436390/om97cgufeacwlric2r5w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436559/sbtoepvxxobkogznuiw4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436821/b4ejulqdhsvyseyfnfr0.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436402/jtsg0m0t0x0ciyuzvbun.jpg"
        ],
        "summary": "Located at the heart of city Tsim Sha Tsui area, MTR, Bus Stop at door front; minutes walking distance to Star Ferry. All amenities near by, includes 7-Eleven, Bakery, Starbucks, shopping centers, restaurants, pubs etc.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Paid parking off premises",
            "Elevator",
            "Smoke detector",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Private entrance",
            "Hot water",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Host greets you",
            "Paid parking on premises"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s265",
            "fullname": "Natalie",
            "location": "Hong Kong",
            "about": "Taking life break after 15 years studying and working in Australia. Enjoy and love to travel around and meet people, share culture differences. Learn new recipes, try on different kind of delicious food.  ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/4ddda4b2-9a2c-4331-aa0c-bcc99ec404fb.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/4ddda4b2-9a2c-4331-aa0c-bcc99ec404fb.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "40699783",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s185",
        "title": "☼☼ Lovely Colorful Studio ☼☼ Tsim Sha Tsui",
        "price": 502,
        "loc": {
            "country": "Hong Kong",
            "city": "Hong Kong",
            "lat": 22.30655210208797,
            "lng": 114.15592149760347,
            "address": "Hong Kong, Hong Kong"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437287/mns2lapesdourab6dn7u.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436797/hzfu8ihyoecadrermn14.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436897/iz1ik9nibj3sobzrqomf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437013/gz1hfzv47xzfwcmosadc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436410/shdfxkcohvm8beh5rkar.jpg"
        ],
        "summary": "My Lovely Colorful Studio is in the center of the popular district Tsim Sha Tsui. There are many Yummy restaurants and shops, it's a very good location, It's the real Hong Kong. With 200 sqft and good design you will feel like home. It's located in a walk up building (2nd floor), right in the center of TST, less than 2min by walk from Tsim Sha Tsui MTR station. ★★★ Don't forget to add the listing in your Wishlist ★★★",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Smoking allowed",
            "Indoor fireplace",
            "Family/kid friendly",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Lockbox",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Refrigerator",
            "Single level home",
            "Long term stays allowed",
            "Wide hallway clearance",
            "Step-free access",
            "Wide doorway",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Step-free access",
            "Wide doorway",
            "Accessible-height bed",
            "Step-free access",
            "Wide doorway",
            "Accessible-height toilet",
            "Step-free access",
            "Wide entryway"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s267",
            "fullname": "Hester",
            "location": "Hong Kong",
            "about": "Hello i'm Hester, i'm from Hong Kong, I love my country and i hope you will like it!\r\n\r\nI listed my studio in Airbnb cause i'm not often in Hong Kong as i work as an translator assistant, i have to travel in different place in the world. \r\n\r\nI love to travel, my favorite destination is Italy, I've been to Rome, Milan.. I love the food there.\r\nI also often go to Singapore, i also live there, few weeks a month, it's amazing there..",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/237cfb07-039d-433f-8685-f18164cf8845.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/237cfb07-039d-433f-8685-f18164cf8845.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "62713640",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s186",
        "title": "Big Private BR Steps to Barnard Columbia & Subways",
        "price": 128,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.71569133442995,
            "lng": -74.01486130827455,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436410/shdfxkcohvm8beh5rkar.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436546/ooe1vhteuu02af7ny3ex.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437290/ll70bfq1cxslz2x2snoa.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436876/bskkmribzul6cjzbprvi.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437241/wt0seud4ot4cmdrztdzz.jpg"
        ],
        "summary": "This listing is for a large, comfy private BR in a quiet, sun-filled apartment on  a high floor in a safe, friendly pre-war elevator building in the heart of Morningside Heights. You will be just steps from Columbia and Barnard Universities and a few blocks from the Manhattan School of Music, Jewish and Union Theological Seminaries, and Riverside, Morningside and Central Parks. With high-speed wifi, cable TV, printer, dishwasher, microwave, a/c, 24-hour laundry room and evening doorman",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Doorman",
            "Elevator",
            "Free street parking",
            "Buzzer/wireless intercom",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Private entrance",
            "Bathtub",
            "Room-darkening shades",
            "Hot water",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s269",
            "fullname": "Paul",
            "location": "New York, New York, United States",
            "about": "Hi - I'm a freelance writer and producer for TV and film, a native New Yorker, and the proud father of an amazing teenager.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/81bcb57e-4eba-444d-a17d-f9dd49f0aaa6.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/81bcb57e-4eba-444d-a17d-f9dd49f0aaa6.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "56197328",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s187",
        "title": "L'IDÉAL, ( à 2 min du métro Pie-IX ).",
        "price": 85,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.49824915431777,
            "lng": -73.55407809391667,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436907/abikktroqknzhch6b9ly.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437321/lb1j83rv5xox1ovn5pgz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436852/y3scgbn8d6evumdpwdp4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436470/jrzh7wvpvulqxo42xocc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436496/ihozxprafjzuhil9qhh4.jpg"
        ],
        "summary": "Newly furnished appartment. You will feel the comfort and warmth as you walk in. Everything has been designed to make your stay as pleasant as possible. This apartment is ideal for its location and security (keypad lock). It is perfect for couples, or for passing travelers. Can accommodate a maximum of 4 with the sofa-bed. For your convenience will will also supply you with my private parking for one car.",
        "maxGuests": 4,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Free street parking",
            "Heating",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Private entrance",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Ethernet connection",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "Patio or balcony",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Other"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s271",
            "fullname": "William",
            "location": "Montreal, Québec, Canada",
            "about": "Je possède cette maison depuis plus de 40 ans, mes enfants ont tous habités un moment ou l’autre en haut ainsi que quelque locataire, mais maintenant tout à été refait et c’est devenu un hébergement touristique bien meublé et complet maintenant c’est à vous d’en profiter.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/e750a25f-f3b3-4394-97af-f06cb1242ac3.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/e750a25f-f3b3-4394-97af-f06cb1242ac3.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "67704570",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s188",
        "title": "Cheerful new renovated central apt",
        "price": 264,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.01785009055001,
            "lng": 28.989392882261704,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436470/jrzh7wvpvulqxo42xocc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436844/vowx18k0arro8jyekcap.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436588/cxkvvaext8m0kjuaxcrk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436983/pivldxmrxssnhyzixhes.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436922/ytr7znhbuqnxnotutplv.jpg"
        ],
        "summary": "The full equipped apartment located in the heritage district of Istanbul, colorful Tarlabaşı. If you are looking for a place where you really want to taste the chaos with harmony like a real Istanbuller you are very welcome to stay in my apartment.",
        "maxGuests": 8,
        "bedRooms": 3,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Heating",
            "Family/kid friendly",
            "Suitable for events",
            "Washer",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Crib",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Long term stays allowed",
            "Step-free access",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s273",
            "fullname": "Aybike",
            "location": "Istanbul, İstanbul, Turkey",
            "about": "My name is Aybike. I love to travel, to discover new places and to meet new people. I will be glad to hosting you in Istanbul at my place. My apartment is newly renovated, clean, cosy, comfortable, large enough for 8 people and is situated literally at the heart of Istanbul. As a traveller my wish is to make you feel at home; drink your morning coffee while listening to the sound of Istanbul then take your map, jump into the street with friendly neighbourhood,  and enjoy the city with walking, exploring, watching, reading and hearing. I know how it is important to be able to feel the city you are visiting from my experiences. So if you are looking for a place where you really want to taste the chaos with harmony like a real Istanbuller you are very welcome to stay in my apartment.\r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/e87810d6-0d69-4187-8862-cc6f9e2fe8ca.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/e87810d6-0d69-4187-8862-cc6f9e2fe8ca.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "22766460",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s189",
        "title": "Sunny Room (for One) Minutes from Coogee Beach!",
        "price": 43,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.8679124845391,
            "lng": 151.19861648865844,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436204/wzbrvr4mcsuub6gvwbry.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436893/pkhxv5j90ubdzbpgdbdb.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437033/rhw6gycttaimzocc1poz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437262/ifklqhihs1qinbmap5hd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg"
        ],
        "summary": "Close to Coogee Beach, Ritz Cinema, University of New South Wales (UNSW), Prince of Wales Hospital, Randwick Racecourse, bars, restaurants, shops, public transport... Yet, in a very quite suburb.",
        "maxGuests": 1,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Kitchen",
            "Free street parking",
            "Heating",
            "Washer",
            "Smoke detector",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Lockbox",
            "Room-darkening shades",
            "Hot water",
            "Microwave",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Luggage dropoff allowed",
            "Step-free access",
            "Wide clearance to bed",
            "Step-free access",
            "Step-free access"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s275",
            "fullname": "Cindy",
            "location": "Sydney, New South Wales, Australia",
            "about": "Me:\r\nI'm Brazilian living in Australia since 2010. I speak Portuguese and English and I love meeting new people from different cultures and languages!\r\n\r\nAs host:\r\nI hosted over 80 people in 2 years of Airbnb and we earned Super Hosts status 2 years in a row! \r\nMy husband Claudio is Italian and I'm Brazilian. We work from home and we are very fast replying guest messages when we are not here to answer in person. Despite our apartment being small, we have a comfortable size bedroom with a double bed and many cosy pillows so you can relax and rest after exploring Sydney! Also, we are 15 minutes walking distance to Coogee Beach (our favourite!).\r\n\r\nAs a traveller: \r\nI prefer quiet and relaxing homes and when travelling I barely stay on my Airbnb room as I am constantly exploring. I like to chat with my hosts to find out the best places to eat and see from a local's point of view as well as building friendship with my hosts.\r\nI either travel alone or with my Italian husband Claudio. ",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/996600b6-b081-4b78-8248-a63f84d163f2.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/996600b6-b081-4b78-8248-a63f84d163f2.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "59233953",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s190",
        "title": "Mike's House- Hina Room",
        "price": 95,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.812099939125602,
            "lng": -156.32499524174258,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436823/af6elioxovkhvp6cg1un.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436876/bskkmribzul6cjzbprvi.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437168/vbmfmdmwrxt7xfwbsw7c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437321/lb1j83rv5xox1ovn5pgz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437009/zuu2udtrkcs6sxjiym40.jpg"
        ],
        "summary": "Our home is a 4bd older rustic style home that has been in the family since 1935. Private room, with queen size bed and own bathroom.  We are 7-10 walking distance to Paia town with lots to see and eat.  There is off street parking and WIFI.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Cable TV",
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Cat(s)",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Self check-in",
            "Keypad"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s277",
            "fullname": "Rina",
            "location": "Paia, Hawaii, United States",
            "about": "We are born and raised in Hawaii; and part Hawaiian.  My husband was born and raised in Maui all his life.  I was born on Oahu and raised there and the Big Island before moving to Maui about 30 years ago.  We love and treasure our beautiful Hawaiian Islands. Our family includes our 3 beautiful children; Maikala, Nainoa, and Iwalani.  We love our life and never take for granted for what we have.  Live life to the fullest because life is precious and should be appreciated everyday!!!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/7b43a2f1-e277-4d8b-ba48-b52b74b97f77.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/7b43a2f1-e277-4d8b-ba48-b52b74b97f77.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "8591101",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s191",
        "title": "Park Guell apartment with terrace",
        "price": 85,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.40235980583576,
            "lng": 2.1685511392649244,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437025/haliwehueqfkmxo1tv7j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437256/d1wl601knflcsohxsqhk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436460/qi3vkpts37b4k0dedosc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436578/y1fshh0nppk5nxbfzqoz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436380/ez5caladc00mgsssl6ws.jpg"
        ],
        "summary": "Apartment with terrace in a quiet street of Barcelona, 5 minutes walk from Park Güell and 20 minutes by public transport to the city center. Renovated and fully equipped. HUTB-000929",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Paid parking off premises",
            "Smoking allowed",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "First aid kit",
            "Essentials",
            "Hangers",
            "Hair dryer",
            "Iron",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Bed linens",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s279",
            "fullname": "Alexandra Y Juan",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Hola, \r\n\r\nSomos Alexandra y Juan dos amigos que estamos enamorados de Barcelona, nuestras pasiones son viajar y conocer gente por lo que nos encantaría compartir con vosotros nuestros espacios  para que disfrutéis a vuestro gusto de toda la cultura, actualidad y diversidad de ofertas que la ciudad os ofrece.\r\nPara nosotros lo mas importante es que nuestros huéspedes puedan aprovechar al máximo su estancia en Barcelona,  que viváis vuestra historia  reflejada en  rincones únicos de la ciudad y por supuesto nuestra mayor satisfacción es que os sintáis como en casa según lo que busquéis.\r\n\r\nHello, \r\n\r\nWe are Alexandra and Juan two friends who are in love with Barcelona, our passion is to travel and meet new people so we would love to share our spaces with you and that you can enjoy the culture, the present and the diversity of offers that the city has to offer. \r\nFor us the most important thing is that our guests can make the most of their stay in Barcelona, that you live our history full of unique places and of course our greatest satisfaction is that you feel as if you where at home according to what you are looking for.",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/3fceba9a-ce84-4841-88df-b699105119b4.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/3fceba9a-ce84-4841-88df-b699105119b4.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "54320669",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s192",
        "title": "Lachine room+Free parking+Airport",
        "price": 78,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.50377182236199,
            "lng": -73.54680560182804,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437025/haliwehueqfkmxo1tv7j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436835/pose0fy4kkms4qkln2hg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436390/om97cgufeacwlric2r5w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437333/iycoq0rywibijlncdqxh.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436406/id1oo8krwgxvdf9s02qp.jpg"
        ],
        "summary": "A nice room with King size bed in a new condo, free parking, near to Montreal International airport. By car 1m get into highway 20,13,easy go to Downtown,Dorval,St-Laurent,Laval, include breakfast GYM,  summer pool,BBQ; Dinner,car service possible.",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Gym",
            "Breakfast",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s281",
            "fullname": "Zzh",
            "location": "Montreal, Québec, Canada",
            "about": "A mother and son",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/e88f6d73-8ff6-47f8-8b3b-198dd79308b4.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/e88f6d73-8ff6-47f8-8b3b-198dd79308b4.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "34276082",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s193",
        "title": "Bright room in Spacious house close to Airport",
        "price": 45,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.864665969343314,
            "lng": 151.19241957908096,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437301/af9yuihshv3wh24bu07u.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436236/ctnbnqazpqhotjcauqwp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436542/e96nrbkjz8mecvsbzukk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436496/ihozxprafjzuhil9qhh4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437361/h7fdhfrwoo9jtcgwqzn7.jpg"
        ],
        "summary": "My home is close to the Airport (5.2km - no Airport noise) and St George Hospital (2.5km), it is half a block from the beach, 15 min walk to the Novotel Hotel in  Brighton Le sands where you can also find an abundance of restaurants, cafes and shops. You’ll love my place because of the light, airy room in our spacious house and your own  bathroom. My place is good for couples, solo adventurers and business travellers. We are on the 3rd floor with no lift.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Kitchen",
            "Breakfast",
            "Free street parking",
            "Washer",
            "Smoke detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Lockbox",
            "Children’s books and toys",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Patio or balcony",
            "Garden or backyard",
            "Luggage dropoff allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s283",
            "fullname": "Angela",
            "location": "New South Wales, Australia",
            "about": "Hi, I am from New Zealand, Steve is from Malta, Coby is our son. We love living here in Australia and the beach nearby is a big plus for us. Coby and I love travelling, I have been to over 50 countries and Coby to 7 (not bad for a 7 yr old!)  We love the Airbnb accomodation, doing little road trips within Australia and meeting people. Steve lives close by with his two sons and is looking forward to travelling more with us when they get older. ",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/e7de86c0-841b-488c-a0e2-20d955046d5b.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/e7de86c0-841b-488c-a0e2-20d955046d5b.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "63558864",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s194",
        "title": "Deniz, orman ve şehir manzaralı.",
        "price": 527,
        "loc": {
            "country": "Turkey",
            "city": "Istanbul",
            "lat": 41.02237435198937,
            "lng": 28.979112573967395,
            "address": "Istanbul, Turkey"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436385/sorbz7rdtxacu1ds9vel.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437282/qy0p7yyaukasripzwc7w.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436600/rt3ldgx1xfqct3961yjz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436827/znh7gqzbwb4wm6bdziy7.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436329/cvylwkta0uannbxm3zns.jpg"
        ],
        "summary": "70 M2, verandalı, bahçeli müstakil konut. 1 yatak odası+salon+mutfak+banyo+teras",
        "maxGuests": 3,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Kitchen",
            "Smoking allowed",
            "Family/kid friendly",
            "Washer",
            "Essentials",
            "Self check-in",
            "Lockbox",
            "Hot water"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s285",
            "fullname": "Celal",
            "location": "Burgazada, Istanbul, Turkey",
            "about": "",
            "responseTime": "within a day",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/4b9e02f6-5827-46b2-a1e6-1e0ada21cb5c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/4b9e02f6-5827-46b2-a1e6-1e0ada21cb5c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "10673042",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s195",
        "title": "Amazing NEW Food Lover Balcony, close to FIRA, MWC",
        "price": 84,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.398711587570915,
            "lng": 2.1718464876389767,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436607/w0q3sn89rqfwyrxtsear.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437339/qgs3hrnx0accbjkzuh9s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437241/wt0seud4ot4cmdrztdzz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437009/zuu2udtrkcs6sxjiym40.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436380/ez5caladc00mgsssl6ws.jpg"
        ],
        "summary": "Set in a prized area for tapas and vermouth, you'll get the best of Barcelona and sunset views in your very own Poble Sec pad. Enjoy the cool local vibe nestled below Montjuïc and fast transport connections to beach (10 mins) and airport (30 mins). Perfectly located, close to Mobile World Congress",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Safety card",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "High chair",
            "Crib",
            "Hot water",
            "Bed linens",
            "Coffee maker",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s287",
            "fullname": "Kerrisdale Holdings SLU",
            "location": "Barcelona, Catalonia, Spain",
            "about": "Hi,\r\n\r\nWe are a very small company that is using Airbnb to share our lovely apartments with travelers and adventurers heading to Barcelona. Our  company's journey began in 2013, when we carefully selected and purchased these apartments in barrio PobleSec. Each apartment has been renovated with our own hands, with careful attention to preserving some of the original features that make Barcelona architecture, and style famous. These apartments and the PobleSec barrio will make for a perfect base, for your own Barcelona adventure. \r\n\r\nBarcelona is a fantastic city with a dazzling combination of beach, culture, fascinating people, architecture, unique cuisine and artisans. This is a very rewarding place to live and an exciting city to visit. There is so much to see, taste and experience.  We are excited to host your stay in Barcelona, provide recommendations and help you to have the best experience this great city has to offer!\r\n\r\n\r\nSafe travels :)",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/11170203/profile_pic/1428265586/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/11170203/profile_pic/1428265586/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "11170203",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s196",
        "title": "Stylish, spacious, central, shared rooftop terrace",
        "price": 129,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.38123120126403,
            "lng": 2.1617574308012775,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436553/hbkx9lwxjd0wabqk0bmo.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436419/jg5q36rc5mpn23kavp6b.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437253/m8imgenrgbozeveyahh7.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437061/xwqh3jtahjqxod0p1a0c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436607/w0q3sn89rqfwyrxtsear.jpg"
        ],
        "summary": "Stylish, spacious two-bedroom, two-bathroom apartment, located in the central Eixample neighbourhood, just a short walk from the Old City and from the gorgeous Art Nouveau district. Elegant contemporary design, high ceilings and parquet flooring are combined with modern comforts: Wi-Fi, satellite TV, and a fully-equipped kitchen. The apartment is decorated with bright colours and is full of natural light. A shared rooftop terrace is open to all guests and offers great views over Barcelona.",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Elevator",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Bed linens",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Luggage dropoff allowed",
            "Host greets you",
            "Full kitchen"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s289",
            "fullname": "Yaiza",
            "location": "Barcelona, Catalonia, Spain",
            "about": "I live in Barcelona, a city that has captivated me from the start for its culture, history and beauty. I work as a full-time host for Aspasios and couldn’t think of a better job: at Aspasios we love to make our guests feel at home. A big part of our job is listening carefully to our visitors: we learn so much from them every day. We enjoy meeting each and every person who comes to stay with us, and want them to come back because of us. We pride ourselves on being professional and friendly at the same time. At Aspasios, we are passionate about hospitality.\r\n\r\nMy colleagues Jesus, Vanessa, Yenai, Paola and I are always on hand to help you make the most of your trip to Barcelona. We know this lovely city inside out, so can recommend plenty of restaurants, bars and activities that you might not find in the guide books! \r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/1a934541-366d-4ee5-bd50-83621b8c9aa0.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/1a934541-366d-4ee5-bd50-83621b8c9aa0.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "5878688",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s197",
        "title": "Private Cozy Bedroom in Brooklyn",
        "price": 47,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.723423253179504,
            "lng": -74.00960170099542,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437211/czj7vbzslcfajxonvbe0.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436922/ytr7znhbuqnxnotutplv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436957/ehhcyscwtvxw55mptkok.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436460/qi3vkpts37b4k0dedosc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436414/trl4n8noogyun10qmds8.jpg"
        ],
        "summary": "Your private room is located in our family's lovely 3-bedroom condo, a welcoming space for you to call home while enjoying all that New York's five boroughs have to offer. We are artists and students of culture and will be happy to help with recommendations during your stay. We also have another bedroom listing with more space: https://www.airbnb.com/rooms/135393?s=8&user_id=663764&ref_device_id=834476da76042c7d3d85486a5eaac86e8cc4de3b",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free street parking",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Lock on bedroom door",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Outlet covers",
            "Bathtub",
            "Children’s books and toys",
            "Window guards",
            "Room-darkening shades",
            "Children’s dinnerware",
            "Game console",
            "Hot water",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Luggage dropoff allowed",
            "Long term stays allowed",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s291",
            "fullname": "Karen",
            "location": "New York, New York, United States",
            "about": "Joshua is a writer originally from the Atlantic City area and Karen is an actress,designer,improviser originally from a small town in southeastern Oklahoma. We love film, theatre, music, travel, and nyc and are always up for a lively discussion! We have been hosting on Airbnb since 2011 and really enjoy the opportunity to host such a wide variety of guests!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/663764/profile_pic/1308681352/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/663764/profile_pic/1308681352/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "663764",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s198",
        "title": "cozy house and garden in the heart of Montréal",
        "price": 64,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.49637284636841,
            "lng": -73.5442078494598,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437017/gjyzgdjngyrhfrj2loxz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437355/fy46xsk3yd7xujzcs2uz.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437352/wejdxpvadcm8d7svkxqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437002/rfon5llzyvk94eilgk5r.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436394/kscsvxyn0uro9tjhefeb.jpg"
        ],
        "summary": "House at the heart of Montréal. Cosy apartment, 2 bedrooms, one living room, calme street, close to Downtown, the Plateau-Mt Royal and Hochelaga. Métro, café and stores 10m away. A HUGE garden. Cat present! :)",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Cat(s)",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s293",
            "fullname": "Teodora",
            "location": "Montreal, Quebec, Canada",
            "about": "Je suis originaire de Roumanie, maintenant à Montréal depuis 8 ans. Je suis infirmière, reconvertie après une mini-carrière dans les festivals de cinéma montréalais. J'aime partager et rencontrer de nouvelles personnes. ",
            "thumbnailUrl": "https://a0.muscache.com/im/users/7747793/profile_pic/1375204833/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/7747793/profile_pic/1375204833/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "7747793",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s199",
        "title": "Sunny appartment on the Plateau",
        "price": 79,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.51451304750541,
            "lng": -73.58528946419342,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436359/abuiyexl2xyemq8uon4s.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437352/wejdxpvadcm8d7svkxqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437256/d1wl601knflcsohxsqhk.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436301/etz0n0umubahfkgmmwt8.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436406/id1oo8krwgxvdf9s02qp.jpg"
        ],
        "summary": "Great apartment located in the heart the Plateau/Mile-end neighbourhood.  The perfect place to relax AND enjoy all of what Montreal has to offer :) !!  I look forward sharing with you my favorite spots and perspectives about this town and province!",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Wifi",
            "Kitchen",
            "Free parking on premises",
            "Breakfast",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Fire extinguisher",
            "Essentials",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Other"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s295",
            "fullname": "Sabrina",
            "location": "Montreal, Québec, Canada",
            "about": "From Montreal, Sabrina works as a trainer and consultant with non-profit organisations. On a more personal level, she cultivate a secret passion for social change theatre, traveling, yoga, cycling, cooking, harmony and... social gatherings! Marc-André adores sciences but spend the majority of his free time cycling, travelling and enjoying what the city has to offer!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/688387/profile_pic/1307765003/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/688387/profile_pic/1307765003/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "688387",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s200",
        "title": "Mike's House- Uilani Room",
        "price": 88,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.795111978871255,
            "lng": -156.31977931234826,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436837/fyczvvyuelceouxja8yy.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437269/u6wxkpazgvqdxiceky9l.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436338/oifgxuovghbgnabppike.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436315/nyglbkkyaednuygn6eik.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436481/tqwkxtbalipudzhivoag.jpg"
        ],
        "summary": "Our home is a 4bd older style home that has been in the family since 1935. Private room, with full size bed and partial bathroom. We are 7-10 walking distance to Paia town with lots to see and eat. There is off street parking and WIFI.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Cat(s)",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Self check-in",
            "Keypad"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s297",
            "fullname": "Rina",
            "location": "Paia, Hawaii, United States",
            "about": "We are born and raised in Hawaii; and part Hawaiian.  My husband was born and raised in Maui all his life.  I was born on Oahu and raised there and the Big Island before moving to Maui about 30 years ago.  We love and treasure our beautiful Hawaiian Islands. Our family includes our 3 beautiful children; Maikala, Nainoa, and Iwalani.  We love our life and never take for granted for what we have.  Live life to the fullest because life is precious and should be appreciated everyday!!!",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/7b43a2f1-e277-4d8b-ba48-b52b74b97f77.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/7b43a2f1-e277-4d8b-ba48-b52b74b97f77.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "8591101",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s201",
        "title": "Large railroad style 3 bedroom apt in Manhattan!",
        "price": 180,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.70010760456779,
            "lng": -74.00338689967965,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436937/mkbcjfockxezgrvimska.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436957/ehhcyscwtvxw55mptkok.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436533/lw91nt07jhq6khiacu2d.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436523/ptcgbydjsamgf67a0npw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436872/i3jblqgpdttpwvshbffo.jpg"
        ],
        "summary": "Spacious 3 bedroom apartment. 2 are railroad style (must go through one to get to the next) and the additional bedroom is at opposite end of the apartment for extra privacy. Well equipped open kitchen. Large living room with additional fold out couch. Great apt for a weekend in NYC.  10 min walk to Central Park.",
        "maxGuests": 9,
        "bedRooms": 3,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Free street parking",
            "Buzzer/wireless intercom",
            "Heating",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Hot water",
            "Microwave",
            "Refrigerator",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "Other"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s299",
            "fullname": "Vick",
            "location": "New York, New York, United States",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/bd6a13af-36d3-4658-920b-87c221704fe2.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/bd6a13af-36d3-4658-920b-87c221704fe2.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "35215309",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s202",
        "title": "Sydney Olympic Park High Level Stunning View Apt",
        "price": 188,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.883310493281904,
            "lng": 151.21572251808388,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437036/a4pijdxx1kiebg7r6dxg.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436533/lw91nt07jhq6khiacu2d.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437336/u9ttr09gqo3hmfumwdww.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437352/wejdxpvadcm8d7svkxqq.jpg"
        ],
        "summary": "This brand new two-bedroom apartment with 2 bathroom at high level of the iconic Australia Tower in the heart of Sydney Olympic Park. Our place is welcoming. It contains 2 urban design bedrooms with buitl-in wardrobes. It could accommodate up to six adults, the ensuite room and the second room are both with band new Queen size bed can fit two people comfortably, the sofa bed in the living room can convert to Queen size bed, if necessary.",
        "maxGuests": 6,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Smoking allowed",
            "Elevator",
            "Hot tub",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Hot water",
            "Host greets you"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s301",
            "fullname": "Nicole",
            "location": "Australia",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/c635587e-9aa0-4847-a78e-a57d659fb0bb.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/c635587e-9aa0-4847-a78e-a57d659fb0bb.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "76721545",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s203",
        "title": "Hibiscus Hideaway in Kihei",
        "price": 160,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.809898272218184,
            "lng": -156.33409468568857,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436353/wqah1dfim6hcosaq0ve3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436597/l90ukcpzpv6yvv6vhsnd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437250/o8uutj3t2bvfafvxkr9j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436827/znh7gqzbwb4wm6bdziy7.jpg"
        ],
        "summary": "This beautiful one bedroom one bathroom cottage is completely brand new and is kept immaculate. Tile floors throughout, granite counter tops in the progressive yet traditional fully appointed kitchen and state of the art appliances.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "Cable TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Dog(s)",
            "Cat(s)",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Fire extinguisher",
            "Essentials",
            "24-hour check-in",
            "Hair dryer",
            "Iron"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s303",
            "fullname": "Samantha",
            "location": "Lahaina, Hawaii, United States",
            "about": "",
            "responseTime": "within a day",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/79105546-a352-4b2d-a2ae-2064d8d92bac.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/79105546-a352-4b2d-a2ae-2064d8d92bac.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "66290175",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s204",
        "title": "Stunning Oceanfront. Amazing Views. 2 Bed 2 Baths",
        "price": 299,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.788438059850847,
            "lng": -156.31601523807984,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436315/nyglbkkyaednuygn6eik.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437352/wejdxpvadcm8d7svkxqq.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437021/cw6mtrxza5fzmmgxen4j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437040/oarfkdxx7gyyvcynvwko.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436511/ru9vwmfqgv3yvdvny3tw.jpg"
        ],
        "summary": "Experience Stunning Views in a large 2 bedroom private Oceanfront condo in Maui.  Property amenities include:  Beautiful Beach, 2 Pools, Hot Tub, Restaurant, Board Rentals, Tennis Courts, Mini Golf, BBQs, Washer and Dryer, 2 Gyms, and Concierge.",
        "maxGuests": 7,
        "bedRooms": 2,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Gym",
            "Elevator",
            "Free street parking",
            "Hot tub",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Building staff",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "BBQ grill",
            "Patio or balcony",
            "Long term stays allowed",
            "Waterfront",
            "Beachfront"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s305",
            "fullname": "Rajeev",
            "location": "San Jose, California, United States",
            "about": "",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/06ef57ba-a089-4cc3-831a-4b051c77648c.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/06ef57ba-a089-4cc3-831a-4b051c77648c.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "70428754",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s205",
        "title": "Mouzinho 244 Ap4 by RUA Apartments",
        "price": 60,
        "loc": {
            "country": "Portugal",
            "city": "Porto",
            "lat": 41.15993616569138,
            "lng": -8.625771680727063,
            "address": "Porto, Portugal"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436536/zavqkvmzf6j6efydruzd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436460/qi3vkpts37b4k0dedosc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436886/cvc2yfmhfg9dabfkyiqw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436255/nmccht42mpd6erdeqjhi.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436566/dsqwjeelwr1bwjxfkdxv.jpg"
        ],
        "summary": "Ap4 is  located at Mouzinho da Silveira Street, in downtown, and in the heart of the UNESCO World Heritage Center. This apartment is on the 2th floor  and it's an apartment full of light. For privacy windows don't allow outside visibility. It has 1 bedroom, bathroom, kitchen, a dining area and a cozy living room. whith TV cable and free wi-fi. São Bento's Train Station and the Subway are just a 2 minute walk away You can see and choose  other apartments \"cliking\" on myprofile page.",
        "maxGuests": 4,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Wifi",
            "Kitchen",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "First aid kit",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Smart lock",
            "Crib",
            "Hot water",
            "Luggage dropoff allowed",
            "Paid parking on premises"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s307",
            "fullname": "Manuela",
            "location": "Porto, Porto District, Portugal",
            "about": "Somos pessoas comunicativas, gostamos de conviver com outras pessoas,  adoramos viajar e conhecer novos países e novas realidades.\r\nTambém gostamos muito da nossa cidade natal, o Porto e de a dar a conhecer.\r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/users/17289096/profile_pic/1437435980/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/17289096/profile_pic/1437435980/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "17289096",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s206",
        "title": "Wander to the Beach from a Cozy Wailea Condo",
        "price": 174,
        "loc": {
            "country": "United States",
            "city": "Maui",
            "lat": 20.798829420802598,
            "lng": -156.31959424122667,
            "address": "Maui, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436394/kscsvxyn0uro9tjhefeb.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436410/shdfxkcohvm8beh5rkar.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436886/cvc2yfmhfg9dabfkyiqw.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436571/fvqbazrysqpymjlhhdqu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437272/e2id7kpaglrrdug3i6if.jpg"
        ],
        "summary": "Mix a cocktail in the kitchenette at this studio-style apartment, decorated in warm, earthy tones. Sip it on the private deck as geckos scuttle around banana palms, or amid lush greenery at the complex’s shared poolside dining area with BBQ grills.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Hot tub",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Fire extinguisher",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Lockbox",
            "Hot water",
            "Body soap",
            "Bath towel",
            "Toilet paper",
            "Bed linens",
            "Extra pillows and blankets",
            "Coffee maker",
            "Full kitchen",
            "Bedroom comforts",
            "Bathroom essentials"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s309",
            "fullname": "Tamara And Steve",
            "location": "Maui, Hawaii",
            "about": "Tamara and Steve have lived on Maui since 1996 and our two young children were born and raised here. Steve is a Firefighter for Maui county and works at the Kihei fire station. Tamara is a stay-at-home mom and helps run our vacation rental business.  We have enjoyed owning our homes for their lovely tropical settings, great pool areas, and proximity to the wonderful beaches in Kihei and Wailea. We live five minutes from our properties and take great care to ensure our guests are happy. If you need anything while you are staying in our rentals we are here to help you. We hope to have you as our guests, The Farwig Family",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/81c6bdee-f61b-417f-a129-2e02468913e7.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/81c6bdee-f61b-417f-a129-2e02468913e7.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "9193586",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s207",
        "title": "Nice condo close to the subway",
        "price": 89,
        "loc": {
            "country": "Canada",
            "city": "Montreal",
            "lat": 45.51821320685264,
            "lng": -73.55867527332157,
            "address": "Montreal, Canada"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436823/af6elioxovkhvp6cg1un.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436948/vgfxpvmcpd2q40qxtuv3.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436893/pkhxv5j90ubdzbpgdbdb.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436470/jrzh7wvpvulqxo42xocc.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436539/jy85me6y4bcsgfjvytwv.jpg"
        ],
        "summary": "Nice condo at the second floor, well equipped, two bedroom with queen size bed, size bathroom with a skyview, complet kitchen, heating floor.",
        "maxGuests": 4,
        "bedRooms": 2,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Heating",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Lockbox",
            "Hot water",
            "Bed linens",
            "Pocket wifi"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s311",
            "fullname": "Jason",
            "location": "Montreal, Quebec, Canada",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/44522772-f05a-486e-aa21-8f99da321417.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/44522772-f05a-486e-aa21-8f99da321417.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "70143192",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s208",
        "title": "Cozy Hell's Kitchen Apt",
        "price": 125,
        "loc": {
            "country": "United States",
            "city": "New York",
            "lat": 40.70482658216824,
            "lng": -73.9904413127164,
            "address": "New York, United States"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436942/cfa0wa2uwfyunrhgp4mt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436559/sbtoepvxxobkogznuiw4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436897/iz1ik9nibj3sobzrqomf.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437021/cw6mtrxza5fzmmgxen4j.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436539/jy85me6y4bcsgfjvytwv.jpg"
        ],
        "summary": "1 bedroom Apt in Hell's Kitchen/Midtown West area . Close to Broadway Theaters & Times Sq. Walk to Central Park or West Side Highway . Apt faces the building courtyard which makes it quiet & serine. It's a small apartment adequate for solo, business travelers, or couples. There is no elevator, the apartment is located on the 4th floor ( must climb stairs)The building was built in 1920.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Paid parking off premises",
            "Smoking allowed",
            "Heating",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50",
            "Self check-in",
            "Lockbox",
            "Hot water",
            "Bed linens",
            "Refrigerator",
            "Dishes and silverware",
            "Stove",
            "Luggage dropoff allowed",
            "Well-lit path to entrance",
            "Step-free access",
            "Step-free access",
            "Step-free access",
            "Handheld shower head"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s313",
            "fullname": "Karen",
            "location": "New York, New York, United States",
            "about": "",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/user/6ac1d8ee-01cf-44e5-b2e8-73e14b3625af.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/user/6ac1d8ee-01cf-44e5-b2e8-73e14b3625af.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "39754804",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s209",
        "title": "Spacious, bright, central. AC. Rambla Catalunya",
        "price": 599,
        "loc": {
            "country": "Spain",
            "city": "Barcelona",
            "lat": 41.38541986014724,
            "lng": 2.151276012980812,
            "address": "Barcelona, Spain"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436961/rj6eo6v6npy65bckaxvr.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436559/sbtoepvxxobkogznuiw4.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436219/yida7pxwpup9rtgnguhv.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437168/vbmfmdmwrxt7xfwbsw7c.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437061/xwqh3jtahjqxod0p1a0c.jpg"
        ],
        "summary": "Spacious bright and stylish 4-bedroom, 2-bathroom apartment in the very central Eixample area, ideal for seeing the whole city. Reception open daily 9AM - 10PM with large terrace for all guests. Wi-Fi, satellite TV and well-equipped kitchen. The apartment is spacious and full of natural light. The double glazing keeps it nice and quiet. Modern decor, comfortable furnishings, wooden floor. The living room has 2 balconies onto a lively street. 3 bedrooms look onto an inner terrace.",
        "maxGuests": 8,
        "bedRooms": 4,
        "beds": 1,
        "baths": 2,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Kitchen",
            "Elevator",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "Self check-in",
            "Lockbox",
            "Hot water",
            "Bed linens",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Luggage dropoff allowed"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s315",
            "fullname": "Yaiza",
            "location": "Barcelona, Catalonia, Spain",
            "about": "I live in Barcelona, a city that has captivated me from the start for its culture, history and beauty. I work as a full-time host for Aspasios and couldn’t think of a better job: at Aspasios we love to make our guests feel at home. A big part of our job is listening carefully to our visitors: we learn so much from them every day. We enjoy meeting each and every person who comes to stay with us, and want them to come back because of us. We pride ourselves on being professional and friendly at the same time. At Aspasios, we are passionate about hospitality.\r\n\r\nMy colleagues Jesus, Vanessa, Yenai, Paola and I are always on hand to help you make the most of your trip to Barcelona. We know this lovely city inside out, so can recommend plenty of restaurants, bars and activities that you might not find in the guide books! \r\n",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/1a934541-366d-4ee5-bd50-83621b8c9aa0.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/1a934541-366d-4ee5-bd50-83621b8c9aa0.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "5878688",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s210",
        "title": "Small Room w Bathroom Flamengo Rio de Janeiro",
        "price": 71,
        "loc": {
            "country": "Brazil",
            "city": "Rio De Janeiro",
            "lat": -22.90272471725164,
            "lng": -43.189246229770404,
            "address": "Rio De Janeiro, Brazil"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436942/cfa0wa2uwfyunrhgp4mt.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437336/u9ttr09gqo3hmfumwdww.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437045/dmquvficldi8ssfdlrrx.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437358/cy8kzj8jeofwkev6tlq9.jpg"
        ],
        "summary": "Small room! It's a backdoor bedroom that it has its own bathroom for better privacy and also there is an equipped kitchen for you to use. Our apartment is very close to the subway, so in 10min you arrive in Copacabana and 15min in Ipanema.",
        "maxGuests": 1,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Wifi",
            "Kitchen",
            "Pets live on this property",
            "Cat(s)",
            "Elevator",
            "Washer",
            "Dryer",
            "Fire extinguisher",
            "Essentials",
            "translation missing: en.hosting_amenity_49",
            "translation missing: en.hosting_amenity_50"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s317",
            "fullname": "Fernanda",
            "location": "BR",
            "about": "",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/0c78bdd8-1e12-497e-a64c-b39f808ccfa7.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/0c78bdd8-1e12-497e-a64c-b39f808ccfa7.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "52988408",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s211",
        "title": "Great studio opp. Narrabeen Lake",
        "price": 117,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.88209398935401,
            "lng": 151.2197496165477,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437272/e2id7kpaglrrdug3i6if.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436961/rj6eo6v6npy65bckaxvr.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436536/zavqkvmzf6j6efydruzd.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436406/id1oo8krwgxvdf9s02qp.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437009/zuu2udtrkcs6sxjiym40.jpg"
        ],
        "summary": "Great studio apartment freshly painted and decorated.  Queen bed also with a pull-out sofa bed  Separate bathroom with fully equipped laundry.  Located across from Narrabeen Lake.  8km walk around lake - or borrow our bikes. Kayak/stand-up paddle boards available for hire. Short walk to Narrabeen beaches/Woollies/shops and main bus line to the city on Pittwater Road. 20 minutes to Manly and Manly wharf or take a stunning ferry ride to Sydney city or the new express B-line double-decker bus.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Pool",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Dog(s)",
            "Heating",
            "Washer",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Ethernet connection"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s319",
            "fullname": "Tracy",
            "location": "New South Wales, Australia",
            "about": "",
            "responseTime": "within an hour",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/9a934b26-9946-4261-aecf-7e707cc0782a.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/9a934b26-9946-4261-aecf-7e707cc0782a.jpg?aki_policy=profile_x_medium",
            "isSuperhost": true,
            "id": "634664",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    },
    {
        "_id": "s212",
        "title": "Cruisy apartment by the sea",
        "price": 151,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.85873715932724,
            "lng": 151.20747073174772,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436509/rii32aibnhkoeejsohie.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436419/jg5q36rc5mpn23kavp6b.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436481/tqwkxtbalipudzhivoag.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436917/mqkfjmfpmyqpqmzmqgau.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436539/jy85me6y4bcsgfjvytwv.jpg"
        ],
        "summary": "Self-contained studio apartment 3 minute walk from the best beach in Sydney, Bungan Beach. Open plan, north facing, so very well lit by natural light. Warm in winter, cool in summer. Ocean view, veggie garden, backyard for picnics etc.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Internet",
            "Wifi",
            "Wheelchair accessible",
            "Kitchen",
            "Free parking on premises",
            "Pets live on this property",
            "Cat(s)",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "First aid kit",
            "Essentials",
            "Shampoo",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s321",
            "fullname": "Dean",
            "location": "Sydney, New South Wales, Australia",
            "about": "My name is Dean, I'm a musician who lives next to the ocean on the Northern Beaches of Sydney, Australia. I enjoy the company of genuine and unique people, the journeys and discoveries of adventuring, and the time I spend listening to and creating music.",
            "thumbnailUrl": "https://a0.muscache.com/im/users/42173021/profile_pic/1440223197/original.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/users/42173021/profile_pic/1440223197/original.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "42173021",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95,
            "responseTime": "within a few hours"
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
            "Flexible"
        ]
    },
    {
        "_id": "s213",
        "title": "Little New York on Riley - 1BR Darlinghurst",
        "price": 230,
        "loc": {
            "country": "Australia",
            "city": "Sydney",
            "lat": -33.8581678394409,
            "lng": 151.20278221773745,
            "address": "Sydney, Australia"
        },
        "imgs": [
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436546/ooe1vhteuu02af7ny3ex.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437009/zuu2udtrkcs6sxjiym40.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436821/b4ejulqdhsvyseyfnfr0.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663436571/fvqbazrysqpymjlhhdqu.jpg",
            "http://res.cloudinary.com/dmtlr2viw/image/upload/v1663437002/rfon5llzyvk94eilgk5r.jpg"
        ],
        "summary": "With the CBD within walking distance, this brand new, fully self-contained 1BR apartment is the perfect choice for executives or holiday makers. Stylishly decked out and fully equipped, this is Sydney apartment accommodation at its finest. Please note, this is a duplicate listing, set up to attract longer bookings with weekly and monthly discounts.",
        "maxGuests": 2,
        "bedRooms": 1,
        "beds": 1,
        "baths": 1,
        "amenities": [
            "TV",
            "Cable TV",
            "Internet",
            "Wifi",
            "Air conditioning",
            "Wheelchair accessible",
            "Kitchen",
            "Elevator",
            "Buzzer/wireless intercom",
            "Heating",
            "Family/kid friendly",
            "Washer",
            "Dryer",
            "Smoke detector",
            "Carbon monoxide detector",
            "Essentials",
            "Shampoo",
            "24-hour check-in",
            "Hangers",
            "Hair dryer",
            "Iron",
            "Laptop friendly workspace",
            "translation missing: en.hosting_amenity_49",
            "Self check-in",
            "Lockbox",
            "Hot water",
            "Bed linens",
            "Extra pillows and blankets",
            "Microwave",
            "Coffee maker",
            "Refrigerator",
            "Dishwasher",
            "Dishes and silverware",
            "Cooking basics",
            "Oven",
            "Stove",
            "Single level home",
            "Long term stays allowed",
            "Wide hallway clearance",
            "Step-free access",
            "Wide doorway",
            "Flat path to front door",
            "Well-lit path to entrance",
            "Step-free access",
            "Wide doorway",
            "Wide clearance to bed",
            "Accessible-height bed",
            "Step-free access",
            "Wide doorway",
            "Accessible-height toilet",
            "Step-free access",
            "Wide entryway",
            "Handheld shower head",
            "Roll-in shower"
        ],
        "highlights": [
            {
                "icon": "schedule",
                "title": "Flexible",
                "desc": "Get a full refund if you change your mind."
            },
            {
                "icon": "key",
                "title": "Exceptional check-in experience",
                "desc": "Recent guests gave the check-in process a 5-star rating."
            },
            {
                "icon": "mapMarker",
                "title": "Walkable area",
                "desc": "Guests say this area is easy to get around."
            }
        ],
        "ratings": {
            "avg": 0,
            "count": 0,
            "overall": 4.9,
            "categories": {
                "cleanliness": 4.7,
                "accuracy": 4.9,
                "checkIn": 4.9,
                "communication": 4.8,
                "location": 5.0,
                "value": 4.9
            },
            "cleanliness": 4.7
        },
        "host": {
            "_id": "s323",
            "fullname": "Uptown",
            "location": "New South Wales, Australia",
            "about": "We live in Sydney and run an executive accommodation business in Sydney and Brisbane. All our apartments are located in high-demand inner-city locations, a short distance from the CBD. Whether you’re on a business trip or vacation for a few days, or are after a longer stay due to relocating or home renovations, we have executive accommodation to suit your needs. Our apartments offer everything you require for a short-term or long-term stay. All our apartments are fully furnished and have a fully equipped kitchen (complete with all kitchenware), a washing machine and dryer, a brand new flatscreen tv and a Nespresso coffee machine, along with an initial supply of capsules for you to enjoy. We provide linen and towels, platinum Foxtel (cable tv) access and free wifi in every apartment. We pride ourselves on our customer service, ensuring that your stay is a uniquely positive experience. We encourage guests to provide feedback, and regularly update our apartments and services based on your recommendations. We look forward to having you to stay and aim to ensure you keep coming back.",
            "responseTime": "within a few hours",
            "thumbnailUrl": "https://a0.muscache.com/im/pictures/c5588bcf-22ad-44d3-8b76-634ca05a761a.jpg?aki_policy=profile_small",
            "pictureUrl": "https://a0.muscache.com/im/pictures/c5588bcf-22ad-44d3-8b76-634ca05a761a.jpg?aki_policy=profile_x_medium",
            "isSuperhost": false,
            "id": "75880256",
            "imgUrl": "https://randomuser.me/api/portraits/women/44.jpg",
            "role": "Photographer and travel enthusiast",
            "favoritesong": "Clair de Lune",
            "bio": "Traveling is my passion, and I love capturing moments through my lens. When I'm not behind the camera, you can find me exploring new cultures and cuisines.",
            "monthsHosting": 12,
            "reviews": 45,
            "rating": 4.67,
            "responseRate": 95
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
            "Flexible"
        ]
    }

]

    saveToStorage(STORAGE_KEY, stays)
}

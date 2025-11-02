console.log('VITE_LOCAL:', import.meta.env.VITE_LOCAL)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)

import React, { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import { StayIndex } from './pages/StayIndex.jsx'
import { StayDetails } from './pages/StayDetails.jsx'
import { UserProfile } from './pages/UserProfile.jsx'
import { LoginSignup } from './pages/LoginSignup.jsx'
import { ImagePage } from './pages/ImagePage.jsx'
import { HostSetup } from './pages/HostSetup.jsx'
import { HostingDashboard } from './pages/HostingDashboard.jsx'
import { HostStayForm } from './pages/HostStayForm.jsx'
import { HostStayLocation } from './pages/HostStayLocation.jsx'
import { HostStayAvailability } from './pages/HostStayAvailability.jsx'
import { HostStayAmenities } from './pages/HostStayAmenities.jsx'
import { HostStayCapacityRules } from './pages/HostStayCapacityRules.jsx'
import { HostStayPricingMedia } from './pages/HostStayPricingMedia.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import { AppHeader } from './cmps/AppHeader.jsx'
import { AppFooter } from './cmps/AppFooter.jsx'
import { socketService } from './services/socket.service.js'

const Wishlist = lazy(() =>
    import('./pages/Wishlist.jsx').then(m => ({ default: m.default || m.Wishlist }))
)
const MyTrips = lazy(() =>
    import('./pages/MyTrips.jsx').then(m => ({ default: m.default || m.MyTrips }))
)
const PaymentPage = lazy(() =>
    import('./pages/PaymentPage.jsx').then(m => ({ default: m.default || m.PaymentPage }))
)
const HostPending = lazy(() =>
    import('./pages/HostPending.jsx').then(m => ({ default: m.default || m.HostPending }))
)

export function RootCmp() {
    const location = useLocation()
    const path = location.pathname
    const [showAuthModal, setShowAuthModal] = useState(false)

    const isStayDetails = /^\/stay\/[^/]+$/.test(path)
    const isMini =
        isStayDetails ||
        path.startsWith('/browse') ||
        path.startsWith('/trips') ||
        path.startsWith('/wishlist') ||
        path.startsWith('/payment')
    const hideHeader = path.includes('/photos')
    const hideFooter = path.startsWith('/host/new')

    useEffect(() => {
        if (isStayDetails) document.body.classList.add('details-page')
        else document.body.classList.remove('details-page')
    }, [isStayDetails])

    useEffect(() => {
        socketService.setup()
        return () => socketService.terminate()
    }, [])

    useEffect(() => {
        const handler = () => setShowAuthModal(true)
        window.addEventListener('open-login-modal', handler)
        return () => window.removeEventListener('open-login-modal', handler)
    }, [])

    return (
        <div className="main-app">
            {!hideHeader && <AppHeader isMini={isMini} onLoginClick={() => setShowAuthModal(true)} />}

            <main className="main-container">
                <Suspense fallback={null}>
                    <Routes>
                        <Route path="/" element={<StayIndex />} />
                        <Route
                            path="stay/:stayId"
                            element={
                                <section className="main-container stay-details-container">
                                    <StayDetails />
                                </section>
                            }
                        />
                        <Route path="stay/:stayId/photos" element={<ImagePage />} />
                        <Route path="user/:id" element={<UserProfile />} />

                        <Route path="host/start" element={<HostSetup />} />
                        <Route path="hosting" element={<HostingDashboard />} />
                        <Route path="hosting/pending" element={<HostPending />} />
                        <Route path="host/new" element={<HostStayForm />} />
                        <Route path="host/new/step-2" element={<HostStayLocation />} />
                        <Route path="host/new/step-3" element={<HostStayAvailability />} />
                        <Route path="host/new/step-4" element={<HostStayAmenities />} />
                        <Route path="host/new/step-5" element={<HostStayCapacityRules />} />
                        <Route path="host/new/step-6" element={<HostStayPricingMedia />} />

                        <Route path="browse" element={<BrowsePage />} />
                        <Route path="wishlist" element={<Wishlist />} />
                        <Route path="trips" element={<MyTrips />} />
                        <Route path="payment" element={<PaymentPage />} />
                    </Routes>
                </Suspense>

                {showAuthModal && <LoginSignup onClose={() => setShowAuthModal(false)} />}
            </main>

            {!hideFooter && <AppFooter />}
        </div>
    )
}

export default RootCmp

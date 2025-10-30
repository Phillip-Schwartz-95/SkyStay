console.log('VITE_LOCAL:', import.meta.env.VITE_LOCAL)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)

import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import { StayIndex } from './pages/StayIndex.jsx'
import { StayDetails } from './pages/StayDetails.jsx'
import { UserProfile } from './pages/UserProfile.jsx'
import { LoginSignup, Login, Signup } from './pages/LoginSignup.jsx'
import { ImagePage } from './pages/ImagePage.jsx'
import { HostSetup } from './pages/HostSetup.jsx'
import { HostingDashboard } from './pages/HostingDashboard.jsx'
import { HostStayForm } from './pages/HostStayForm.jsx'
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

export function RootCmp() {
    const location = useLocation()
    const path = location.pathname
    const isStayDetails = /^\/stay\/[^/]+$/.test(path)
    const isMini =
        isStayDetails ||
        path.startsWith('/browse') ||
        path.startsWith('/trips') ||
        path.startsWith('/wishlist') ||
        path.startsWith('/payment')
    const hideHeader = path.includes('/photos')

    useEffect(() => {
        if (isStayDetails) document.body.classList.add('details-page')
        else document.body.classList.remove('details-page')
    }, [isStayDetails])

    useEffect(() => {
        socketService.setup()
        return () => socketService.terminate()
    }, [])

    return (
        <div className="main-app">
            {!hideHeader && <AppHeader isMini={isMini} />}

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
                        <Route path="auth" element={<LoginSignup />}>
                            <Route path="login" element={<Login />} />
                            <Route path="signup" element={<Signup />} />
                        </Route>
                        <Route path="host/start" element={<HostSetup />} />
                        <Route path="hosting" element={<HostingDashboard />} />
                        <Route path="host/new" element={<HostStayForm />} />
                        <Route path="browse" element={<BrowsePage />} />
                        <Route path="wishlist" element={<Wishlist />} />
                        <Route path="trips" element={<MyTrips />} />
                        <Route path="payment" element={<PaymentPage />} />
                    </Routes>
                </Suspense>
            </main>

            <AppFooter />
        </div>
    )
}

export default RootCmp

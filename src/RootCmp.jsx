import React from 'react'
import { Routes, Route, useLocation } from 'react-router'

import { StayIndex } from './pages/StayIndex.jsx'
import { StayDetails } from './pages/StayDetails.jsx'
import { UserProfile } from './pages/UserProfile.jsx'
import { LoginSignup, Login, Signup } from './pages/LoginSignup.jsx'
import { ImagePage } from './pages/ImagePage.jsx'

import { AppHeader } from './cmps/AppHeader.jsx'
import { UserMsg } from './cmps/UserMsg.jsx'
import { AppFooter } from './cmps/AppFooter.jsx'

export function RootCmp() {
    const location = useLocation()

    //condition: hide header on photo gallery page
    const hideHeader = location.pathname.includes('/photos')

    return (
        <div className="main-app">
            {!hideHeader && <AppHeader />}

            <main>
                <Routes>
                    <Route path="/" element={<StayIndex />} />
                    <Route path="stay/:stayId" element={<StayDetails />} />
                    <Route path="stay/:stayId/photos" element={<ImagePage />} />
                    <Route path="user/:id" element={<UserProfile />} />
                    <Route path="auth" element={<LoginSignup />}>
                        <Route path="login" element={<Login />} />
                        <Route path="signup" element={<Signup />} />
                    </Route>

                    {/* Future routes (currently disabled) */}
                    {/* <Route path="about" element={<AboutUs />}>
                        <Route path="team" element={<AboutTeam />} />
                        <Route path="vision" element={<AboutVision />} />
                    </Route>
                    <Route path="review" element={<ReviewIndex />} />
                    <Route path="chat" element={<ChatApp />} />
                    <Route path="admin" element={<AdminIndex />} /> */}
                </Routes>
            </main>

            {/* <AppFooter /> */}
        </div>
    )
}



import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainMenu } from './features/main-menu/MainMenu'
import { SelectTeam } from './features/setup/SelectTeam'
import { SelectLeague } from './features/setup/SelectLeague'
import { DashboardLayout } from './features/dashboard/DashboardLayout'
import { Dashboard } from './features/dashboard/Dashboard'
import { RosterView } from './features/dashboard/roster/RosterView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/select-league" element={<SelectLeague />} />
        <Route path="/select-team" element={<SelectTeam />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="roster" element={<RosterView />} />
          <Route path="standings" element={<div style={{ color: 'white', padding: '20px' }}>STANDINGS (Em Breve)</div>} />
          <Route path="calendar" element={<div style={{ color: 'white', padding: '20px' }}>CALENDAR (Em Breve)</div>} />
          <Route path="shop" element={<div style={{ color: 'white', padding: '20px' }}>SHOP (Em Breve)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

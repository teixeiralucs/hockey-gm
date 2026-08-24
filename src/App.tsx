import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainMenu } from './features/main-menu/MainMenu'
import { SelectTeam } from './features/setup/SelectTeam'

const DashboardPlaceholder = () => <div className="p-8 text-white"><h1 className="font-display text-4xl">Dashboard</h1></div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/select-team" element={<SelectTeam />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

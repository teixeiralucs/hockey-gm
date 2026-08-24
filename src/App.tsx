import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainMenu } from './features/main-menu/MainMenu'

// Placeholder page
const SelectTeam = () => <div style={{padding: '50px', color: 'white'}}><h1 className="font-display">Select Team Interface Coming Soon</h1></div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/select-team" element={<SelectTeam />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

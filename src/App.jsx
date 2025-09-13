import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Dashboard from './Pages/Dashboard'
import ApplicationForm from './Pages/AddProfile'
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<ApplicationForm/>}/>
      <Route path="/Admin" element={<Dashboard/>}/>
    </Routes>
    </BrowserRouter>
    
    </>
  )
}

export default App


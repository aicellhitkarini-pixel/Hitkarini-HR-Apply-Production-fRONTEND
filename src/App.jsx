// App.jsx
import { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './Pages/Dashboard'
import ApplicationForm from './Pages/AddProfile'
import { BrowserRouter, Routes, Route } from "react-router-dom";

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "hitkarini" && password === "#hiktarini") {
      localStorage.setItem("isAdmin", "true"); // ✅ store login state
      onLogin();
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h2 className="admin-title">Admin Panel Login</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <input 
            type="text" 
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="admin-input"
          />
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
          />
          <button type="submit" className="admin-btn">Login</button>
        </form>
        {error && <p className="admin-error">{error}</p>}
      </div>
    </div>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Check localStorage when app loads
  useEffect(() => {
    const storedAdmin = localStorage.getItem("isAdmin");
    if (storedAdmin === "true") {
      setIsAdmin(true);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ApplicationForm/>} />
        <Route 
          path="/Admin" 
          element={
            isAdmin ? <Dashboard/> : <AdminLogin onLogin={() => setIsAdmin(true)} />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App;

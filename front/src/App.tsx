import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Home from "../components/home/Home";
import { Nav } from "../components/nav/Nav";
import Profile from "../components/profile/Profile";
import TelegramClient from "../components/telegram/TelegramClient";

const AppLayout = () => {
  const location = useLocation();
  const noNavRoutes = ["/", "/home", "/profile"];
  const mainClass =
    location.pathname === "/profile"
      ? "flex-grow"
      : "flex-grow overflow-y-auto";

  const handleLogout = () => {
    console.log("Logout clicked");
    localStorage.clear();
    window.location.href = "/home";
  };

  const handleSettingsClick = () => {
    console.log("Settings clicked");
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {!noNavRoutes.includes(location.pathname) && (
        <Nav onLogout={handleLogout} onSettingsClick={handleSettingsClick} />
      )}
      <main className={mainClass}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/telegram" element={<TelegramClient />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;

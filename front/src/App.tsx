import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LandingPage from "../components/home/Home"; // Correct path to the component
import TelegramClient from "../components/telegram/TelegramClient";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/telegram" element={<TelegramClient />} />
          {/* We can add more routes here, like /whatsapp */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;

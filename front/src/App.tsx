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
import WhatsAppClient from "../components/whatsapp/WhatsAppClient";
import Security from "../components/security/Security";
import { useEffect } from "react";
import { useMessagingStore } from "../components/messaging/MessagingStore";
import { LanguageProvider } from "../components/i18n/LanguageContext";

const AppLayout = () => {
  // Initialize messaging providers once
  useEffect(() => {
    useMessagingStore.getState().initializeProviders();
  }, []);
  const location = useLocation();
  const noNavRoutes = ["/", "/home", "/profile", "/security"];
  const mainClass =
    location.pathname === "/profile"
      ? "flex-grow"
      : "flex-grow overflow-y-auto";

  const handleSettingsClick = () => {
    console.log("Settings clicked");
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground relative">
      {!noNavRoutes.includes(location.pathname) && (
        <Nav onSettingsClick={handleSettingsClick} />
      )}
      <main className={`${mainClass} relative`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/telegram" element={<TelegramClient />} />
          <Route path="/whatsapp" element={<WhatsAppClient />} />
          <Route path="/security" element={<Security />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <Router>
        <AppLayout />
      </Router>
    </LanguageProvider>
  );
}

export default App;

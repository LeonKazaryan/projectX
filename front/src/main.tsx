import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Home from "../components/home/Home.tsx";
import TelegramClient from "../components/telegram/TelegramClient.tsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/telegram" element={<TelegramClient />} />
      <Route path="/app" element={<App />} />
    </Routes>
  </BrowserRouter>
);

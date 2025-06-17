import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Main from "../components/home/Home.tsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Main />} />
    </Routes>
  </BrowserRouter>
);

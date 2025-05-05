// src/App.js
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import HomePage from "./app/setting/page";
import OmzetReport from "./app/kasir/omset";
import Login from "./app/pageKasir";
import HomeBase from "./app/kasir/page";
import History from "./app/kasir/riwayat";
import Absensi from "./app/pageAbsen";
import AbsensiPage from "./app/absensi/page";
import HomeDefaultPage from "./app/page";
import AdminLogin from "./app/pageAdmin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeDefaultPage />} />
        <Route path="/adminLogin" element={<AdminLogin />} />
        <Route path="/kasirLogin" element={<Login />} />
        <Route path="/absensiLogin" element={<Absensi />} />
        <Route path="/absensi" element={<AbsensiPage />} />
        <Route path="/kasir" element={<HomeBase />} />
        <Route path="/omset" element={<OmzetReport />} />
        <Route path="/setting" element={<HomePage />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

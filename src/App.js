// src/App.js
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import HomePage from "./app/setting/page";
import OmzetReport from "./app/omset/page";
import Login from "./app/page";
import HomeBase from "./app/main/page";
import History from "./app/history/page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/main" element={<HomeBase />} />
        <Route path="/omset" element={<OmzetReport />} />
        <Route path="/setting" element={<HomePage />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

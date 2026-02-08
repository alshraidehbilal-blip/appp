import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import UsersPage from "./pages/UsersPage";
import PatientsPage from "./pages/PatientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";

function App() {
  return (
    <Router>
      <div className="bg-black min-h-screen text-white">
        <Navbar />
        <div className="p-4">
          <Routes>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

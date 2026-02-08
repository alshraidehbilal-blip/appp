import React from "react";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-green-600 p-4 flex justify-between">
      <div className="text-white font-bold">Clinic App</div>
      <div className="space-x-4">
        <Link to="/users" className="hover:text-black">Users</Link>
        <Link to="/patients" className="hover:text-black">Patients</Link>
        <Link to="/appointments" className="hover:text-black">Appointments</Link>
      </div>
    </nav>
  );
}

export default Navbar;

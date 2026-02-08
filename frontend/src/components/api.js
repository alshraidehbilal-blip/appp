const BASE_URL = "https://appp-6.onrender.com/api";

export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/users`);
  return res.json();
}

export async function fetchPatients() {
  const res = await fetch(`${BASE_URL}/patients`);
  return res.json();
}

export async function fetchAppointments() {
  const res = await fetch(`${BASE_URL}/appointments`);
  return res.json();
}

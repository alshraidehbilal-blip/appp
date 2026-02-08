const BASE_URL = "https://appp-6.onrender.com/api";

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: "include", // مهم جدًا
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error("API Error");
  }

  return res.json();
}

export const fetchUsers = () => request("/users");
export const fetchPatients = () => request("/patients");
export const fetchAppointments = () => request("/appointments");

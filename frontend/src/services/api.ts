const API_URL = import.meta.env.VITE_API_URL;

export async function getVehicles() {
  const response = await fetch(`${API_URL}/vehicles`);
  return await response.json();
}

export async function createVehicle(data: any) {
  const response = await fetch(`${API_URL}/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await response.json();
}
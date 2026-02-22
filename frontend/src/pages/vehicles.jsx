import { useEffect, useState } from "react";
import { getVehicles } from "../services/api";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const data = await getVehicles();
    setVehicles(data);
  }

  return (
    <div>
      <h1>Vehicles</h1>

      {vehicles.map((vehicle) => (
        <div key={vehicle._id}>
          {vehicle.name}
        </div>
      ))}
    </div>
  );
}
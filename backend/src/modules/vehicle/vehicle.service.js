import Vehicle from "./vehicle.model.js";

export async function createVehicle(data) {

  return Vehicle.create(data);

}

export async function getVehicles() {

  return Vehicle.find().sort({ createdAt: -1 });

}

export async function getVehicleById(id) {

  return Vehicle.findById(id);

}

export async function updateVehicleStatus(id, status) {

  return Vehicle.findByIdAndUpdate(

    id,

    { status },

    { new: true }

  );

}

export async function deleteVehicle(id) {

  return Vehicle.findByIdAndDelete(id);

}

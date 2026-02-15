import Truck from "../models/Truck.js";

export async function createTruck(req, res) {
  try {
    const truck = await Truck.create(req.body);

    res.status(201).json({
      success: true,
      data: truck
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getTrucks(req, res) {
  try {
    const trucks = await Truck.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: trucks
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

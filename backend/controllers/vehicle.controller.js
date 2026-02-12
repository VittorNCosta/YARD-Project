const Vehicle = require("../models/Vehicle");

// Criar veículo
exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Listar veículos
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar status
exports.updateVehicleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Deletar veículo
exports.deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: "Veículo removido com sucesso" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

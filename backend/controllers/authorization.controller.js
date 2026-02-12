const Authorization = require("../models/Authorization");
const Vehicle = require("../models/Vehicle");

// Criar autorização
exports.createAuthorization = async (req, res) => {
  try {
    const authorization = await Authorization.create(req.body);
    res.status(201).json(authorization);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Listar autorizações
exports.getAuthorizations = async (req, res) => {
  try {
    const authorizations = await Authorization.find().populate("vehicle");
    res.json(authorizations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Aprovar autorização
exports.approveAuthorization = async (req, res) => {
  try {
    const authorization = await Authorization.findById(req.params.id);

    if (!authorization) {
      return res.status(404).json({ error: "Autorização não encontrada" });
    }

    authorization.status = "APROVADA";
    authorization.authorizedAt = new Date();
    await authorization.save();

    // Atualiza status do veículo automaticamente
    await Vehicle.findByIdAndUpdate(authorization.vehicle, {
      status: "DOCA",
    });

    res.json(authorization);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

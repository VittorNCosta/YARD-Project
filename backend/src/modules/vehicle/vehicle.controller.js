import * as vehicleService from "./vehicle.service.js";

export async function createVehicle(req, res, next) {

  try {

    const vehicle = await vehicleService.createVehicle(req.body);

    res.status(201).json({

      success: true,

      data: vehicle

    });

  } catch (error) {

    next(error);

  }

}

export async function getVehicles(req, res, next) {

  try {

    const vehicles = await vehicleService.getVehicles();

    res.json({

      success: true,

      count: vehicles.length,

      data: vehicles

    });

  } catch (error) {

    next(error);

  }

}

export async function getVehicleById(req, res, next) {

  try {

    const vehicle = await vehicleService.getVehicleById(req.params.id);

    res.json({

      success: true,

      data: vehicle

    });

  } catch (error) {

    next(error);

  }

}

export async function updateVehicleStatus(req, res, next) {

  try {

    const vehicle = await vehicleService.updateVehicleStatus(

      req.params.id,

      req.body.status

    );

    res.json({

      success: true,

      data: vehicle

    });

  } catch (error) {

    next(error);

  }

}

export async function deleteVehicle(req, res, next) {

  try {

    await vehicleService.deleteVehicle(req.params.id);

    res.json({

      success: true,

      message: "Vehicle deleted successfully"

    });

  } catch (error) {

    next(error);

  }

}

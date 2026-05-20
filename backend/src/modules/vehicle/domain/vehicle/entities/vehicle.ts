import type { Optional } from "@/core/types/optional";

import { VehicleActiveStatus } from "../enums/vehicle-active-status";

/**
 * Contrato de propriedades do Vehicle. Reflete 1:1 o schema Mongoose
 * legado (backend/src/modules/vehicle/vehicle.model.ts) — qualquer campo
 * adicional precisa ser adicionado aqui e no mapper.
 */
export interface VehicleProps {
    id?: string;

    // Obrigatórios
    plate: string;
    driverName: string;
    cargoType: string;
    status: string;

    // Opcionais usados pelo cadastro/dashboard
    color?: string;
    driverCpf?: string;
    vehicleType?: string;
    weighingRequired?: boolean;
    activeStatus?: VehicleActiveStatus;
    entryDate?: Date;
    arrivalDate?: Date;
    departureDate?: Date;
    releasedBy?: string;
    processType?: string;
    entryWeight?: string;
    exitWeight?: string;
    dock?: string;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Entidade Vehicle.
 *
 * Seguindo o STYLE_GUIDE:
 * - Constructor privado; criação via `Vehicle.create()`.
 * - Defaults aplicados no factory estático.
 * - Zero dependência de framework/ODM na camada de domínio.
 */
export class Vehicle {
    id?: string;
    plate: string;
    driverName: string;
    cargoType: string;
    status: string;
    color?: string;
    driverCpf?: string;
    vehicleType?: string;
    weighingRequired?: boolean;
    activeStatus?: VehicleActiveStatus;
    entryDate?: Date;
    arrivalDate?: Date;
    departureDate?: Date;
    releasedBy?: string;
    processType?: string;
    entryWeight?: string;
    exitWeight?: string;
    dock?: string;
    createdAt: Date;
    updatedAt: Date;

    private constructor(props: VehicleProps) {
        this.id = props.id;
        this.plate = props.plate;
        this.driverName = props.driverName;
        this.cargoType = props.cargoType;
        this.status = props.status;
        this.color = props.color;
        this.driverCpf = props.driverCpf;
        this.vehicleType = props.vehicleType;
        this.weighingRequired = props.weighingRequired;
        this.activeStatus = props.activeStatus;
        this.entryDate = props.entryDate;
        this.arrivalDate = props.arrivalDate;
        this.departureDate = props.departureDate;
        this.releasedBy = props.releasedBy;
        this.processType = props.processType;
        this.entryWeight = props.entryWeight;
        this.exitWeight = props.exitWeight;
        this.dock = props.dock;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    static create(
        props: Optional<
            VehicleProps,
            | "id"
            | "color"
            | "driverCpf"
            | "vehicleType"
            | "weighingRequired"
            | "activeStatus"
            | "entryDate"
            | "arrivalDate"
            | "departureDate"
            | "releasedBy"
            | "processType"
            | "entryWeight"
            | "exitWeight"
            | "dock"
            | "createdAt"
            | "updatedAt"
        >
    ): Vehicle {
        const now = new Date();
        return new Vehicle({
            ...props,
            weighingRequired: props.weighingRequired ?? false,
            activeStatus: props.activeStatus ?? VehicleActiveStatus.ACTIVE,
            entryDate: props.entryDate ?? now,
            createdAt: props.createdAt ?? now,
            updatedAt: props.updatedAt ?? now,
        });
    }

    changeStatus(status: string): void {
        this.status = status;
        this.updatedAt = new Date();
    }
}

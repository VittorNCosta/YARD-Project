import type { Optional } from "@/core/types/optional";

import { DockStatus } from "../enums/dock-status";

export interface DockProps {
    id?: string;
    code: string;
    name?: string;
    status: DockStatus;
    maintenanceReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateDockProps {
    code?: string;
    name?: string;
    status?: DockStatus;
    maintenanceReason?: string;
}

export class Dock {
    id?: string;
    code: string;
    name?: string;
    status: DockStatus;
    maintenanceReason?: string;
    createdAt: Date;
    updatedAt: Date;

    private constructor(props: DockProps) {
        this.id = props.id;
        this.code = props.code;
        this.name = props.name;
        this.status = props.status;
        this.maintenanceReason = props.maintenanceReason;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    static create(
        props: Optional<
            DockProps,
            "id" | "name" | "status" | "maintenanceReason" | "createdAt" | "updatedAt"
        >
    ): Dock {
        const now = new Date();
        return new Dock({
            ...props,
            code: props.code.trim(),
            name: props.name?.trim(),
            status: props.status ?? DockStatus.ACTIVE,
            maintenanceReason: props.maintenanceReason?.trim(),
            createdAt: props.createdAt ?? now,
            updatedAt: props.updatedAt ?? now,
        });
    }

    update(props: UpdateDockProps): void {
        if (props.code !== undefined) {
            this.code = props.code.trim();
        }

        if (props.name !== undefined) {
            this.name = props.name.trim() || undefined;
        }

        if (props.status !== undefined) {
            this.status = props.status;
        }

        if (props.maintenanceReason !== undefined) {
            this.maintenanceReason = props.maintenanceReason.trim() || undefined;
        }

        if (this.status !== DockStatus.MAINTENANCE) {
            this.maintenanceReason = undefined;
        }

        this.updatedAt = new Date();
    }

    isActive(): boolean {
        return this.status === DockStatus.ACTIVE;
    }
}


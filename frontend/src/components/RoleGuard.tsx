import React, { useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { useToast } from "./toast-context";
import type { UserRole } from "../services/auth";

interface RoleGuardProps {
  role: UserRole;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ role }) => {
  const { user } = useAuth();
  const toast = useToast();
  const notifiedRef = useRef<boolean>(false);

  const denied = !user || user.role !== role;

  useEffect(() => {
    if (denied && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.error({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área.",
      });
    }
  }, [denied, toast]);

  if (denied) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;

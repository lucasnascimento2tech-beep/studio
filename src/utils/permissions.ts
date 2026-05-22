
import { GlobalRole, AreaType, Module } from "@/types/journey";

export function canAccessArea(effectiveAreas: AreaType[], area: AreaType): boolean {
  if (effectiveAreas.includes("todos")) return true;
  return effectiveAreas.includes(area);
}

export function canAccessModule(
  userRole: GlobalRole,
  effectiveAreas: AreaType[],
  module: Module
): boolean {
  if (userRole === "admin_2tech" || userRole === "implantador" || userRole === "client_master") {
    return true;
  }
  return canAccessArea(effectiveAreas, module.area);
}

export function isPendingUser(user: any): boolean {
  return user?.globalRole === "client_pending" || user?.approvalStatus === "pending";
}

export function canManageParticipants(user: any): boolean {
  return user?.globalRole === "client_master" || user?.globalRole === "admin_2tech";
}

export function canAccessPrivateJourney(user: any): boolean {
  return user?.globalRole === "client_master" || user?.globalRole === "client_participant";
}

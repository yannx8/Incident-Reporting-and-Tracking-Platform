import { UserRole } from '@prisma/client';
export const hasRole = (roles: UserRole[], role: UserRole) => roles.includes(role);
export const isAdmin = (roles: UserRole[]) => hasRole(roles, UserRole.ADMINISTRATOR);
export const isResp = (roles: UserRole[]) => hasRole(roles, UserRole.RESPONSABLE);

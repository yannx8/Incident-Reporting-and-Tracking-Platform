export type Role = 'USER' | 'RESPONSABLE' | 'ADMINISTRATOR';
export type UserRole = Role;
export type IncidentStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  organizationId: string;
  organizationName: string;
  roles: UserRole[];
}

export interface User extends AuthUser {}

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
  _count?: { incidents?: number };
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  resolutionText?: string | null;
  site: { name: string; address?: string | null };
  reporter: { name: string };
  assignments: any[];
  progress: any[];
  comments: any[];
  auditEvents: any[];
}

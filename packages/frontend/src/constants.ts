export const statusLabels: Record<string, string> = {
  NEW: 'Nouveau',
  ASSIGNED: 'Assigné',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'À vérifier',
  CLOSED: 'Clôturé'
};

export const priorityLabels: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique'
};

export const CATEGORY_LABELS: Record<string, string> = {
  LIGHTING: 'Éclairage',
  PLUMBING: 'Plomberie',
  SECURITY: 'Sécurité',
  FURNITURE: 'Mobilier',
  ROAD: 'Voirie',
  EQUIPMENT: 'Équipement',
  HVAC: 'Climatisation',
  OTHER: 'Autre'
};

export const categoryPriorityClass: Record<string, string> = {
  CRITICAL: 'category-critical',
  HIGH: 'category-high',
  MEDIUM: 'category-medium',
  LOW: 'category-low'
};

export const statusDotClass: Record<string, string> = {
  NEW: 'fill-new',
  ASSIGNED: 'fill-assigned',
  IN_PROGRESS: 'fill-progress',
  RESOLVED: 'fill-resolved',
  CLOSED: 'fill-closed'
};

export const statusClassMap: Record<string, string> = {
  NEW: 'status-new',
  ASSIGNED: 'status-assigned',
  IN_PROGRESS: 'status-progress',
  RESOLVED: 'status-resolved',
  CLOSED: 'status-closed'
};

export const priorityClassMap: Record<string, string> = {
  LOW: 'priority-low',
  MEDIUM: 'priority-medium',
  HIGH: 'priority-high',
  CRITICAL: 'priority-critical'
};

export const siteColors = ['#286c61', '#c7783a', '#6a5a9a', '#98a6af'];

export const notifIconClass: Record<string, string> = {
  CRITICAL: 'notif-critical',
  HIGH: 'notif-critical',
  MEDIUM: 'notif-info',
  LOW: 'notif-info',
  default: 'notif-success'
};

export const timelineDotClass: Record<string, string> = {
  INCIDENT_CREATED: 'dot-created',
  INCIDENT_ASSIGNED: 'dot-assignment',
  INCIDENT_ACCEPTED: 'dot-assignment',
  STATUS_CHANGED: 'dot-status',
  RESOLUTION_SUBMITTED: 'dot-resolution',
  RESOLUTION_ACCEPTED: 'dot-resolution',
  INCIDENT_CLOSED: 'dot-closed',
  RESOLUTION_REJECTED: 'dot-rejected'
};

export const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#16a34a'
};
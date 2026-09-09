import { Zap, Wrench, ShieldAlert, Building2, Navigation, Settings2, Activity } from 'lucide-react';
import { Incident, Notice, Site, Status, Priority, Category } from '../types';

export const categoryIcons: Record<Category, any> = {
  Éclairage: Zap,
  Plomberie: Wrench,
  Sécurité: ShieldAlert,
  Mobilier: Building2,
  Voirie: Navigation,
  Équipement: Settings2,
  Climatisation: Activity,
};


export const sites: Site[] = [
  { id: 'campus', name: 'Campus Horizon', address: '24 rue des Acacias', active: true, incidents: 9, color: '#286c61', lat: 4.0511, lng: 9.7679 },
  { id: 'ateliers', name: 'Ateliers Nord', address: '8 avenue du Port', active: true, incidents: 5, color: '#c7783a', lat: 4.058, lng: 9.761 },
  { id: 'entrepot', name: 'Entrepôt Central', address: '2 boulevard du Rail', active: true, incidents: 4, color: '#6a5a9a', lat: 4.044, lng: 9.778 },
  { id: 'annexe', name: 'Annexe Est', address: '17 chemin du Lac', active: false, incidents: 2, color: '#98a6af', lat: 4.064, lng: 9.786 },
];

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const agoHours = (hours: number) => ago(hours * 60);
const agoDays = (days: number) => ago(days * 24 * 60);

export const initialIncidents: Incident[] = [
  {
    id: 'INC-2409', title: 'Éclairage défectueux — allée B', description: 'Trois lampadaires sont éteints depuis deux jours dans l’allée B. La zone devient difficile à traverser après 19h.', category: 'Éclairage', priority: 'HIGH', status: 'IN_PROGRESS', site: 'Campus Horizon', siteId: 'campus', location: 'Allée B · entrée sud', lat: 4.0518, lng: 9.7691, reporter: 'Camille Dupont', createdAt: agoHours(4), updatedAt: ago(22), assignee: 'Jean Martin', assignmentStatus: 'ACCEPTED', comments: [{ id: 'c1', author: 'Jean Martin', body: 'Je suis sur place. Le boîtier de commande semble hors tension, je vérifie la ligne.', at: ago(28) }], audit: [{ id: 'a1', label: 'Intervention démarrée', actor: 'Jean Martin', at: ago(34), kind: 'status' }, { id: 'a2', label: 'Affecté à Jean Martin', actor: 'Sonia Leroy', at: agoHours(2), kind: 'assignment' }, { id: 'a3', label: 'Signalement créé', actor: 'Camille Dupont', at: agoHours(4), kind: 'created' }],
  },
  {
    id: 'INC-2408', title: 'Fuite d’eau — atelier mécanique', description: 'Une fuite est visible au niveau du raccordement principal. Le sol est glissant autour de la zone.', category: 'Plomberie', priority: 'CRITICAL', status: 'NEW', site: 'Ateliers Nord', siteId: 'ateliers', location: 'Atelier mécanique · raccord principal', lat: 4.0574, lng: 9.7605, reporter: 'Thomas Bernard', createdAt: agoHours(7), updatedAt: agoHours(7), comments: [], audit: [{ id: 'a4', label: 'Signalement créé', actor: 'Thomas Bernard', at: agoHours(7), kind: 'created' }],
  },
  {
    id: 'INC-2407', title: 'Porte coupe-feu ne se referme plus', description: 'La porte coupe-feu située entre les quais 2 et 3 reste ouverte après passage.', category: 'Sécurité', priority: 'HIGH', status: 'ASSIGNED', site: 'Entrepôt Central', siteId: 'entrepot', location: 'Quais 2–3 · niveau 0', lat: 4.0436, lng: 9.7771, reporter: 'Nina Morel', createdAt: agoDays(1), updatedAt: agoHours(3), assignee: 'Aïcha Kamara', assignmentStatus: 'PENDING_ACCEPTANCE', comments: [], audit: [{ id: 'a5', label: 'Affecté à Aïcha Kamara', actor: 'Sonia Leroy', at: agoHours(3), kind: 'assignment' }, { id: 'a6', label: 'Signalement créé', actor: 'Nina Morel', at: agoDays(1), kind: 'created' }],
  },
  {
    id: 'INC-2406', title: 'Banc extérieur descellé', description: 'Le banc situé près de l’entrée sud bouge fortement et présente un risque de chute.', category: 'Mobilier', priority: 'MEDIUM', status: 'RESOLVED', site: 'Campus Horizon', siteId: 'campus', location: 'Entrée sud · jardin', lat: 4.049, lng: 9.7658, reporter: 'Camille Dupont', createdAt: agoDays(2), updatedAt: agoHours(9), assignee: 'Jean Martin', assignmentStatus: 'ACCEPTED', resolutionText: 'Fixations remplacées et banc sécurisé. Contrôle visuel réalisé.', comments: [{ id: 'c2', author: 'Jean Martin', body: 'Les fixations ont été remplacées. Résolution proposée pour vérification.', at: agoHours(9) }], audit: [{ id: 'a7', label: 'Résolution proposée', actor: 'Jean Martin', at: agoHours(9), kind: 'resolution' }, { id: 'a8', label: 'Intervention démarrée', actor: 'Jean Martin', at: agoDays(1), kind: 'status' }, { id: 'a9', label: 'Affecté à Jean Martin', actor: 'Sonia Leroy', at: agoDays(2), kind: 'assignment' }],
  },
  {
    id: 'INC-2405', title: 'Dégradation du revêtement parking', description: 'Un nid-de-poule s’est formé près de la borne de sortie du parking visiteurs.', category: 'Voirie', priority: 'LOW', status: 'CLOSED', site: 'Campus Horizon', siteId: 'campus', location: 'Parking visiteurs · sortie', lat: 4.054, lng: 9.773, reporter: 'Olivier Petit', createdAt: agoDays(5), updatedAt: agoDays(1), resolutionText: 'Rebouchage réalisé par l’équipe maintenance.', comments: [], audit: [{ id: 'a10', label: 'Incident clôturé', actor: 'Sonia Leroy', at: agoDays(1), kind: 'closed' }, { id: 'a11', label: 'Résolution proposée', actor: 'Jean Martin', at: agoDays(2), kind: 'resolution' }],
  },
  {
    id: 'INC-2404', title: 'Badgeuse intermittente', description: 'La badgeuse à l’entrée principale ne reconnaît pas toujours les cartes.', category: 'Équipement', priority: 'MEDIUM', status: 'IN_PROGRESS', site: 'Entrepôt Central', siteId: 'entrepot', location: 'Entrée principale', lat: 4.0455, lng: 9.7796, reporter: 'Sarah Ndiaye', createdAt: agoDays(4), updatedAt: agoHours(5), assignee: 'Aïcha Kamara', assignmentStatus: 'ACCEPTED', comments: [], audit: [{ id: 'a12', label: 'Intervention démarrée', actor: 'Aïcha Kamara', at: agoDays(3), kind: 'status' }],
  },
  {
    id: 'INC-2403', title: 'Ventilation bruyante salle 3', description: 'Le système de ventilation génère un bruit important et irrégulier depuis ce matin.', category: 'Climatisation', priority: 'MEDIUM', status: 'NEW', site: 'Ateliers Nord', siteId: 'ateliers', location: 'Salle 3 · niveau 1', lat: 4.0608, lng: 9.7624, reporter: 'Mehdi Ali', createdAt: agoDays(4), updatedAt: agoDays(4), comments: [], audit: [{ id: 'a13', label: 'Signalement créé', actor: 'Mehdi Ali', at: agoDays(4), kind: 'created' }],
  },
];

export const initialNotifications: Notice[] = [
  { id: 'n1', type: 'critical', title: 'Nouvel incident critique', body: 'Fuite d’eau — atelier mécanique', at: agoHours(1), read: false, incidentId: 'INC-2408' },
  { id: 'n2', type: 'info', title: 'Résolution à vérifier', body: 'Banc extérieur descellé', at: agoHours(3), read: false, incidentId: 'INC-2406' },
  { id: 'n3', type: 'success', title: 'Intervention démarrée', body: 'Éclairage défectueux — allée B', at: agoHours(4), read: true, incidentId: 'INC-2409' },
];

export const statusMeta: Record<Status, { label: string; className: string }> = {
  NEW: { label: 'Nouveau', className: 'status-new' },
  ASSIGNED: { label: 'Assigné', className: 'status-assigned' },
  IN_PROGRESS: { label: 'En cours', className: 'status-progress' },
  RESOLVED: { label: 'À vérifier', className: 'status-resolved' },
  CLOSED: { label: 'Clôturé', className: 'status-closed' },
};

export const priorityMeta: Record<Priority, { label: string; className: string }> = {
  LOW: { label: 'Basse', className: 'priority-low' },
  MEDIUM: { label: 'Moyenne', className: 'priority-medium' },
  HIGH: { label: 'Haute', className: 'priority-high' },
  CRITICAL: { label: 'Critique', className: 'priority-critical' },
};

export const formatTime = (value: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(value));
export const relativeTime = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
};

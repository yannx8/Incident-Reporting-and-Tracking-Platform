import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../api/incidents';
import { categoryIcons, priorityMeta, statusMeta, formatDate, formatTime, relativeTime } from '../lib/mockData';
import { ArrowLeft, MoreHorizontal, MapPin, ChevronRight, CheckCircle2, Paperclip, Send, Activity, AlertTriangle, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Status, Priority } from '../types';

// Fix leaflet default marker icon in bundled builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function StatusIcon({ status }: { status: Status }) {
  if (status === 'CLOSED') return <Check size={14} />;
  if (status === 'RESOLVED') return <CheckCircle2 size={14} />;
  if (status === 'NEW') return <AlertTriangle size={14} />;
  return <Activity size={14} />;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority-badge ${priorityMeta[priority].className}`}><i />{priorityMeta[priority].label}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge ${statusMeta[status].className}`}><i />{statusMeta[status].label}</span>;
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading, error } = useIncident(id || '');
  const [comment, setComment] = useState('');

  if (isLoading) return <div className="p-8">Chargement...</div>;
  if (error || !incident) return <div className="p-8 text-red-500">Incident introuvable.</div>;

  const Icon = categoryIcons[incident.category];
  const actionLabel: Partial<Record<Status, string>> = {
    NEW: 'Affecter un responsable',
    ASSIGNED: "Accepter l'affectation",
    IN_PROGRESS: 'Proposer la resolution',
    RESOLVED: "Cloture l'incident",
  };

  return (
    <div className="page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="incident-drawer" style={{ position: 'relative', width: '100%', height: 'auto', border: 'none', boxShadow: 'none' }}>
        <div className="drawer-header" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <button className="drawer-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />Retour
          </button>
        </div>
        
        <div className="drawer-content" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <div className="drawer-kicker">
            <span>{incident.id}</span><span>·</span><span>{formatDate(incident.createdAt)}</span>
            <span className="drawer-kicker-spacer" />
            <button className="icon-button small"><MoreHorizontal size={17} /></button>
          </div>
          
          <div className="drawer-title-row">
            <div className={`drawer-category category-${incident.priority.toLowerCase()}`}><Icon size={21} /></div>
            <div>
              <h2>{incident.title}</h2>
              <div className="drawer-meta">
                <StatusBadge status={incident.status} />
                <PriorityBadge priority={incident.priority} />
              </div>
            </div>
          </div>
          
          <div className="drawer-location">
            <MapPin size={15} /><span>{incident.site}</span><i />{incident.location}
          </div>

          {/* Read-only location map pinpointing the incident */}
          <div className="mini-map" style={{ height: 180, borderRadius: 8, overflow: 'hidden', marginBottom: 16, zIndex: 0 }}>
            <MapContainer
              center={[incident.lat, incident.lng]}
              zoom={16}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              zoomControl={false}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[incident.lat, incident.lng]} />
            </MapContainer>
          </div>
          
          <div className="drawer-action-wrap">
            {incident.status !== 'CLOSED' && (
              <button className="button button-primary drawer-action">
                {actionLabel[incident.status]}<ChevronRight size={16} />
              </button>
            )}
            {incident.status === 'CLOSED' && (
              <div className="closed-message"><CheckCircle2 size={17} />Dossier clôturé · lecture seule</div>
            )}
          </div>
          
          <section className="drawer-section">
            <h3>Signalement original</h3>
            <p className="drawer-description">{incident.description}</p>
            <div className="reporter-line">
              <div className="avatar avatar-orange small-avatar">
                {incident.reporter.split(' ').map((name) => name[0]).join('')}
              </div>
              <div><span>Signalé par</span><strong>{incident.reporter}</strong></div>
              <time>{formatDate(incident.createdAt)} à {formatTime(incident.createdAt)}</time>
            </div>
          </section>
          
          {incident.assignee && (
            <section className="drawer-section assignment-section">
              <div className="section-title-line">
                <h3>Responsabilité</h3>
                <span className="assignment-active"><i />Affectation active</span>
              </div>
              <div className="assignment-card">
                <div className="avatar avatar-purple small-avatar">
                  {incident.assignee.split(' ').map((name) => name[0]).join('')}
                </div>
                <div>
                  <strong>{incident.assignee}</strong>
                  <span>{incident.assignmentStatus === 'ACCEPTED' ? 'Intervention en cours' : 'En attente d’acceptation'}</span>
                </div>
                <ChevronRight size={16} />
              </div>
            </section>
          )}
          
          <section className="drawer-section">
            <div className="section-title-line">
              <h3>Chronologie</h3>
              <span className="timeline-count">{incident.audit.length} événements</span>
            </div>
            <div className="timeline">
              {incident.audit.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <div className={`timeline-icon timeline-${event.kind}`}>
                    <StatusIcon status={event.kind === 'created' ? 'NEW' : event.kind === 'closed' ? 'CLOSED' : event.kind === 'resolution' ? 'RESOLVED' : 'IN_PROGRESS'} />
                  </div>
                  <div>
                    <strong>{event.label}</strong>
                    <span>{event.actor} · {relativeTime(event.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="drawer-section comments-section">
            <div className="section-title-line">
              <h3>Commentaires</h3>
              <span className="timeline-count">{incident.comments.length}</span>
            </div>
            
            {incident.comments.length > 0 && (
              <div className="comment-list">
                {incident.comments.map((item) => (
                  <div className="comment" key={item.id}>
                    <div className="avatar avatar-green small-avatar">
                      {item.author.split(' ').map((name) => name[0]).join('')}
                    </div>
                    <div>
                      <div className="comment-head">
                        <strong>{item.author}</strong><time>{relativeTime(item.at)}</time>
                      </div>
                      <p>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="comment-compose">
              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Ajouter un commentaire…" 
                rows={2} 
              />
              <div>
                <button className="attach-button"><Paperclip size={15} />Joindre</button>
                <button 
                  className="send-button" 
                  disabled={!comment.trim()} 
                  onClick={() => { alert('Add comment'); setComment(''); }}
                >
                  <Send size={15} />Publier
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

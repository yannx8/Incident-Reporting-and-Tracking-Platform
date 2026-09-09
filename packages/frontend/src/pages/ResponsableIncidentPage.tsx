import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../api/incidents';
import { categoryIcons, priorityMeta, statusMeta, formatDate, formatTime, relativeTime } from '../lib/mockData';
import { ArrowLeft, ChevronRight, CheckCircle2, Paperclip, Send, MapPin, UserPlus, PlayCircle, Check, Activity, AlertTriangle, LucideIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Status, Priority } from '../types';

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority-badge ${priorityMeta[priority].className}`}><i />{priorityMeta[priority].label}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge ${statusMeta[status].className}`}><i />{statusMeta[status].label}</span>;
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'CLOSED') return <Check size={14} />;
  if (status === 'RESOLVED') return <CheckCircle2 size={14} />;
  if (status === 'NEW') return <AlertTriangle size={14} />;
  return <Activity size={14} />;
}

export function ResponsableIncidentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading, error } = useIncident(id || '');
  const [comment, setComment] = useState('');

  if (isLoading) return <div className="p-8">Chargement...</div>;
  if (error || !incident) return <div className="p-8">Incident introuvable.</div>;

  const Icon = categoryIcons[incident.category];

  // Action labels for status transitions available to the responsable
  const actionLabel: Partial<Record<Status, string>> = {
    ASSIGNED: "Accepter et demarrer l'intervention",
    IN_PROGRESS: 'Proposer la resolution',
    RESOLVED: "Cloture l'incident",
  };

  const ActionIcon: Partial<Record<Status, LucideIcon>> = {
    ASSIGNED: PlayCircle,
    IN_PROGRESS: CheckCircle2,
    RESOLVED: Check,
  };

  const CurrentActionIcon = incident.status !== 'CLOSED' ? (ActionIcon[incident.status] ?? UserPlus) : null;

  return (
    <div className="page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="incident-drawer" style={{ position: 'relative', width: '100%', height: 'auto', border: 'none', boxShadow: 'none' }}>
        <div className="drawer-header" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <button className="drawer-back" onClick={() => navigate('/responsable')}>
            <ArrowLeft size={17} />Mes incidents
          </button>
        </div>

        <div className="drawer-content" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <div className="drawer-kicker">
            <span>{incident.id}</span><span>·</span><span>{formatDate(incident.createdAt)}</span>
            <span className="drawer-kicker-spacer" />
            <StatusBadge status={incident.status} />
          </div>

          <div className="drawer-title-row">
            <div className={`drawer-category category-${incident.priority.toLowerCase()}`}><Icon size={21} /></div>
            <div>
              <h2>{incident.title}</h2>
              <div className="drawer-meta">
                <PriorityBadge priority={incident.priority} />
              </div>
            </div>
          </div>

          <div className="drawer-location">
            <MapPin size={15} /><span>{incident.site}</span><i />{incident.location}
          </div>

          {/* Primary action CTA */}
          <div className="drawer-action-wrap">
            {incident.status !== 'CLOSED' && actionLabel[incident.status] && CurrentActionIcon && (
              <button className="button button-primary drawer-action">
                <CurrentActionIcon size={16} />
                {actionLabel[incident.status]}
                <ChevronRight size={16} />
              </button>
            )}
            {incident.status === 'NEW' && (
              <button className="button button-primary drawer-action">
                <UserPlus size={16} />Prendre en charge<ChevronRight size={16} />
              </button>
            )}
            {incident.status === 'CLOSED' && (
              <div className="closed-message"><CheckCircle2 size={17} />Dossier clôturé - lecture seule</div>
            )}
          </div>

          {/* Incident description */}
          <section className="drawer-section">
            <h3>Signalement original</h3>
            <p className="drawer-description">{incident.description}</p>
            <div className="reporter-line">
              <div className="avatar avatar-orange small-avatar">
                {incident.reporter.split(' ').map((n) => n[0]).join('')}
              </div>
              <div><span>Signalé par</span><strong>{incident.reporter}</strong></div>
              <time>{formatDate(incident.createdAt)} à {formatTime(incident.createdAt)}</time>
            </div>
          </section>

          {/* Embedded Leaflet map - read-only */}
          <section className="drawer-section">
            <h3>Localisation</h3>
            <div style={{ height: 200, borderRadius: 8, overflow: 'hidden', border: '1px solid #e4eaeb', zIndex: 0 }}>
              <MapContainer
                center={[incident.lat, incident.lng]}
                zoom={16}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[incident.lat, incident.lng]}>
                  <Popup>{incident.location}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </section>

          {/* Resolution notes - visible when in progress */}
          {(incident.status === 'IN_PROGRESS' || incident.status === 'RESOLVED') && (
            <section className="drawer-section">
              <h3>Notes de résolution</h3>
              {incident.resolutionText ? (
                <p className="drawer-description">{incident.resolutionText}</p>
              ) : (
                <div className="comment-compose">
                  <textarea
                    placeholder="Décrivez les actions réalisées..."
                    rows={3}
                    style={{ display: 'block', width: '100%', border: 0, outline: 'none', resize: 'vertical', color: '#546b71', fontSize: 11, lineHeight: 1.5 }}
                  />
                </div>
              )}
            </section>
          )}

          {/* Timeline */}
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

          {/* Comments */}
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
                      {item.author.split(' ').map((n) => n[0]).join('')}
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
                placeholder="Ajouter une note d'intervention..."
                rows={2}
                style={{ display: 'block', width: '100%', border: 0, outline: 'none', resize: 'vertical', color: '#546b71', fontSize: 10, lineHeight: 1.5 }}
              />
              <div>
                <button className="attach-button"><Paperclip size={15} />Joindre une photo</button>
                <button
                  className="send-button"
                  disabled={!comment.trim()}
                  onClick={() => { alert('Commentaire ajouté'); setComment(''); }}
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

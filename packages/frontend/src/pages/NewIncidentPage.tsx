import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Upload, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { useCreateIncident } from '../api/incidents';
import { categoryIcons, priorityMeta, sites } from '../lib/mockData';
import { Category, Priority } from '../types';

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const schema = z.object({
  title: z.string().min(5, 'Titre trop court').max(150, 'Titre trop long'),
  description: z.string().min(10, 'Description requise').max(5000),
  category: z.string().min(1, 'Catégorie requise'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  siteId: z.string().min(1, 'Site requis'),
  location: z.string().min(1, 'Localisation requise'),
});

type FormData = z.infer<typeof schema>;

function LocationPicker({ position, setPosition }: { position: { lat: number; lng: number } | null, setPosition: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export function NewIncidentPage() {
  const navigate = useNavigate();
  const createIncident = useCreateIncident();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'Éclairage',
      priority: 'MEDIUM',
      siteId: 'campus',
    }
  });

  const watchTitle = watch('title', '');
  const watchDesc = watch('description', '');
  const [position, setPosition] = useState<{lat: number, lng: number} | null>(null);

  const onSubmit = async (data: FormData) => {
    if (!position) {
      alert("Veuillez sélectionner une position sur la carte.");
      return;
    }
    const site = sites.find(s => s.id === data.siteId) || sites[0];
    if (!site) return;
    await createIncident.mutateAsync({
      title: data.title,
      description: data.description,
      category: data.category as Category,
      priority: data.priority as Priority,
      status: 'NEW',
      site: site.name,
      siteId: site.id,
      location: data.location,
      lat: position.lat,
      lng: position.lng,
    });
    navigate('/incidents');
  };

  return (
    <div className="page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="create-modal" style={{ position: 'relative', width: '100%', height: 'auto', maxHeight: 'none', background: 'transparent', boxShadow: 'none' }}>
        <div className="modal-header">
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" />NOUVEAU SIGNALMENT</div>
            <h2>Signaler un incident</h2>
            <p>Décrivez le problème rencontré sur l’un de vos sites.</p>
          </div>
          <button className="icon-button" onClick={() => navigate('/incidents')}><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-grid">
            <label className="full-field">
              <span>Titre de l’incident <em>*</em></span>
              <input {...register('title')} placeholder="Ex. Éclairage défectueux — allée B" maxLength={150} />
              {errors.title && <div className="form-error"><AlertTriangle size={15} />{errors.title.message}</div>}
              {!errors.title && <small>{watchTitle.length}/150</small>}
            </label>

            <label>
              <span>Catégorie <em>*</em></span>
              <select {...register('category')}>
                {Object.keys(categoryIcons).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {errors.category && <div className="form-error"><AlertTriangle size={15} />{errors.category.message}</div>}
            </label>

            <label>
              <span>Priorité <em>*</em></span>
              <select {...register('priority')}>
                {Object.entries(priorityMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
              {errors.priority && <div className="form-error"><AlertTriangle size={15} />{errors.priority.message}</div>}
            </label>

            <label>
              <span>Site <em>*</em></span>
              <select {...register('siteId')}>
                {sites.filter((site) => site.active).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
              {errors.siteId && <div className="form-error"><AlertTriangle size={15} />{errors.siteId.message}</div>}
            </label>

            <label>
              <span>Localisation précise <em>*</em></span>
              <input {...register('location')} placeholder="Ex. Bâtiment A, entrée nord" />
              {errors.location && <div className="form-error"><AlertTriangle size={15} />{errors.location.message}</div>}
            </label>

            <label className="full-field">
              <span>Description <em>*</em></span>
              <textarea {...register('description')} placeholder="Décrivez ce que vous avez observé..." rows={4} maxLength={5000} />
              {errors.description && <div className="form-error"><AlertTriangle size={15} />{errors.description.message}</div>}
              {!errors.description && <small>{watchDesc.length}/5000</small>}
            </label>

            <label className="full-field">
               <span>Pointeur sur la carte <em>*</em></span>
               <div style={{ height: 240, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}>
                  <MapContainer center={[4.0511, 9.7679]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker position={position} setPosition={setPosition} />
                  </MapContainer>
               </div>
            </label>

            <div className="upload-zone full-field">
              <Upload size={19} />
              <div><strong>Ajouter une photo <span>(facultatif)</span></strong><span>JPEG, PNG ou WEBP · 5 Mo maximum</span></div>
              <button type="button" className="button button-secondary button-small">Parcourir</button>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 24, padding: 0, border: 'none', background: 'transparent' }}>
            <button type="button" className="button button-ghost" onClick={() => navigate('/incidents')}>Annuler</button>
            <button type="submit" className="button button-primary" disabled={createIncident.isPending}>
              {createIncident.isPending ? 'En cours...' : 'Envoyer le signalement'}<ChevronRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

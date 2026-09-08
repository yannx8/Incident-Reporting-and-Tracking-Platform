import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ChevronLeft, Clock, MapPin, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Mock incident
const mockIncident = {
  id: '1',
  title: 'Server Rack Overheating',
  status: 'IN_PROGRESS',
  severity: 'CRITICAL',
  category: 'Maintenance',
  description: 'The main server rack in Data Center A is showing temperatures exceeding 85°C. Cooling systems appear to be running but are ineffective. Immediate attention required to prevent hardware failure.',
  reporter: 'John Doe',
  date: '2026-09-08T10:30:00Z',
  location: { lat: 51.505, lng: -0.09 },
  timeline: [
    { id: 't1', status: 'OPEN', timestamp: '2026-09-08T10:30:00Z', note: 'Incident reported by John Doe', author: 'System' },
    { id: 't2', status: 'IN_PROGRESS', timestamp: '2026-09-08T10:45:00Z', note: 'Assigned to Maintenance Team Alpha', author: 'Jane Admin' },
    { id: 't3', status: 'IN_PROGRESS', timestamp: '2026-09-08T11:15:00Z', note: 'Technician on site, assessing cooling unit', author: 'Tech Mike' },
  ]
};

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  // In a real app, fetch data based on ID. Using mock for now.
  const incident = mockIncident;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <Badge variant="error">Critical</Badge>;
      case 'HIGH': return <Badge variant="warning">High</Badge>;
      case 'MEDIUM': return <Badge variant="default">Medium</Badge>;
      case 'LOW': return <Badge variant="success">Low</Badge>;
      default: return <Badge>{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <Badge variant="error">Open</Badge>;
      case 'IN_PROGRESS': return <Badge variant="warning">In Progress</Badge>;
      case 'RESOLVED': return <Badge variant="success">Resolved</Badge>;
      case 'CLOSED': return <Badge variant="default">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Link to="/incidents" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Incidents
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{incident.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Reported: {formatDate(incident.date)}</span>
              <span className="flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> Category: {incident.category}</span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {getStatusBadge(incident.status)}
            {getSeverityBadge(incident.severity)}
            <Button>Update Status</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-500" /> Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Clock className="w-5 h-5 mr-2 text-gray-500" /> Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 pl-4 border-l-2 border-gray-200 ml-2">
                {incident.timeline.map((event, index) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[25px] bg-white p-1 rounded-full border-2 border-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="ml-6 bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-sm">{event.note}</div>
                        <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span>By: {event.author}</span>
                        <span className="text-gray-300">|</span>
                        <span>Status: {getStatusBadge(event.status)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><MapPin className="w-5 h-5 mr-2 text-gray-500" /> Location</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64 w-full rounded-b-lg overflow-hidden relative z-0">
                <MapContainer 
                  center={[incident.location.lat, incident.location.lng]} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  dragging={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[incident.location.lat, incident.location.lng]} />
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div className="grid grid-cols-3 border-b pb-2">
                  <dt className="text-gray-500 font-medium">Incident ID</dt>
                  <dd className="col-span-2 text-gray-900 font-mono">{incident.id}</dd>
                </div>
                <div className="grid grid-cols-3 border-b pb-2">
                  <dt className="text-gray-500 font-medium">Reporter</dt>
                  <dd className="col-span-2 text-gray-900">{incident.reporter}</dd>
                </div>
                <div className="grid grid-cols-3 border-b pb-2">
                  <dt className="text-gray-500 font-medium">Category</dt>
                  <dd className="col-span-2 text-gray-900">{incident.category}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

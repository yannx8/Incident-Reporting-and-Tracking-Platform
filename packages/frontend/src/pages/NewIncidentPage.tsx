import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { UploadCloud, X } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
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
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      severity: 'LOW',
      category: 'General'
    }
  });
  
  const [position, setPosition] = useState<{lat: number, lng: number} | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const onSubmit = (data: FormData) => {
    console.log('Form data:', { ...data, position, files });
    alert('Incident created successfully (Mock)');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report New Incident</h1>
        <p className="text-gray-500">Provide details about the incident to help us track and resolve it.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Input 
                  label="Title"
                  {...register('title')} 
                  placeholder="Brief description of the incident" 
                  error={errors.title?.message}
                />

                <Select 
                  label="Category"
                  {...register('category')}
                  error={errors.category?.message}
                  options={[
                    { value: 'General', label: 'General' },
                    { value: 'Safety', label: 'Safety' },
                    { value: 'Security', label: 'Security' },
                    { value: 'Maintenance', label: 'Maintenance' },
                  ]}
                />

                <Select 
                  label="Severity"
                  {...register('severity')}
                  error={errors.severity?.message}
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'CRITICAL', label: 'Critical' },
                  ]}
                />

                <Textarea 
                  label="Description"
                  {...register('description')} 
                  rows={5} 
                  placeholder="Detailed explanation of what happened..." 
                  error={errors.description?.message}
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="h-[240px] rounded-md border border-gray-300 overflow-hidden relative z-0">
                    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer 
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                      />
                      <LocationPicker position={position} setPosition={setPosition} />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click on the map to drop a pin at the incident location.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('fileUpload')?.click()}
                  >
                    <input 
                      id="fileUpload" 
                      type="file" 
                      className="hidden" 
                      multiple 
                      onChange={(e) => {
                        if (e.target.files) {
                          setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }} 
                    />
                    <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 text-center">
                      <span className="font-medium text-blue-600">Click to upload</span> or drag and drop<br/>
                      PNG, JPG, PDF up to 10MB
                    </p>
                  </div>
                  
                  {files.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {files.map((file, i) => (
                        <li key={i} className="flex items-center justify-between p-2 text-sm border rounded-md bg-white">
                          <span className="truncate max-w-[200px] text-gray-700">{file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => removeFile(i)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t gap-3">
              <Button type="button" variant="outline">Cancel</Button>
              <Button type="submit">Submit Incident</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

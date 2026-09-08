import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Play, UserPlus, Upload, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Mock data
const mockIncident = { 
  id: '2', 
  title: 'Unauthorized Access Attempt', 
  status: 'OPEN', 
  severity: 'HIGH', 
  category: 'Security', 
  date: '2026-09-07',
  description: 'An individual attempted to access the restricted server room without proper clearance.',
  reportedBy: 'John Doe',
  location: 'Server Room A',
};

export function ResponsableIncidentPage() {
  const { id } = useParams();
  const [status, setStatus] = useState(mockIncident.status);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // Note: For demonstration purposes we just modify state
  
  const handleAssignToMe = () => {
    // API call to assign would go here
    alert('Incident assigned to you.');
  };

  const handleMarkInProgress = () => {
    setStatus('IN_PROGRESS');
  };

  const handleResolve = () => {
    setStatus('RESOLVED');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Link to="/responsable" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mockIncident.title}</h1>
          <p className="text-gray-500">Incident #{id}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {status === 'OPEN' && (
            <>
              <Button onClick={handleAssignToMe} variant="outline" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Assign to Me
              </Button>
              <Button onClick={handleMarkInProgress} className="flex items-center gap-2">
                <Play className="w-4 h-4" /> Mark In Progress
              </Button>
            </>
          )}
          
          {status === 'IN_PROGRESS' && (
            <Button onClick={handleResolve} variant="primary" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="w-4 h-4" /> Resolve Incident
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-900 whitespace-pre-wrap">{mockIncident.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
                  <p className="text-gray-900">{mockIncident.location}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Reported By</h4>
                  <p className="text-gray-900">{mockIncident.reportedBy}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {status === 'IN_PROGRESS' && (
            <Card>
              <CardHeader>
                <CardTitle>Resolution Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Add Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe the actions taken to resolve..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments (Photos/Evidence)
                  </label>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button">
                      <Upload className="w-4 h-4 mr-2" /> Upload File
                    </Button>
                    <Button variant="outline" type="button">
                      <Camera className="w-4 h-4 mr-2" /> Take Photo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Current State</h4>
                <Badge variant={status === 'RESOLVED' ? 'success' : status === 'IN_PROGRESS' ? 'warning' : 'error'}>
                  {status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Severity</h4>
                <Badge variant="warning">{mockIncident.severity}</Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Category</h4>
                <p className="text-sm text-gray-900">{mockIncident.category}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Date Reported</h4>
                <p className="text-sm text-gray-900">{mockIncident.date}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

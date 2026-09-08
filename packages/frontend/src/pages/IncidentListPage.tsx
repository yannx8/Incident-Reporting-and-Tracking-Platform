import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// Mock data
const mockIncidents = [
  { id: '1', title: 'Server Rack Overheating', status: 'OPEN', severity: 'CRITICAL', category: 'Maintenance', date: '2026-09-08' },
  { id: '2', title: 'Unauthorized Access Attempt', status: 'IN_PROGRESS', severity: 'HIGH', category: 'Security', date: '2026-09-07' },
  { id: '3', title: 'Spill in Lobby', status: 'RESOLVED', severity: 'LOW', category: 'Safety', date: '2026-09-06' },
  { id: '4', title: 'Broken Window', status: 'CLOSED', severity: 'MEDIUM', category: 'Maintenance', date: '2026-09-05' },
  { id: '5', title: 'Network Outage', status: 'OPEN', severity: 'CRITICAL', category: 'General', date: '2026-09-08' },
];

export function IncidentListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Filtering mock data
  const filtered = mockIncidents.filter(inc => {
    if (statusFilter && inc.status !== statusFilter) return false;
    if (severityFilter && inc.severity !== severityFilter) return false;
    if (searchTerm && !inc.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

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
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-gray-500">Manage and track reported incidents.</p>
        </div>
        <Link to="/incidents/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Report Incident
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search incidents..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
            />
          </div>
          <div className="w-full md:w-48">
            <Select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { value: '', label: 'All Severities' },
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc) => (
                <tr key={inc.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{inc.title}</td>
                  <td className="px-6 py-4">{getStatusBadge(inc.status)}</td>
                  <td className="px-6 py-4">{getSeverityBadge(inc.severity)}</td>
                  <td className="px-6 py-4 text-gray-500">{inc.category}</td>
                  <td className="px-6 py-4 text-gray-500">{inc.date}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/incidents/${inc.id}`}>
                      <Button variant="outline" className="px-2 py-1 h-auto text-xs">
                        <Eye className="w-4 h-4 mr-1 inline" /> View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No incidents found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t flex items-center justify-between text-sm text-gray-500">
          <div>Showing 1 to {filtered.length} of {filtered.length} results</div>
          <div className="flex gap-2">
            <Button variant="outline" className="p-2 h-auto" disabled><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" className="p-2 h-auto" disabled><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

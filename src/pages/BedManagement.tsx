import React, { useMemo } from 'react';
import { BedDouble, CheckCircle, Users, AlertCircle, Filter } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/FormField';
import { useApp } from '../context/AppContext';
import { MAX_BEDS } from '../data/seedData';

const WARD_COLORS: Record<string, string> = {
  'Ward A': 'border-teal-200',
  'Ward B': 'border-blue-200',
  'Ward C': 'border-purple-200',
  'ICU':    'border-red-200',
};

export default function BedManagement() {
  const { beds, patients } = useApp();

  const wards = useMemo(() => {
    const map: Record<string, typeof beds> = {};
    beds.forEach(b => { (map[b.ward] ||= []).push(b); });
    return Object.entries(map);
  }, [beds]);

  const occupiedCount = beds.filter(b => b.isOccupied).length;
  const availableCount = MAX_BEDS - occupiedCount;
  const occupancyPct = (occupiedCount / MAX_BEDS) * 100;

  return (
    <Layout
      title="Bed Management"
      subtitle={`${occupiedCount} of ${MAX_BEDS} beds occupied · ${availableCount} available`}
    >
      {/* Occupancy summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><BedDouble className="w-4 h-4" /> Total Capacity</div>
          <p className="text-2xl font-bold text-gray-900">{MAX_BEDS}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Users className="w-4 h-4 text-teal-600" /> Occupied</div>
          <p className="text-2xl font-bold text-teal-600">{occupiedCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><CheckCircle className="w-4 h-4 text-emerald-600" /> Available</div>
          <p className="text-2xl font-bold text-emerald-600">{availableCount}</p>
        </Card>
        <Card className={`p-4 ${occupancyPct > 90 ? 'bg-red-50' : occupancyPct > 75 ? 'bg-amber-50' : ''}`}>
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><AlertCircle className="w-4 h-4" /> Occupancy</div>
          <p className={`text-2xl font-bold ${occupancyPct > 90 ? 'text-red-600' : occupancyPct > 75 ? 'text-amber-600' : 'text-gray-900'}`}>{Math.round(occupancyPct)}%</p>
        </Card>
      </div>

      {/* Occupancy bar */}
      <Card className="p-5 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Facility Occupancy</span>
          <span className="text-gray-500">{occupiedCount}/{MAX_BEDS}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all ${occupancyPct > 90 ? 'bg-red-500' : occupancyPct > 75 ? 'bg-amber-500' : 'bg-teal-500'}`}
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
        {occupancyPct > 90 && (
          <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Facility near full capacity. Plan admissions carefully.
          </p>
        )}
      </Card>

      {occupancyPct >= 100 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">Facility is at full capacity. No new admissions possible until a bed is released.</p>
        </div>
      )}

      {/* Bed grid by ward */}
      <div className="space-y-6">
        {wards.map(([wardName, wardBeds]) => {
          const wardOccupied = wardBeds.filter(b => b.isOccupied).length;
          return (
            <div key={wardName}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-gray-500" /> {wardName}
                </h2>
                <Badge variant={wardOccupied === wardBeds.length ? 'danger' : 'neutral'}>
                  {wardOccupied}/{wardBeds.length} occupied
                </Badge>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {wardBeds.map(bed => {
                  const patient = bed.patientId ? patients.find(p => p.id === bed.patientId) : null;
                  return (
                    <div
                      key={bed.id}
                      title={patient ? `${patient.name} (${patient.patientId})` : 'Available'}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-center p-1 cursor-default transition-all hover:shadow-sm ${
                        bed.isOccupied
                          ? `${WARD_COLORS[wardName] || 'border-gray-200'} bg-white`
                          : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      <span className="text-xs font-bold text-gray-700">{bed.bedNumber}</span>
                      {bed.isOccupied ? (
                        <span className="text-[10px] text-gray-400 truncate w-full">{patient?.name?.split(' ')[0]}</span>
                      ) : (
                        <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

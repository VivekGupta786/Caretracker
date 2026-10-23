import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ChevronRight, Thermometer, Stethoscope, UserPlus } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge, statusBadge } from '../components/ui/Badge';
import { Button, FormField, inputCls, selectCls, textareaCls, EmptyState } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import type { Patient } from '../types';
import { FEVER_THRESHOLD } from '../data/seedData';

function AdmitPatientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addPatient, getAvailableBeds, currentUser, patients } = useApp();
  const { success, error } = useToast();
  const availBeds = getAvailableBeds();

  const blank = { name: '', age: '', gender: 'female' as Patient['gender'], bedId: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Patient name is required';
    if (!form.age || isNaN(+form.age) || +form.age < 0 || +form.age > 130) e.age = 'Enter a valid age (0–130)';
    if (!form.bedId) e.bedId = 'Select an available bed';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);

    const bed = availBeds.find(b => b.id === form.bedId)!;
    const patientCount = patients.length;
    const newPatient: Patient = {
      id: `p${Date.now()}`,
      patientId: `PT-${String(patientCount + 1).padStart(3, '0')}`,
      name: form.name.trim(),
      age: +form.age,
      gender: form.gender,
      admissionDate: new Date().toISOString(),
      bedId: form.bedId,
      status: 'active',
      admittedBy: currentUser?.id ?? 'system',
      notes: form.notes,
    };

    const result = addPatient(newPatient, bed);
    setSaving(false);
    if (result.success) {
      success('Patient admitted', `${newPatient.name} assigned to bed ${bed.bedNumber}`);
      setForm(blank);
      setErrors({});
      onClose();
    } else {
      error('Admission failed', result.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Admit New Patient"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}><UserPlus className="w-4 h-4" /> Admit Patient</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Full Name" error={errors.name} required>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Smith" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Age" error={errors.age} required>
            <input className={inputCls} type="number" min={0} max={130} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 45" />
          </FormField>
          <FormField label="Gender" required>
            <select className={selectCls} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Patient['gender'] }))}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </FormField>
        </div>
        <FormField label="Assign Bed" error={errors.bedId} required hint={`${availBeds.length} beds available`}>
          <select className={selectCls} value={form.bedId} onChange={e => setForm(f => ({ ...f, bedId: e.target.value }))}>
            <option value="">— select a bed —</option>
            {availBeds.map(b => (
              <option key={b.id} value={b.id}>{b.bedNumber} — {b.ward}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Clinical Notes">
          <textarea className={textareaCls} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Initial symptoms, notes..." />
        </FormField>
      </div>
    </Modal>
  );
}

export default function Patients() {
  const { patients, beds, temperatures, doctorVisits, currentUser } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [admitOpen, setAdmitOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() =>
    patients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.patientId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()),
    [patients, search, statusFilter]
  );

  const canAdmit = currentUser?.role === 'admin';

  return (
    <Layout
      title="Patients"
      subtitle={`${patients.filter(p => p.status === 'active' || p.status === 'discharge_eligible').length} active patients`}
      actions={canAdmit ? <Button onClick={() => setAdmitOpen(true)}><Plus className="w-4 h-4" /> Admit Patient</Button> : undefined}
    >
      <AdmitPatientModal open={admitOpen} onClose={() => setAdmitOpen(false)} />

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Search by name or patient ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="discharge_eligible">Discharge Eligible</option>
              <option value="discharged">Discharged</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<Users className="w-12 h-12" />} title="No patients found" description="Try adjusting your search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admitted</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Today's Tasks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Latest Temp</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const bed = beds.find(b => b.id === p.bedId);
                  const todayTemps = temperatures.filter(t => t.patientId === p.id && t.recordedAt.startsWith(today));
                  const latestTemp = [...temperatures.filter(t => t.patientId === p.id)].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
                  const todayVisit = doctorVisits.find(v => v.patientId === p.id && v.visitDate === today && v.status === 'completed');
                  const isFever = latestTemp && latestTemp.temperature >= FEVER_THRESHOLD;
                  const daysAdmitted = Math.ceil((Date.now() - new Date(p.admissionDate).getTime()) / 86400000);

                  return (
                    <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.patientId} · {p.age}y · {p.gender}</p>
                      </td>
                      <td className="px-4 py-3">
                        {bed ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{bed.bedNumber}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{new Date(p.admissionDate).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400">Day {daysAdmitted}</p>
                      </td>
                      <td className="px-4 py-3">{statusBadge(p.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span title="Temperature" className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${todayTemps.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            <Thermometer className="w-3 h-3" />
                            {todayTemps.length > 0 ? 'Done' : 'Due'}
                          </span>
                          <span title="Doctor visit" className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${todayVisit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            <Stethoscope className="w-3 h-3" />
                            {todayVisit ? 'Done' : 'Due'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {latestTemp ? (
                          <span className={`font-bold text-sm ${isFever ? 'text-red-600' : 'text-emerald-600'}`}>
                            {latestTemp.temperature}°C
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

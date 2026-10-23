import React, { useState, useMemo } from 'react';
import { Thermometer, CheckCircle, AlertCircle, Clock, Pencil, Search } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button, FormField, inputCls, selectCls, textareaCls, EmptyState } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { FEVER_THRESHOLD, MIN_TEMP, MAX_TEMP } from '../data/seedData';
import type { TemperatureRecord } from '../types';

export default function TemperatureTracking() {
  const { patients, beds, temperatures, currentUser, addTemperature, correctTemperature, getTodayTemp } = useApp();
  const { success, error, warning } = useToast();
  const [search, setSearch] = useState('');
  const [recordModal, setRecordModal] = useState<string | null>(null);
  const [correctModal, setCorrectModal] = useState<TemperatureRecord | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_eligible');

  const checklist = useMemo(() =>
    activePatients.map(p => {
      const todayTemp = getTodayTemp(p.id);
      const bed = beds.find(b => b.id === p.bedId);
      return { p, bed, todayTemp };
    }).filter(({ p }) => p.name.toLowerCase().includes(search.toLowerCase()) || p.patientId.toLowerCase().includes(search.toLowerCase())),
    [activePatients, beds, getTodayTemp, search]
  );

  const tempDoneCount = checklist.filter(({ todayTemp }) => todayTemp).length;
  const tempPendingCount = checklist.length - tempDoneCount;

  return (
    <Layout
      title="Temperature Tracking"
      subtitle="Daily temperature checklist and recording"
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> {tempDoneCount} done</Badge>
          <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> {tempPendingCount} pending</Badge>
        </div>
      }
    >
      {/* Fever threshold info banner */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
        <Thermometer className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Fever threshold is set at <span className="font-bold">{FEVER_THRESHOLD}°C</span>. Valid range: {MIN_TEMP}–{MAX_TEMP}°C. One routine reading per patient per day; corrections require an audited reason.
        </p>
      </div>

      {/* Search */}
      <Card className="p-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Checklist */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Today's Checklist</h2>
          <span className="text-xs text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        {checklist.length === 0 ? (
          <EmptyState icon={<Thermometer className="w-12 h-12" />} title="No active patients" description="All patients are discharged or deceased." />
        ) : (
          <div className="divide-y divide-gray-50">
            {checklist.map(({ p, bed, todayTemp }) => {
              const isFever = todayTemp && todayTemp.temperature >= FEVER_THRESHOLD;
              return (
                <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${todayTemp ? (isFever ? 'bg-red-100' : 'bg-emerald-100') : 'bg-amber-100'}`}>
                      {todayTemp ? <Thermometer className={`w-5 h-5 ${isFever ? 'text-red-600' : 'text-emerald-600'}`} /> : <Clock className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        <span className="text-xs text-gray-400">{p.patientId}</span>
                        {bed && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{bed.bedNumber}</span>}
                      </div>
                      {todayTemp ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-sm font-bold ${isFever ? 'text-red-600' : 'text-emerald-600'}`}>{todayTemp.temperature}°C</span>
                          <span className="text-xs text-gray-400">{new Date(todayTemp.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isFever && <Badge variant="danger">Fever</Badge>}
                          {todayTemp.isCorrected && <Badge variant="warning">corrected</Badge>}
                          <span className="text-xs text-gray-400">· {todayTemp.recordedByName}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 font-medium">Temperature not recorded today</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {todayTemp && (
                      <Button variant="ghost" size="sm" onClick={() => setCorrectModal(todayTemp)}>
                        <Pencil className="w-3.5 h-3.5" /> Correct
                      </Button>
                    )}
                    <Button size="sm" variant={todayTemp ? 'outline' : 'primary'} onClick={() => setRecordModal(p.id)}>
                      {todayTemp ? 'Re-record' : 'Record Temp'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Record modal */}
      <RecordTempModal
        patientId={recordModal}
        onClose={() => setRecordModal(null)}
        onSave={(temp, note) => {
          if (!recordModal || !currentUser) return;
          const patient = patients.find(p => p.id === recordModal);
          if (!patient) return;
          const rec: TemperatureRecord = {
            id: `t${Date.now()}`,
            patientId: recordModal,
            temperature: temp,
            recordedAt: new Date().toISOString(),
            recordedBy: currentUser.id,
            recordedByName: currentUser.name,
            note,
          };
          const result = addTemperature(rec);
          if (result.success) {
            success('Temperature recorded', `${temp}°C for ${patient.name}`);
            setRecordModal(null);
          } else {
            error('Could not save', result.error);
          }
        }}
      />

      {/* Correct modal */}
      <CorrectTempModal
        record={correctModal}
        onClose={() => setCorrectModal(null)}
        onSave={(newTemp, reason) => {
          if (!correctModal || !currentUser) return;
          correctTemperature(correctModal.id, newTemp, reason, currentUser.id);
          success('Temperature corrected', `Updated to ${newTemp}°C (audited)`);
          setCorrectModal(null);
        }}
      />
    </Layout>
  );
}

// ── Record Temperature Modal ──────────────────────────────────────────────
function RecordTempModal({
  patientId, onClose, onSave
}: {
  patientId: string | null;
  onClose: () => void;
  onSave: (temp: number, note?: string) => void;
}) {
  const { patients, beds, getTodayTemp } = useApp();
  const [temp, setTemp] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  const patient = patients.find(p => p.id === patientId);
  const bed = patient ? beds.find(b => b.id === patient.bedId) : null;
  const existing = patientId ? getTodayTemp(patientId) : undefined;

  React.useEffect(() => { setTemp(''); setNote(''); setTouched(false); }, [patientId]);

  if (!patient) return null;
  const numTemp = parseFloat(temp);
  const tempError = touched && temp !== '' && (isNaN(numTemp) || numTemp < MIN_TEMP || numTemp > MAX_TEMP)
    ? `Enter a temperature between ${MIN_TEMP}°C and ${MAX_TEMP}°C`
    : undefined;
  const willBeFever = !isNaN(numTemp) && numTemp >= FEVER_THRESHOLD;

  return (
    <Modal
      open={!!patientId}
      onClose={onClose}
      title="Record Temperature"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!!tempError || temp === ''}
            onClick={() => { setTouched(true); if (!tempError && temp !== '') onSave(numTemp, note || undefined); }}
          >
            <Thermometer className="w-4 h-4" /> Save Reading
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="font-semibold text-gray-900">{patient.name}</p>
          <p className="text-xs text-gray-500">{patient.patientId} · {bed ? bed.bedNumber : 'no bed'} · {statusText(patient.status)}</p>
          {existing && (
            <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs bg-amber-50 rounded p-2">
              <AlertCircle className="w-4 h-4" />
              Already recorded today: <span className="font-bold">{existing.temperature}°C</span> at {new Date(existing.recordedAt).toLocaleTimeString()}. This will be treated as a new entry.
            </div>
          )}
        </div>
        <FormField label="Temperature (°C)" error={tempError} required hint={`Normal < ${FEVER_THRESHOLD}°C`}>
          <input
            className={inputCls}
            type="number"
            step="0.1"
            min={MIN_TEMP}
            max={MAX_TEMP}
            value={temp}
            placeholder="e.g. 37.2"
            onChange={e => setTemp(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
          />
        </FormField>
        {willBeFever && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-red-700 text-sm font-medium">This reading indicates a fever. The doctor will be alerted.</p>
          </div>
        )}
        <FormField label="Clinical Note (optional)">
          <textarea className={textareaCls} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Additional observations..." />
        </FormField>
      </div>
    </Modal>
  );
}

// ── Correct Temperature Modal ─────────────────────────────────────────────
function CorrectTempModal({
  record, onClose, onSave
}: {
  record: TemperatureRecord | null;
  onClose: () => void;
  onSave: (newTemp: number, reason: string) => void;
}) {
  const [newTemp, setNewTemp] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  React.useEffect(() => { setNewTemp(''); setReason(''); setTouched(false); }, [record]);

  if (!record) return null;
  const numTemp = parseFloat(newTemp);
  const tempError = touched && newTemp !== '' && (isNaN(numTemp) || numTemp < MIN_TEMP || numTemp > MAX_TEMP)
    ? `Enter a temperature between ${MIN_TEMP}°C and ${MAX_TEMP}°C` : undefined;
  const reasonError = touched && reason.trim().length < 5 ? 'Reason must be at least 5 characters (audit requirement)' : undefined;

  return (
    <Modal
      open={!!record}
      onClose={onClose}
      title="Correct Temperature Reading"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={!!tempError || !!reasonError || newTemp === '' || reason.trim().length < 5}
            onClick={() => { setTouched(true); if (!tempError && !reasonError && newTemp !== '') onSave(numTemp, reason.trim()); }}
          >
            Submit Correction
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-700 text-xs">
            Corrections are audited. The original value ({record.temperature}°C) is preserved in the audit trail. Only authorized staff may correct readings.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Original Value</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-500">{record.temperature}°C</div>
          </div>
          <FormField label="Corrected Value" error={tempError} required>
            <input className={inputCls} type="number" step="0.1" min={MIN_TEMP} max={MAX_TEMP} value={newTemp} onChange={e => setNewTemp(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. 37.2" autoFocus />
          </FormField>
        </div>
        <FormField label="Reason for Correction" error={reasonError} required>
          <textarea className={textareaCls} rows={3} value={reason} onChange={e => setReason(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. Thermometer malfunction — re-measured with calibrated device." />
        </FormField>
      </div>
    </Modal>
  );
}

function statusText(s: string) {
  return s === 'discharge_eligible' ? 'eligible for discharge' : s;
}

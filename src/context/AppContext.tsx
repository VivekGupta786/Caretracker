import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  User, Patient, Bed, TemperatureRecord,
  DoctorVisit, DischargeRecommendation, PatientOutcome, AuditLog
} from '../types';
import {
  SEED_USERS, SEED_PATIENTS, SEED_BEDS,
  SEED_TEMPERATURES, SEED_DOCTOR_VISITS,
  SEED_DISCHARGE_RECS, SEED_OUTCOMES, SEED_AUDIT_LOGS,
  FEVER_THRESHOLD, FEVER_FREE_DAYS_REQUIRED
} from '../data/seedData';
import {
  getTodayReading, hasRoutineEntryToday,
  consecutiveFeverFreeDays, isDischargeEligible as isEligibleFn
} from '../utils/clinical';

interface AppState {
  users: User[];
  patients: Patient[];
  beds: Bed[];
  temperatures: TemperatureRecord[];
  doctorVisits: DoctorVisit[];
  dischargeRecs: DischargeRecommendation[];
  outcomes: PatientOutcome[];
  auditLogs: AuditLog[];
  currentUser: User | null;
}

interface AppContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  // patients
  addPatient: (patient: Patient, bed: Bed) => { success: boolean; error?: string };
  updatePatientStatus: (patientId: string, status: Patient['status']) => void;
  // temperatures
  addTemperature: (rec: TemperatureRecord) => { success: boolean; error?: string };
  correctTemperature: (id: string, newTemp: number, reason: string, actorId: string) => void;
  getTodayTemp: (patientId: string) => TemperatureRecord | undefined;
  hasFeverToday: (patientId: string) => boolean;
  getFeverFreeConsecutiveDays: (patientId: string) => number;
  isDischargeEligible: (patientId: string) => boolean;
  // doctor visits
  addDoctorVisit: (visit: DoctorVisit) => { success: boolean; error?: string };
  completeDoctorVisit: (visitId: string, notes: string, treatment: string) => void;
  getTodayVisit: (patientId: string) => DoctorVisit | undefined;
  // discharge
  addDischargeRec: (rec: DischargeRecommendation) => void;
  completeDischarge: (recId: string, adminId: string, adminName: string) => { success: boolean; error?: string };
  // beds
  getAvailableBeds: () => Bed[];
  // users
  addUser: (user: User) => { success: boolean; error?: string };
  updateUser: (user: User) => void;
  toggleUserActive: (userId: string) => void;
  // audit
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  // outcomes
  addOutcome: (outcome: PatientOutcome) => void;
}

const STORAGE_KEY = 'caretrack_state_v1';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* ignore */ }
  return {
    users: SEED_USERS,
    patients: SEED_PATIENTS,
    beds: SEED_BEDS,
    temperatures: SEED_TEMPERATURES,
    doctorVisits: SEED_DOCTOR_VISITS,
    dischargeRecs: SEED_DISCHARGE_RECS,
    outcomes: SEED_OUTCOMES,
    auditLogs: SEED_AUDIT_LOGS,
    currentUser: null,
  };
}

function saveState(state: AppState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const set = (updater: (s: AppState) => AppState) =>
    setState(prev => { const next = updater(prev); saveState(next); return next; });

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id'>) => {
    set(s => ({ ...s, auditLogs: [{ ...log, id: `al${Date.now()}` }, ...s.auditLogs] }));
  }, []);

  const login = (user: User) => set(s => ({ ...s, currentUser: user }));
  const logout = () => set(s => ({ ...s, currentUser: null }));

  // ── PATIENTS ──────────────────────────────────────────────────────────────
  const addPatient = (patient: Patient, bed: Bed): { success: boolean; error?: string } => {
    const activeCount = state.beds.filter(b => b.isOccupied).length;
    if (activeCount >= 74) return { success: false, error: 'Facility is at full capacity (74 beds).' };
    const targetBed = state.beds.find(b => b.id === bed.id);
    if (!targetBed) return { success: false, error: 'Bed not found.' };
    if (targetBed.isOccupied) return { success: false, error: `Bed ${targetBed.bedNumber} is already occupied.` };
    set(s => ({
      ...s,
      patients: [...s.patients, { ...patient, bedId: bed.id }],
      beds: s.beds.map(b => b.id === bed.id ? { ...b, isOccupied: true, patientId: patient.id } : b),
    }));
    addAuditLog({ actorId: state.currentUser?.id || 'system', actorName: state.currentUser?.name || 'System', action: 'PATIENT_ADMITTED', entityType: 'patient', entityId: patient.id, timestamp: new Date().toISOString(), details: `${patient.name} admitted to bed ${bed.bedNumber}` });
    return { success: true };
  };

  const updatePatientStatus = (patientId: string, status: Patient['status']) => {
    set(s => ({ ...s, patients: s.patients.map(p => p.id === patientId ? { ...p, status } : p) }));
  };

  // ── TEMPERATURES ──────────────────────────────────────────────────────────
  const getTodayTemp = (patientId: string): TemperatureRecord | undefined =>
    getTodayReading(state.temperatures, patientId);

  const hasFeverToday = (patientId: string): boolean => {
    const t = getTodayTemp(patientId);
    return t ? t.temperature >= FEVER_THRESHOLD : false;
  };

  const getFeverFreeConsecutiveDays = (patientId: string): number =>
    consecutiveFeverFreeDays(state.temperatures, patientId);

  const isDischargeEligible = (patientId: string): boolean =>
    isEligibleFn(state.temperatures, patientId);

  const addTemperature = (rec: TemperatureRecord): { success: boolean; error?: string } => {
    const patient = state.patients.find(p => p.id === rec.patientId);
    if (!patient || (patient.status !== 'active' && patient.status !== 'discharge_eligible'))
      return { success: false, error: 'Patient does not have an active admission.' };
    if (hasRoutineEntryToday(state.temperatures, rec.patientId) && !rec.isCorrected)
      return { success: false, error: `Temperature already recorded today. Use the audited correction workflow to update.` };
    set(s => ({ ...s, temperatures: [...s.temperatures, rec] }));
    addAuditLog({ actorId: rec.recordedBy, actorName: rec.recordedByName, action: 'TEMP_RECORDED', entityType: 'temperature', entityId: rec.id, timestamp: rec.recordedAt, details: `${rec.temperature}°C for ${patient.name}` });
    // Auto-flag discharge eligibility
    const newEligible = isEligibleFn([...state.temperatures, rec], rec.patientId);
    if (newEligible && patient.status === 'active') {
      set(s => ({ ...s, patients: s.patients.map(p => p.id === rec.patientId ? { ...p, status: 'discharge_eligible' } : p) }));
    }
    return { success: true };
  };

  const correctTemperature = (id: string, newTemp: number, reason: string, actorId: string) => {
    set(s => ({
      ...s,
      temperatures: s.temperatures.map(t =>
        t.id === id ? { ...t, temperature: newTemp, isCorrected: true, correctionReason: reason, originalValue: t.temperature } : t
      ),
    }));
    const actor = state.users.find(u => u.id === actorId);
    addAuditLog({ actorId, actorName: actor?.name || actorId, action: 'TEMP_CORRECTED', entityType: 'temperature', entityId: id, timestamp: new Date().toISOString(), details: `Corrected to ${newTemp}°C. Reason: ${reason}` });
  };

  // ── DOCTOR VISITS ─────────────────────────────────────────────────────────
  const getTodayVisit = (patientId: string): DoctorVisit | undefined => {
    const todayStr = new Date().toISOString().split('T')[0];
    return state.doctorVisits.find(v => v.patientId === patientId && v.visitDate === todayStr);
  };

  const addDoctorVisit = (visit: DoctorVisit): { success: boolean; error?: string } => {
    const existing = getTodayVisit(visit.patientId);
    if (existing?.status === 'completed') return { success: false, error: 'Visit already completed today.' };
    set(s => ({ ...s, doctorVisits: [...s.doctorVisits, visit] }));
    return { success: true };
  };

  const completeDoctorVisit = (visitId: string, notes: string, treatment: string) => {
    set(s => ({
      ...s,
      doctorVisits: s.doctorVisits.map(v =>
        v.id === visitId ? { ...v, status: 'completed', visitedAt: new Date().toISOString(), consultationNotes: notes, treatmentDecision: treatment } : v
      ),
    }));
    const visit = state.doctorVisits.find(v => v.id === visitId);
    if (visit) addAuditLog({ actorId: visit.doctorId, actorName: visit.doctorName, action: 'VISIT_COMPLETED', entityType: 'doctor_visit', entityId: visitId, timestamp: new Date().toISOString(), details: `Visit completed for patient ${visit.patientId}` });
  };

  // ── DISCHARGE ─────────────────────────────────────────────────────────────
  const addDischargeRec = (rec: DischargeRecommendation) => {
    set(s => ({ ...s, dischargeRecs: [...s.dischargeRecs, rec] }));
    addAuditLog({ actorId: rec.recommendedBy, actorName: rec.recommendedByName, action: 'DISCHARGE_RECOMMENDED', entityType: 'discharge', entityId: rec.id, timestamp: rec.recommendedAt, details: `Discharge recommended for patient ${rec.patientId}` });
  };

  const completeDischarge = (recId: string, adminId: string, adminName: string): { success: boolean; error?: string } => {
    const rec = state.dischargeRecs.find(r => r.id === recId);
    if (!rec) return { success: false, error: 'Recommendation not found.' };
    const patient = state.patients.find(p => p.id === rec.patientId);
    if (!patient) return { success: false, error: 'Patient not found.' };
    const completedAt = new Date().toISOString();
    set(s => ({
      ...s,
      dischargeRecs: s.dischargeRecs.map(r => r.id === recId ? { ...r, status: 'completed', completedBy: adminId, completedAt } : r),
      patients: s.patients.map(p => p.id === rec.patientId ? { ...p, status: 'discharged', bedId: null } : p),
      beds: s.beds.map(b => b.patientId === rec.patientId ? { ...b, isOccupied: false, patientId: null } : b),
    }));
    addAuditLog({ actorId: adminId, actorName: adminName, action: 'PATIENT_DISCHARGED', entityType: 'patient', entityId: rec.patientId, timestamp: completedAt, details: `${patient.name} discharged. Bed released.` });
    // Add outcome
    const admDate = new Date(patient.admissionDate);
    const days = Math.ceil((Date.now() - admDate.getTime()) / 86400000);
    const outcomeId = `o${Date.now()}`;
    set(s => ({ ...s, outcomes: [...s.outcomes, { id: outcomeId, patientId: rec.patientId, outcome: 'survived', recordedAt: completedAt, recordedBy: adminId, lengthOfStayDays: days }] }));
    return { success: true };
  };

  // ── BEDS ──────────────────────────────────────────────────────────────────
  const getAvailableBeds = (): Bed[] => state.beds.filter(b => !b.isOccupied);

  // ── USERS ─────────────────────────────────────────────────────────────────
  const addUser = (user: User): { success: boolean; error?: string } => {
    if (state.users.find(u => u.email === user.email)) return { success: false, error: 'A user with this email already exists.' };
    set(s => ({ ...s, users: [...s.users, user] }));
    addAuditLog({ actorId: state.currentUser?.id || 'system', actorName: state.currentUser?.name || 'System', action: 'USER_CREATED', entityType: 'user', entityId: user.id, timestamp: new Date().toISOString(), details: `Created ${user.role} account for ${user.name}` });
    return { success: true };
  };

  const updateUser = (user: User) => {
    set(s => ({ ...s, users: s.users.map(u => u.id === user.id ? user : u) }));
  };

  const toggleUserActive = (userId: string) => {
    set(s => ({ ...s, users: s.users.map(u => u.id === userId ? { ...u, active: !u.active } : u) }));
  };

  const addOutcome = (outcome: PatientOutcome) => {
    set(s => ({ ...s, outcomes: [...s.outcomes, outcome] }));
  };

  const value: AppContextType = {
    ...state,
    login, logout,
    addPatient, updatePatientStatus,
    addTemperature, correctTemperature, getTodayTemp, hasFeverToday,
    getFeverFreeConsecutiveDays, isDischargeEligible,
    addDoctorVisit, completeDoctorVisit, getTodayVisit,
    addDischargeRec, completeDischarge,
    getAvailableBeds,
    addUser, updateUser, toggleUserActive,
    addAuditLog, addOutcome,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

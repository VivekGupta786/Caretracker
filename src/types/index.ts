export type UserRole = 'admin' | 'doctor' | 'nurse';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  department?: string;
  active: boolean;
  createdAt: string;
}

export type PatientStatus = 'active' | 'discharge_eligible' | 'discharged' | 'deceased';

export interface Patient {
  id: string;
  patientId: string; // human-readable e.g. PT-001
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  admissionDate: string;
  bedId: string | null;
  status: PatientStatus;
  admittedBy: string;
  notes?: string;
}

export interface Bed {
  id: string;
  bedNumber: string;
  ward: string;
  isOccupied: boolean;
  patientId: string | null;
}

export interface TemperatureRecord {
  id: string;
  patientId: string;
  temperature: number; // Celsius
  recordedAt: string;
  recordedBy: string; // user id
  recordedByName: string;
  note?: string;
  isCorrected?: boolean;
  correctionReason?: string;
  originalValue?: number;
}

export interface DoctorVisit {
  id: string;
  patientId: string;
  visitDate: string; // YYYY-MM-DD
  visitedAt?: string; // full ISO when completed
  doctorId: string;
  doctorName: string;
  status: 'pending' | 'completed' | 'missed';
  consultationNotes?: string;
  treatmentDecision?: string;
}

export interface DischargeRecommendation {
  id: string;
  patientId: string;
  recommendedBy: string; // doctor user id
  recommendedByName: string;
  recommendedAt: string;
  status: 'pending_admin' | 'completed' | 'cancelled';
  notes?: string;
  completedBy?: string;
  completedAt?: string;
}

export interface PatientOutcome {
  id: string;
  patientId: string;
  outcome: 'survived' | 'deceased';
  recordedAt: string;
  recordedBy: string;
  lengthOfStayDays: number;
  notes?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  details?: string;
}

export interface DailyTaskStatus {
  patientId: string;
  patientName: string;
  bedNumber: string;
  tempRecorded: boolean;
  tempValue?: number;
  tempTime?: string;
  doctorVisited: boolean;
  visitTime?: string;
}

export interface FeverFreeStatus {
  patientId: string;
  consecutiveFeverFreeDays: number;
  isEligible: boolean;
  lastObservationDate: string;
  history: { date: string; temp: number; hasFever: boolean }[];
}

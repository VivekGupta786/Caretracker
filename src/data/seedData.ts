import type {
  User, Patient, Bed, TemperatureRecord,
  DoctorVisit, DischargeRecommendation, PatientOutcome, AuditLog
} from '../types';

const today = new Date();
const d = (daysAgo: number, h = 9, m = 0) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};
const dateStr = (daysAgo: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().split('T')[0];
};

export const FEVER_THRESHOLD = 37.8; // °C
export const MAX_BEDS = 74;
export const MIN_TEMP = 35.0;
export const MAX_TEMP = 42.5;
export const FEVER_FREE_DAYS_REQUIRED = 3;

// ── USERS ──────────────────────────────────────────────────────────────────
export const SEED_USERS: User[] = [
  { id: 'u1', name: 'Dr. Sarah Chen',    role: 'doctor', email: 'sarah.chen@caretrack.demo',   department: 'Internal Medicine', active: true, createdAt: d(30) },
  { id: 'u2', name: 'Dr. James Okafor',  role: 'doctor', email: 'james.okafor@caretrack.demo', department: 'Infectious Disease', active: true, createdAt: d(30) },
  { id: 'u3', name: 'Nurse Priya Nair',  role: 'nurse',  email: 'priya.nair@caretrack.demo',   department: 'Ward A', active: true, createdAt: d(25) },
  { id: 'u4', name: 'Nurse Tom Reeves',  role: 'nurse',  email: 'tom.reeves@caretrack.demo',   department: 'Ward B', active: true, createdAt: d(25) },
  { id: 'u5', name: 'Admin Grace Park',  role: 'admin',  email: 'grace.park@caretrack.demo',   department: 'Administration', active: true, createdAt: d(60) },
  { id: 'u6', name: 'Admin Raj Kapoor',  role: 'admin',  email: 'raj.kapoor@caretrack.demo',   department: 'Administration', active: true, createdAt: d(60) },
];

// ── BEDS ───────────────────────────────────────────────────────────────────
export const SEED_BEDS: Bed[] = [
  // Ward A  1-20
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `bed-a${i + 1}`,
    bedNumber: `A${String(i + 1).padStart(2, '0')}`,
    ward: 'Ward A',
    isOccupied: i < 12,
    patientId: null as string | null,
  })),
  // Ward B  1-20
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `bed-b${i + 1}`,
    bedNumber: `B${String(i + 1).padStart(2, '0')}`,
    ward: 'Ward B',
    isOccupied: i < 11,
    patientId: null as string | null,
  })),
  // Ward C  1-20
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `bed-c${i + 1}`,
    bedNumber: `C${String(i + 1).padStart(2, '0')}`,
    ward: 'Ward C',
    isOccupied: i < 10,
    patientId: null as string | null,
  })),
  // ICU  1-14
  ...Array.from({ length: 14 }, (_, i) => ({
    id: `bed-icu${i + 1}`,
    bedNumber: `ICU${String(i + 1).padStart(2, '0')}`,
    ward: 'ICU',
    isOccupied: i < 5,
    patientId: null as string | null,
  })),
];

// ── PATIENTS ───────────────────────────────────────────────────────────────
export const SEED_PATIENTS: Patient[] = [
  // P01 – needs temperature check today
  { id: 'p1', patientId: 'PT-001', name: 'Alice Martins',   age: 45, gender: 'female', admissionDate: d(4), bedId: 'bed-a1',   status: 'active',            admittedBy: 'u5', notes: 'Mild respiratory symptoms on admission.' },
  // P02 – temp done, needs doctor visit
  { id: 'p2', patientId: 'PT-002', name: 'Brian Osei',      age: 62, gender: 'male',   admissionDate: d(6), bedId: 'bed-a2',   status: 'active',            admittedBy: 'u5' },
  // P03 – elevated temp
  { id: 'p3', patientId: 'PT-003', name: 'Carmen López',    age: 38, gender: 'female', admissionDate: d(3), bedId: 'bed-a3',   status: 'active',            admittedBy: 'u6', notes: 'Persistent high fever.' },
  // P04 – incomplete fever-free (2 days)
  { id: 'p4', patientId: 'PT-004', name: 'David Kim',       age: 55, gender: 'male',   admissionDate: d(8), bedId: 'bed-a4',   status: 'active',            admittedBy: 'u5' },
  // P05 – discharge eligible (3+ fever-free days)
  { id: 'p5', patientId: 'PT-005', name: 'Elena Petrova',   age: 49, gender: 'female', admissionDate: d(10), bedId: 'bed-a5',  status: 'discharge_eligible', admittedBy: 'u5' },
  // P06 – discharged (survived)
  { id: 'p6', patientId: 'PT-006', name: 'Frank Mensah',    age: 67, gender: 'male',   admissionDate: d(15), bedId: null,      status: 'discharged',        admittedBy: 'u6' },
  // P07 – deceased
  { id: 'p7', patientId: 'PT-007', name: 'Grace Nakamura',  age: 78, gender: 'female', admissionDate: d(20), bedId: null,     status: 'deceased',          admittedBy: 'u5' },
  // P08-P15 – generic active patients to fill beds
  { id: 'p8',  patientId: 'PT-008', name: 'Henry Walsh',    age: 41, gender: 'male',   admissionDate: d(2),  bedId: 'bed-a6',  status: 'active', admittedBy: 'u5' },
  { id: 'p9',  patientId: 'PT-009', name: 'Irene Costa',    age: 33, gender: 'female', admissionDate: d(5),  bedId: 'bed-a7',  status: 'active', admittedBy: 'u6' },
  { id: 'p10', patientId: 'PT-010', name: 'James Adeyemi',  age: 58, gender: 'male',   admissionDate: d(7),  bedId: 'bed-a8',  status: 'active', admittedBy: 'u5' },
  { id: 'p11', patientId: 'PT-011', name: 'Karen Singh',    age: 44, gender: 'female', admissionDate: d(9),  bedId: 'bed-b1',  status: 'active', admittedBy: 'u6' },
  { id: 'p12', patientId: 'PT-012', name: 'Liam Brennan',   age: 52, gender: 'male',   admissionDate: d(3),  bedId: 'bed-b2',  status: 'active', admittedBy: 'u5' },
  { id: 'p13', patientId: 'PT-013', name: 'Maya Patel',     age: 29, gender: 'female', admissionDate: d(6),  bedId: 'bed-b3',  status: 'active', admittedBy: 'u5' },
  { id: 'p14', patientId: 'PT-014', name: 'Nathan Brown',   age: 63, gender: 'male',   admissionDate: d(11), bedId: 'bed-b4',  status: 'active', admittedBy: 'u6' },
  { id: 'p15', patientId: 'PT-015', name: 'Olivia Zhang',   age: 37, gender: 'female', admissionDate: d(4),  bedId: 'bed-b5',  status: 'active', admittedBy: 'u5' },
];

// Assign patientIds to the beds they occupy
SEED_BEDS.forEach(bed => {
  const patient = SEED_PATIENTS.find(p => p.bedId === bed.id);
  if (patient) {
    bed.patientId = patient.id;
    bed.isOccupied = true;
  }
});

// ── TEMPERATURE RECORDS ────────────────────────────────────────────────────
export const SEED_TEMPERATURES: TemperatureRecord[] = [
  // P01 – no reading today (needs check)
  { id: 't1', patientId: 'p1', temperature: 38.9, recordedAt: d(1, 8, 30), recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't2', patientId: 'p1', temperature: 38.3, recordedAt: d(2, 9, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't3', patientId: 'p1', temperature: 39.1, recordedAt: d(3, 8, 45), recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },

  // P02 – temp done today, no doctor visit
  { id: 't4', patientId: 'p2', temperature: 37.2, recordedAt: d(0, 8, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't5', patientId: 'p2', temperature: 38.1, recordedAt: d(1, 8, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't6', patientId: 'p2', temperature: 38.5, recordedAt: d(2, 8, 0),  recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },

  // P03 – elevated temp today
  { id: 't7', patientId: 'p3', temperature: 39.8, recordedAt: d(0, 9, 15), recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't8', patientId: 'p3', temperature: 39.2, recordedAt: d(1, 9, 0),  recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't9', patientId: 'p3', temperature: 39.5, recordedAt: d(2, 8, 30), recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },

  // P04 – 2 consecutive fever-free days (needs 1 more)
  { id: 't10', patientId: 'p4', temperature: 39.0, recordedAt: d(4, 8, 0), recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't11', patientId: 'p4', temperature: 38.8, recordedAt: d(3, 8, 0), recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't12', patientId: 'p4', temperature: 37.4, recordedAt: d(2, 8, 0), recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't13', patientId: 'p4', temperature: 37.2, recordedAt: d(1, 8, 0), recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't14', patientId: 'p4', temperature: 37.1, recordedAt: d(0, 8, 30),recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },

  // P05 – 4 consecutive fever-free days (eligible)
  { id: 't15', patientId: 'p5', temperature: 39.3, recordedAt: d(6, 8, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't16', patientId: 'p5', temperature: 37.5, recordedAt: d(5, 8, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't17', patientId: 'p5', temperature: 37.0, recordedAt: d(4, 8, 0),  recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't18', patientId: 'p5', temperature: 36.9, recordedAt: d(3, 8, 0),  recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't19', patientId: 'p5', temperature: 36.8, recordedAt: d(2, 8, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't20', patientId: 'p5', temperature: 36.7, recordedAt: d(1, 8, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't21', patientId: 'p5', temperature: 36.8, recordedAt: d(0, 8, 0),  recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },

  // P08-P15 – some have today's readings, some don't
  { id: 't22', patientId: 'p8',  temperature: 37.8, recordedAt: d(0, 8, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't23', patientId: 'p9',  temperature: 38.2, recordedAt: d(0, 9, 0),  recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  { id: 't24', patientId: 'p10', temperature: 37.1, recordedAt: d(0, 10, 0), recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't25', patientId: 'p11', temperature: 38.6, recordedAt: d(1, 8, 0),  recordedBy: 'u4', recordedByName: 'Nurse Tom Reeves' },
  { id: 't26', patientId: 'p12', temperature: 37.5, recordedAt: d(0, 8, 30), recordedBy: 'u3', recordedByName: 'Nurse Priya Nair' },
  // p13, p14, p15 – no reading today (pending)
];

// ── DOCTOR VISITS ──────────────────────────────────────────────────────────
export const SEED_DOCTOR_VISITS: DoctorVisit[] = [
  // P01 – visited yesterday, pending today
  { id: 'v1', patientId: 'p1', visitDate: dateStr(1), visitedAt: d(1, 11, 0), doctorId: 'u1', doctorName: 'Dr. Sarah Chen', status: 'completed', consultationNotes: 'Fever persisting. Continue antipyretics and monitoring.', treatmentDecision: 'Increase fluid intake, antipyretic every 6h' },
  // P02 – no doctor visit today (temp done but awaiting visit)
  { id: 'v2', patientId: 'p2', visitDate: dateStr(1), visitedAt: d(1, 10, 30), doctorId: 'u1', doctorName: 'Dr. Sarah Chen', status: 'completed', consultationNotes: 'Fever breaking. Continue current treatment.', treatmentDecision: 'Maintain current protocol' },
  // P03 – visited today
  { id: 'v3', patientId: 'p3', visitDate: dateStr(0), visitedAt: d(0, 10, 0), doctorId: 'u2', doctorName: 'Dr. James Okafor', status: 'completed', consultationNotes: 'High persistent fever. Escalating treatment.', treatmentDecision: 'IV fluids, broad-spectrum antibiotics added' },
  // P04 – visited today
  { id: 'v4', patientId: 'p4', visitDate: dateStr(0), visitedAt: d(0, 11, 15), doctorId: 'u1', doctorName: 'Dr. Sarah Chen', status: 'completed', consultationNotes: 'Patient improving. Two consecutive fever-free days. One more required.', treatmentDecision: 'Continue monitoring' },
  // P05 – no visit today (discharge eligible)
  { id: 'v5', patientId: 'p5', visitDate: dateStr(1), visitedAt: d(1, 9, 30), doctorId: 'u2', doctorName: 'Dr. James Okafor', status: 'completed', consultationNotes: 'Patient meets fever-free criteria. Recommending discharge.', treatmentDecision: 'Discharge pending admin' },
  // P08 – visited today
  { id: 'v6', patientId: 'p8', visitDate: dateStr(0), visitedAt: d(0, 9, 0), doctorId: 'u1', doctorName: 'Dr. Sarah Chen', status: 'completed', consultationNotes: 'Stable.', treatmentDecision: 'Continue protocol' },
  // P09 – pending visit today
  // P10 – visited today
  { id: 'v8', patientId: 'p10', visitDate: dateStr(0), visitedAt: d(0, 10, 45), doctorId: 'u2', doctorName: 'Dr. James Okafor', status: 'completed', consultationNotes: 'Improving.', treatmentDecision: 'Reduce medication dosage' },
];

// ── DISCHARGE RECOMMENDATIONS ──────────────────────────────────────────────
export const SEED_DISCHARGE_RECS: DischargeRecommendation[] = [
  // P05 – recommended, awaiting admin
  { id: 'dr1', patientId: 'p5', recommendedBy: 'u2', recommendedByName: 'Dr. James Okafor', recommendedAt: d(0, 14, 0), status: 'pending_admin', notes: 'Patient has been fever-free for 4+ days. Safe to discharge.' },
  // P06 – completed (historical)
  { id: 'dr2', patientId: 'p6', recommendedBy: 'u1', recommendedByName: 'Dr. Sarah Chen',   recommendedAt: d(5, 15, 0), status: 'completed', notes: 'Criteria met.', completedBy: 'u5', completedAt: d(4, 10, 0) },
];

// ── PATIENT OUTCOMES ───────────────────────────────────────────────────────
export const SEED_OUTCOMES: PatientOutcome[] = [
  { id: 'o1', patientId: 'p6', outcome: 'survived', recordedAt: d(4, 10, 0),  recordedBy: 'u5', lengthOfStayDays: 11, notes: 'Full recovery.' },
  { id: 'o2', patientId: 'p7', outcome: 'deceased', recordedAt: d(10, 8, 0),  recordedBy: 'u5', lengthOfStayDays: 10, notes: 'Respiratory failure despite treatment.' },
];

// ── AUDIT LOGS ─────────────────────────────────────────────────────────────
export const SEED_AUDIT_LOGS: AuditLog[] = [
  { id: 'a1', actorId: 'u5', actorName: 'Admin Grace Park',  action: 'PATIENT_ADMITTED',       entityType: 'patient', entityId: 'p1', timestamp: d(4), details: 'Patient PT-001 admitted to bed A01' },
  { id: 'a2', actorId: 'u3', actorName: 'Nurse Priya Nair',  action: 'TEMP_RECORDED',           entityType: 'temperature', entityId: 't1', timestamp: d(1, 8, 30), details: 'Temperature 38.9°C for PT-001' },
  { id: 'a3', actorId: 'u2', actorName: 'Dr. James Okafor',  action: 'DISCHARGE_RECOMMENDED',  entityType: 'discharge', entityId: 'dr1', timestamp: d(0, 14, 0), details: 'Discharge recommended for PT-005' },
  { id: 'a4', actorId: 'u5', actorName: 'Admin Grace Park',  action: 'PATIENT_DISCHARGED',     entityType: 'patient', entityId: 'p6', timestamp: d(4, 10, 0), details: 'PT-006 discharged. Bed B04 released.' },
];

# CareTrack — Patient Monitoring & Facility Management

A working web app for a 74-bed virus quarantine & treatment facility. It coordinates
daily temperature tracking, doctor visits, discharge eligibility, bed occupancy, and
treatment-outcome reporting across three roles: **Nurse**, **Doctor**, and **Admin**.

This build is **UI-only with a demo data layer**: all data lives in React state and is
persisted to `localStorage`. There is no backend, no real authentication, and no network
calls. The demo mode is clearly labeled in the UI. For a production deployment you would
swap the demo store for Supabase (auth + Postgres + RLS) — see "Production path" below.

## Tech stack

- React 18 + Vite + TypeScript
- Tailwind CSS (white background, navy headings, teal/green accents)
- Lucide React icons
- Recharts for analytics
- React Router for navigation
- Vitest for the clinical-logic test suite

## Quick start

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
npm test         # run the clinical-logic tests
```

No environment variables are required for the demo. See `.env.example` for the
optional Supabase keys you would add for a production backend.

## Demo accounts

The login screen has one-click demo buttons. You can also sign in by entering any
of the seeded emails (any password works in demo mode):

| Role   | Name            | Email                          | What they can do                          |
|--------|-----------------|--------------------------------|-------------------------------------------|
| Admin  | Grace Park      | grace.park@caretrack.demo      | Admit patients, manage beds, complete discharges, manage users, view reports |
| Doctor | Dr. Sarah Chen  | sarah.chen@caretrack.demo      | Consultation queue, complete visits, recommend discharges, view reports |
| Nurse  | Priya Nair      | priya.nair@caretrack.demo      | Temperature checklist & recording, bed view |

## Navigation (role-filtered)

1. Dashboard — KPIs, attention queue, daily progress, recent activity
2. Patients — register, search, filter, detail view with temperature history
3. Temperature Tracking — daily checklist, recording, audited corrections
4. Doctor Visits — consultation queue, complete visits, recommend discharge
5. Discharge Management — eligibility, doctor-recommended queue, completed discharges
6. Bed Management — 74-bed grid across wards, occupancy indicators
7. Reports & Analytics — mortality/success rates vs. 15%/85% benchmarks, trends
8. User Management — staff accounts (admin only)

## Core clinical rules implemented

- **Fever threshold:** 37.8 °C (configurable in `src/data/seedData.ts`)
- **Valid temperature range:** 35.0–42.5 °C
- **Discharge criterion:** 3 consecutive fever-free days (complete observations only)
- **Duplicate daily reading prevention:** a second routine entry for the same patient
  on the same facility day is blocked; corrections go through an audited workflow that
  preserves the original value and a reason.
- **Fever-free counting:** uses the **max** temperature per day; missing data never
  counts as a fever-free day; a fever resets the streak.
- **Discharge flow:** eligibility → doctor recommendation → admin completion → bed
  released + survived outcome recorded. The bed is freed only after completion succeeds.
- **Bed capacity:** admissions are blocked at 74 occupied beds and when a bed is
  already occupied.
- **Reporting cohort:** only finalized outcomes (discharged-survived or deceased) count
  toward the denominator; active patients are excluded. A warning appears when observed
  mortality exceeds 15%, and a note warns against over-interpreting small samples.

## Audit trail

Sensitive actions (admission, temperature recording/correction, visit completion,
discharge recommendation/completion, user creation) are logged with actor, action,
timestamp, affected record, and reason where applicable. See the `auditLogs` in the
demo store.

## Seed data

`src/data/seedData.ts` seeds 6 staff, 15 patients, 74 beds (Wards A/B/C + ICU), and
matching temperature/visit/discharge/outcome records that demonstrate each scenario:
- A patient awaiting a temperature check (PT-001)
- A patient whose temperature is recorded but needs a doctor visit (PT-002)
- A patient with an elevated temperature / fever (PT-003)
- A patient with incomplete fever-free observations (PT-004 — 2 days)
- A patient who meets the discharge criterion and needs doctor review (PT-005)
- A patient with a completed discharge / survived outcome (PT-006)
- A deceased patient (PT-007)

To reset all demo data, clear site data / localStorage for the app, or remove the
`caretrack_state_v1` key in your browser dev tools.

## Demo workflow (end-to-end)

1. **Admin** → Patients → "Admit Patient" → fill name/age, pick an available bed → Save.
2. **Nurse** → Temperature Tracking → find the new patient → "Record Temp" → enter °C.
3. **Doctor** → Doctor Visits → open the patient's card → "Start Consultation" → add
   notes → "Complete Visit" (optionally "Recommend for discharge" if eligible).
4. **Admin** → Discharge Management → "Doctor Recommended" tab → "Complete Discharge".
5. The patient's bed is released and a "survived" outcome is recorded.
6. **Reports & Analytics** updates the mortality/success rates using finalized outcomes.

## Tests

`npm test` runs `src/utils/clinical.test.ts`, covering temperature validation, fever
detection, duplicate-daily-entry prevention, consecutive fever-free counting (including
max-per-day and reset behavior), discharge eligibility, and the no-fabricated-days rule.

## Project structure

```
src/
  components/
    layout/   Sidebar, Layout
    ui/       Badge, Card/KpiCard, FormField/Button, Modal, Toast
  context/    AppContext — demo store (localStorage persistence + audit)
  data/       seedData.ts — seed users, patients, beds, records, thresholds
  pages/      Login, Dashboard, Patients, PatientDetail, TemperatureTracking,
              DoctorVisits, DischargeManagement, BedManagement, Reports, UserManagement
  types/      shared TypeScript types
  utils/      clinical.ts (pure logic) + clinical.test.ts
  App.tsx     routes + role guards
  main.tsx    entry
```

## Production path (Supabase — not included in this UI build)

To make this production-ready you would:
1. Create Supabase tables: `profiles`, `patients`, `admissions`, `beds`,
   `temperature_records`, `doctor_visits`, `discharge_recommendations`,
   `patient_outcomes`, `audit_logs` — with FKs, unique indexes, and a partial unique
   index / DB constraint to prevent duplicate daily routine entries.
2. Add Row Level Security policies so each role can only read/write what it should.
3. Replace the demo store in `AppContext` with Supabase client calls; keep a server-side
   transaction for admissions (capacity + bed uniqueness) and discharges (bed release +
   outcome).
4. Never expose the service-role key in the frontend; enforce authorization in RLS and
   server-side functions, not just by hiding buttons in React.
5. Move the fever threshold / observation protocol to admin-configurable clinical settings
   validated by the medical team before production use.

## Notes & disclaimers

- Demo mode uses `localStorage`. It is **not** secure and must not be treated as
  production authentication or storage.
- Mortality/success rates are descriptive for the seeded cohort and should not be read as
  proof of treatment-quality change, especially with small samples.
- The discharge threshold and observation protocol are clinical decisions and must be
  approved by the medical team before any production use.
```

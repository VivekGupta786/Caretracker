import React from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

const styles: Record<Variant, string> = {
  success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border border-amber-200',
  danger:  'bg-red-100 text-red-800 border border-red-200',
  info:    'bg-blue-100 text-blue-800 border border-blue-200',
  neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
  purple:  'bg-purple-100 text-purple-800 border border-purple-200',
};

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, { variant: Variant; label: string }> = {
    active:             { variant: 'info',    label: 'Active' },
    discharge_eligible: { variant: 'success', label: 'Eligible for Discharge' },
    discharged:         { variant: 'neutral', label: 'Discharged' },
    deceased:           { variant: 'danger',  label: 'Deceased' },
  };
  const cfg = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function roleBadge(role: string) {
  const map: Record<string, { variant: Variant; label: string }> = {
    admin:  { variant: 'purple', label: 'Admin' },
    doctor: { variant: 'info',   label: 'Doctor' },
    nurse:  { variant: 'success', label: 'Nurse' },
  };
  const cfg = map[role] ?? { variant: 'neutral', label: role };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

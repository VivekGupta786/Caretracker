import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm ${hover ? 'hover:shadow-md hover:border-teal-200 cursor-pointer transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  alert?: boolean;
}

export function KpiCard({ title, value, subtitle, icon, iconBg = 'bg-teal-50', trend, alert }: KpiCardProps) {
  return (
    <Card className={`p-5 ${alert ? 'border-amber-200 bg-amber-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${alert ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={`${iconBg} p-3 rounded-xl`}>{icon}</div>
      </div>
    </Card>
  );
}

import { ClipboardList, Clock, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type KpiVariant = 'teal' | 'orange' | 'coral' | 'purple';

const VARIANT_CONFIG: Record<KpiVariant, { bg: string; icon: string; Icon: any }> = {
  teal: { bg: '#e8f2ef', icon: '#2d8a5e', Icon: ClipboardList },
  orange: { bg: '#fbefe3', icon: '#bf7840', Icon: Clock },
  coral: { bg: '#f9e9eb', icon: '#ae5c68', Icon: AlertTriangle },
  purple: { bg: '#eeeaf7', icon: '#7c6aa3', Icon: CheckCircle }
};

interface KpiCardProps {
  label: string;
  value: number;
  variant: KpiVariant;
  subtitle?: string;
  trend?: number;
  loading?: boolean;
}

export function KpiCard({ label, value, variant, subtitle, trend, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="kpi-card">
        <div className="kpi-header">
          <div className="kpi-skeleton-text" style={{ width: 80, height: 12 }} />
          <div className="kpi-skeleton-icon" />
        </div>
        <div className="kpi-skeleton-text" style={{ width: 50, height: 32, marginTop: 12 }} />
        <div className="kpi-skeleton-text" style={{ width: 100, height: 10, marginTop: 8 }} />
      </div>
    );
  }

  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.teal;
  const { Icon } = config;

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon" style={{ background: config.bg, color: config.icon }}>
          <Icon size={17} strokeWidth={1.8} />
        </div>
      </div>
      <div className="kpi-value">{String(value).padStart(2, '0')}</div>
      {subtitle && <div className="kpi-footer">{subtitle}</div>}
      {trend !== undefined && trend !== 0 && (
        <div className={`kpi-trend ${trend > 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="kpi-grid">{children}</div>;
}

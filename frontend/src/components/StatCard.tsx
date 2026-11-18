type StatCardProps = {
  icon: React.ReactNode;
  number: number | string;
  label: string;
  trend?: string;
  borderColor?: string;
};

export default function StatCard({ icon, number, label, trend, borderColor }: StatCardProps) {
  return (
    <div className="stat-card" style={borderColor ? { borderTopColor: borderColor } : undefined}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
      {trend && <div className="stat-trend">{trend}</div>}
    </div>
  );
}

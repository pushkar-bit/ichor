export function StatChip({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-foreground">
        {icon}
        <span className="font-semibold text-sm truncate">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-white/40">{label}</span>
    </div>
  );
}

export function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${className}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-14 h-14 rounded-2xl bg-midnight-raised flex items-center justify-center text-white/30 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-white/40 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-midnight-raised border border-border-ichor rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded skeleton" />
          <div className="h-2 w-20 rounded skeleton" />
        </div>
      </div>
      <div className="h-56 skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-full rounded skeleton" />
        <div className="h-3 w-2/3 rounded skeleton" />
      </div>
    </div>
  );
}

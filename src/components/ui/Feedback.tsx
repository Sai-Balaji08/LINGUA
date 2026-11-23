import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-mute">
      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
      {label}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`relative overflow-hidden rounded-xl bg-sunk ${className}`} aria-hidden="true" />;
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && <div className="text-cobalt">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-mute">{body}</p>
      {action}
    </div>
  );
}

const tones = {
  error: { cls: "border-coral/40 bg-coral-soft text-ink", Icon: AlertTriangle, role: "alert" as const },
  success: { cls: "border-mint/40 bg-mint-soft text-ink", Icon: CheckCircle2, role: "status" as const },
  info: { cls: "border-cobalt/30 bg-cobalt-soft text-ink", Icon: Info, role: "status" as const },
};

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children: ReactNode;
}) {
  const { cls, Icon, role } = tones[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  tone = "cobalt",
}: {
  value: number;
  label: string;
  tone?: "cobalt" | "mint" | "saffron";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const bar = tone === "mint" ? "bg-mint" : tone === "saffron" ? "bg-saffron" : "bg-cobalt";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-2.5 w-full overflow-hidden rounded-full bg-sunk"
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

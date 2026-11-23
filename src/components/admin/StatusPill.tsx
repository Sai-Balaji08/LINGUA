export function StatusPill({ published }: { published: boolean }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${published ? "bg-mint-soft text-ink" : "bg-sunk text-mute"}`}>
      {published ? "Published" : "Draft"}
    </span>
  );
}

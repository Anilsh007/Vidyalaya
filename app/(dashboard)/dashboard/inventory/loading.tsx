export default function InventoryLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-36 animate-pulse rounded-[28px] bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-[24px] bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="h-[520px] animate-pulse rounded-[24px] bg-slate-200" />
        <div className="h-[520px] animate-pulse rounded-[24px] bg-slate-200" />
      </div>
    </div>
  );
}

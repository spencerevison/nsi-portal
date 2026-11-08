type Phones = {
  phone: string | null;
  phone_label: string | null;
  phone2: string | null;
  phone2_label: string | null;
};

const linkCls =
  "text-foreground/80 decoration-muted-foreground/30 hover:decoration-foreground/50 underline underline-offset-2";

// one line per number, label (if any) in front
export function PhoneLinks({ m }: { m: Phones }) {
  const rows = [
    { num: m.phone, label: m.phone_label },
    { num: m.phone2, label: m.phone2_label },
  ].filter((r) => r.num);

  if (rows.length === 0) return <>&mdash;</>;

  return (
    <>
      {rows.map((r) => (
        <div key={r.num}>
          {r.label && (
            <span className="text-muted-foreground mr-1.5 text-xs">
              {r.label}
            </span>
          )}
          <a href={`tel:${r.num}`} className={linkCls}>
            {r.num}
          </a>
        </div>
      ))}
    </>
  );
}

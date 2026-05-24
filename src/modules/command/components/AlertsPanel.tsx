interface Props {
  hints: string[];
}

export function AlertsPanel({ hints }: Props) {
  if (hints.length === 0) return null;
  return (
    <div style={{ marginBottom: '1rem' }}>
      {hints.map((h) => (
        <div key={h} className="alert-banner">
          {h}
        </div>
      ))}
    </div>
  );
}

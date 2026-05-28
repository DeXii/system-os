import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  chips?: ReactNode;
}

export function ModuleShell({ title, subtitle, chips }: Props) {
  return (
    <header className="module-shell">
      <div>
        <h1 className="module-shell-title">{title}</h1>
        {subtitle && <div className="module-shell-sub">{subtitle}</div>}
      </div>
      {chips != null && <div className="module-shell-chips">{chips}</div>}
    </header>
  );
}

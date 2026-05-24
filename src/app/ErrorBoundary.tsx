import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AYANAKOJI OS runtime error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="boot-screen" style={{ padding: '2rem', maxWidth: 520 }}>
          <div className="boot-logo" style={{ marginBottom: '1rem' }}>
            ОШИБКА СИСТЕМЫ
          </div>
          <p style={{ fontSize: 13, marginBottom: '1rem', color: 'var(--danger)' }}>
            {this.state.error.message}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '1rem' }}>
            Откройте консоль браузера (F12) для деталей. Можно сбросить локальные данные.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

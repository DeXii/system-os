import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import '@/ui/styles/tokens.css';
import '@/ui/styles/os.css';
import '@/ui/styles/glossary.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

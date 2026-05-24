/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_GROQ_PROXY_URL?: string;
  readonly VITE_PROXY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

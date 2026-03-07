/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SHEETS_URL: string;
  readonly VITE_GOOGLE_SHEETS_VIEW_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

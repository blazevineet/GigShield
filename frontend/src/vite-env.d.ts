/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ML_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// This line stops the "Cannot find module './Layout.module.css'" error
declare module '*.module.css';
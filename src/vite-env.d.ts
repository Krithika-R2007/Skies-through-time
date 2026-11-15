/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SPHEREx Timekeeper backend. Defaults to http://localhost:8000 */
  readonly VITE_API_URL?: string
  /** Set to "1" to never contact the backend and always use demonstration data. */
  readonly VITE_FORCE_DEMO?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

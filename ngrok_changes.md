# NGROK & Subpath Routing Configuration (`/spark`)

This document details all structural and code changes made to configure the **ARCA-EMR-LITE Frontend** to run behind an **ngrok** tunnel and **Nginx Reverse Proxy / Kubernetes Ingress** under the subpath `/spark`.

---

## 1. Overview & Architecture

- **Public ngrok Entrypoint**: `https://78c9-103-64-129-250.ngrok-free.app`
- **Frontend Subpath**: `https://78c9-103-64-129-250.ngrok-free.app/spark/login`
- **Backend API Base URL**: `https://78c9-103-64-129-250.ngrok-free.app/spark-backend`

---

## 2. Core Configuration Changes

### A. Next.js Config (`next.config.mjs`)
- Added `basePath: '/spark'` so Next.js internal router serves all pages and assets under `/spark`.
- Added `skipTrailingSlashRedirect: true` to prevent automatic 308 redirects for trailing slashes when operating behind Nginx.

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/spark',
  skipTrailingSlashRedirect: true,
  // ...
};
```

### B. Environment Variables (`.env.local`)
- Removed trailing slashes from backend URLs to prevent double-slash API issues (e.g. `spark-backend//verify-session`).

```env
API_BASE_URL=https://78c9-103-64-129-250.ngrok-free.app/spark-backend
NEXT_PUBLIC_API_BASE_URL=https://78c9-103-64-129-250.ngrok-free.app/spark-backend
```

---

## 3. Codebase Changes Breakdown

### A. Voice Activity Detection (VAD) & ONNX WASM (`app/dashboard/hooks/useAudioRecorderVAD.js`)
Configured `@ricky0123/vad-web` / ONNX Runtime to request WASM binaries and model files from `/spark/`:

```javascript
const vad = await MicVAD.new({
  baseAssetPath: "/spark/",
  onnxWASMBasePath: "/spark/",
  modelURL: "/spark/silero_vad_legacy.onnx",
  workletURL: "/spark/vad.worklet.bundle.min.js",
  ortConfig: (ort) => { ort.env.wasm.wasmPaths = "/spark/"; },
  startOnLoad: false,
  // ...
});
```
*Fixed issue: Chrome strict MIME type error (`Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of application/octet-stream`) caused by fetching `.mjs` modules from root domain outside Nginx's `/spark` route.*

### B. Authentication & Token Management
- **`app/login/page.js`**: Updated login endpoint to `/spark/api/proxy/login` and signup to `/spark/api/backend/registerUser`.
- **`app/hooks/useTokenRefresher.js`**: Updated refresh polling to `/spark/api/refresh`.
- **`app/components/TokenRefreshManager.js`**: Updated token refresh fetch to `/spark/api/refresh`.

### C. Pages & Navigation
- **`app/newEncounter/page.js`**: Updated `/spark/api/backend/stats`, `/spark/api/backend/patients`, `/spark/api/backend/new_encounter`, `/spark/api/logout`, and `/spark/images/...`.
- **`app/reports/page.js`**: Updated `/spark/api/backend/meetings`, `/spark/api/backend/stats`, `/spark/api/backend/transcripts`, `/spark/api/logout`, and `/spark/images/...`.
- **`app/page.js`**: Updated all backend interaction endpoints (`select_language`, `clear_transcript`, `stats`, `get_transcript`, `update_transcript_section`, `generate_discharge_summary`, `get_discharge_summary`, `generate_summary`, `logout`).
- **`app/sidebar/page.js` & `app/header/page.js`**: Prefixed image icons (`new-document.png`, `home.png`, `file.png`, `add.png`, `app-logo.png`) with `/spark/images/`.

### D. Dashboard Components & Utilities
- **`ClinicalSummary.js`, `DischargeSummary.js`, `SummarySection.js`**: Prefixed whisper dictation API (`/spark/api/whisper/whisper-dictate`) and UI icons (`copy.png`, `downloads.png`, `edit.png`, `mic.png`, `stop.png`) with `/spark/images/`.
- **`RecordingPanel.js`**: Prefixed transcript copy and PDF download icons with `/spark/images/`.
- **`useAudioRecorder.js` & `useAudioRecorderVAD.js`**: Prefixed chunk upload endpoint with `/spark/api/backend/uploadchunk`.
- **`pdfGenerator.js`**: Prefixed PDF header logo with `/spark/images/app-logo.png`.

---

## 4. Required Nginx Configuration

To prevent 308 redirect loops and 404 errors, Nginx must pass `/spark` intact to Next.js (without a trailing slash after the port):

```nginx
location /spark {
    proxy_pass http://arca-spark-frontend-svc.nitik.svc.cluster.local:3000;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}
```

---

## 5. Docker Build & Push (`commands.txt`)

To ensure Next.js compiles `.next` with `basePath: '/spark'`, build with `--no-cache`:

```bash
docker buildx build \
--no-cache \
--platform linux/amd64 \
-t arca-spark-frontend:amd64 \
--load \
.

docker tag arca-spark-frontend:amd64 192.168.112.13:5000/arca-spark-frontend:v14

docker push 192.168.112.13:5000/arca-spark-frontend:v14
```

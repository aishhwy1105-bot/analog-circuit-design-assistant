# Working State

Captured: 2026-09-09

## Project

- Project root: `C:\Users\LENOVO\OneDrive\analog-circuit-design-assistant`
- Active frontend directory: `frontend-ui`
- Frontend stack: React 19 + Vite 8
- Frontend entry point: `frontend-ui/index.html` -> `frontend-ui/src/main.jsx` -> `frontend-ui/src/App.jsx`

## Start Command

Run from the frontend directory:

```powershell
Set-Location "C:\Users\LENOVO\OneDrive\analog-circuit-design-assistant\frontend-ui"
npm run dev
```

Equivalent one-line command:

```powershell
Push-Location "C:\Users\LENOVO\OneDrive\analog-circuit-design-assistant\frontend-ui"; npm run dev
```

Do not run `npm run dev` from the project root because the root does not contain `package.json`.

## Runtime And Port

- Detected Node.js: `v24.18.0`
- Detected npm: `11.16.0`
- `package.json` does not declare required `engines` versions.
- Vite's configured/default development port is `5173`; `vite.config.js` does not set a fixed port.
- At capture time, ports `5173` through `5176` were already occupied, so the active Vite instance used `5177`.
- Use the `Local` URL printed by Vite. Vite automatically selects the next available port when the default is occupied.

## Frontend Files Required

Required source/configuration files for the React/Vite frontend:

- `frontend-ui/package.json` - scripts and dependency declarations.
- `frontend-ui/package-lock.json` - locked npm dependency tree; use it with `npm ci`.
- `frontend-ui/index.html` - browser document and root mount element.
- `frontend-ui/vite.config.js` - React plugin and `/api/sns` development proxy.
- `frontend-ui/.env.local` - local Vite environment configuration.
- `frontend-ui/eslint.config.js` - lint configuration.
- `frontend-ui/src/main.jsx` - React bootstrap.
- `frontend-ui/src/App.jsx` - application logic, request handling, response parsing, and visualization data wiring.
- `frontend-ui/src/index.css` - global styles.
- `frontend-ui/src/App.css` - application styles.
- `frontend-ui/src/assets/hero.png` - referenced frontend image asset.
- `frontend-ui/public/favicon.svg` and `frontend-ui/public/icons.svg` - public assets.

Generated or installed directories are not source-of-truth files:

- `frontend-ui/node_modules/` is recreated with `npm ci`.
- `frontend-ui/dist/` is recreated with `npm run build`.

The separate `frontend/` directory contains a legacy Streamlit entry point and is not required to run the React/Vite frontend.

## Environment And Webhook

Required Vite variable:

```env
VITE_SNS_WEBHOOK_URL=https://api.agents.snsihub.ai/webhook/429f6f98-b971-4f81-af4f-3ddf454088a9
```

- Variable name: `VITE_SNS_WEBHOOK_URL`
- Current production SNS Workbench webhook URL: `https://api.agents.snsihub.ai/webhook/429f6f98-b971-4f81-af4f-3ddf454088a9`
- The value is read by `vite.config.js` through `loadEnv(mode, ".", "VITE_")`.
- Vite proxies `/api/sns` to the webhook origin and rewrites the request path to the webhook pathname.
- Do not replace this URL or introduce the old `3a1ce790` URL into the frontend.

Note: `backend/workbench_pipeline.json` records an older `3a1ce790...` URL and `LIVE` status. That file is not read by Vite and is not the active React frontend configuration. It must not be used to overwrite `frontend-ui/.env.local`.

## API Contract

The frontend request is unchanged:

- Request path: `/api/sns`
- HTTP method: `POST`
- Content type: `application/json`
- Request body:

```json
{
  "mode": "build",
  "user_prompt": "<user circuit request>"
}
```

The expected successful SNS Workbench response is the Copilot output returned directly by the Webhook Response:

```text
{{Copilot.content.parts[0].text}}
```

Expected parsed JSON shape:

```json
{
  "mode": "build",
  "status": "ready",
  "message": "The circuit design has been generated.",
  "design_summary": {},
  "schematic": {},
  "validation": {}
}
```

The current frontend parser preserves the parsed response fields and accepts these response forms:

1. Direct JSON with `response.schematic`.
2. A JSON string that must be parsed before reading `.schematic`.
3. An SNS wrapper at `response._responseData.schematic`.
4. The previously encountered nested SNS text at `response.items[0].json.content.parts[0].text`.
5. A JSON string in `response.body`.

`result.schematic` is passed into the existing circuit visualization. `result.validation`, `result.design_summary`, `result.message`, `result.mode`, and `result.status` remain on the stored result object.

## Current Workflow Order

The current known workflow order is:

```text
Webhook Trigger
  -> ASK/Input
  -> Plan Agent
  -> Design Agent
  -> Validation Agent
  -> Schematic Agent
  -> Copilot
  -> Webhook Response
```

The intended final data flow is:

```text
Design Agent
  -> Validation Agent
  -> Schematic Agent
  -> Copilot Agent
  -> Webhook Response
```

Do not reorder, edit, or redeploy the SNS Workbench workflow while preserving this state.

## Known Working State

- The production SNS Workbench webhook has been tested separately and returns HTTP 200.
- The React/Vite application is connected to the production webhook URL above and generates a circuit design.
- The frontend request uses the existing POST body and `/api/sns` path.
- The current parser is responsible for unwrapping the Copilot output and supplying the schematic to the visualization.
- No changes to the SNS Workbench workflow are part of this working state.

## Files That Must Not Be Deleted Or Renamed

Do not delete or rename these working frontend files:

- `frontend-ui/.env.local`
- `frontend-ui/package.json`
- `frontend-ui/package-lock.json`
- `frontend-ui/vite.config.js`
- `frontend-ui/index.html`
- `frontend-ui/src/main.jsx`
- `frontend-ui/src/App.jsx`
- `frontend-ui/src/index.css`
- `frontend-ui/src/App.css`
- `frontend-ui/public/favicon.svg`
- `frontend-ui/public/icons.svg`
- `frontend-ui/src/assets/hero.png`

Do not modify or reorder the SNS Workbench workflow represented by the documented order above.

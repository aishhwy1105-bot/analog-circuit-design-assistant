# Backup Notes

These instructions preserve and restore the verified frontend working state captured in `WORKING_STATE.md`.

## Before Any Future Change

1. Stop the Vite process for the frontend being changed.
2. Read `WORKING_STATE.md` before editing.
3. Do not change the SNS Workbench workflow or webhook URL.
4. Do not replace `frontend-ui/.env.local` with values copied from `backend/workbench_pipeline.json`; that backend file contains older webhook metadata.
5. Do not delete or rename the protected files listed in `WORKING_STATE.md`.
6. Keep the request as `POST /api/sns` with the existing JSON body.
7. Keep the response parser able to read the direct Copilot JSON and the documented wrapper forms.

## Restore From The Existing Backup Copy

A backup copy was created at:

```text
C:\Users\LENOVO\OneDrive\analog-circuit-design-assistant_BACKUP_WORKING
```

To restore the project tree after stopping all frontend processes, use PowerShell carefully from `C:\Users\LENOVO\OneDrive`:

```powershell
Rename-Item "analog-circuit-design-assistant" "analog-circuit-design-assistant_BROKEN"
Copy-Item "analog-circuit-design-assistant_BACKUP_WORKING" "analog-circuit-design-assistant" -Recurse -Force
```

The rename preserves the changed tree as `analog-circuit-design-assistant_BROKEN` instead of deleting it. Review that directory before removing it. Do not run the restore while files are open or while Vite is serving from the project.

If the backup directory is unavailable, restore the key frontend state manually:

```env
VITE_SNS_WEBHOOK_URL=https://api.agents.snsihub.ai/webhook/429f6f98-b971-4f81-af4f-3ddf454088a9
```

Use the exact Vite proxy in `frontend-ui/vite.config.js`:

```js
server: {
  proxy: {
    "/api/sns": {
      target: webhookOrigin,
      changeOrigin: true,
      secure: true,
      rewrite: () => webhookPath,
    },
  },
},
```

Keep the existing request in `frontend-ui/src/App.jsx`:

```js
fetch("/api/sns", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mode, user_prompt: userPrompt }),
});
```

## Reinstall And Run

From the restored frontend directory:

```powershell
Set-Location "C:\Users\LENOVO\OneDrive\analog-circuit-design-assistant\frontend-ui"
npm ci
npm run lint
npm run build
npm run dev
```

Use the `Local` URL printed by Vite. The normal default is port `5173`; if it is occupied, Vite selects the next available port.

## Verification Checklist

After restoration, verify all of the following before making any other changes:

- `frontend-ui/.env.local` contains the exact `429f6f98...` production URL.
- `vite.config.js` reads `VITE_SNS_WEBHOOK_URL` with `loadEnv`.
- `/api/sns` remains a Vite proxy route.
- The request remains `POST` with `{ mode, user_prompt }`.
- The response parser accepts the direct Copilot JSON containing `schematic`.
- `result.schematic` feeds the existing circuit visualization.
- `validation` and `design_summary` remain available on the stored result.
- `npm run lint` passes.
- `npm run build` passes.
- The SNS Workbench workflow order and Webhook Response expression remain unchanged:

```text
Webhook Trigger -> ASK/Input -> Plan Agent -> Design Agent -> Validation Agent -> Schematic Agent -> Copilot -> Webhook Response
```

```text
{{Copilot.content.parts[0].text}}
```

Do not change the webhook URL, create a webhook, reorder the workflow, or modify UI/circuit-generation behavior as part of restoration.

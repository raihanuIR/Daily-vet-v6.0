# DailyVet — Deploy Guide (All Platforms)

## 1. VS Code Live Server (Local)

1. Open the project folder in VS Code.
2. Install **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.
4. AI works with **direct API calls** (keys decoded at runtime from `js/dv-keys.js`).
5. No backend needed.

**Works out of the box.** No extra config.

---

## 2. Netlify (Drag & Drop)

1. Unzip the project.
2. Select **all files inside** the folder (`index.html`, `netlify.toml`, `netlify/`, `api/`, `js/`, `css/`, `assets/`, etc.).
3. Drag those contents into [Netlify Drop](https://app.netlify.com/drop).
4. Do **NOT** drag the outer folder alone.

After deploy:
- AI calls go to `/.netlify/functions/ai-proxy`
- Keys never appear in browser Network tab

Optional: Site settings → Environment variables (`GEMINI_KEY_1` …) override embedded fallbacks.

---

## 3. Vercel

1. Import the same folder / Git repo (or deploy via CLI / drag).
2. Framework Preset: **Other**
3. Build Command: leave empty
4. Output Directory: leave empty

`api/ai-proxy.js` is used automatically as a serverless function.

After deploy:
- AI calls go to `/api/ai-proxy`
- Keys stay server-side

---

## How AI routing works

| Environment          | Path used                      | Keys location              |
|----------------------|--------------------------------|----------------------------|
| VS Code Live Server  | Direct to Gemini/Groq/OpenRouter | `js/dv-keys.js` (client, XOR) |
| Netlify              | `/.netlify/functions/ai-proxy` | Server only                |
| Vercel               | `/api/ai-proxy`                | Server only                |

### Fallback order
1. Gemini (21 keys, rotation + fail-over)
2. Groq (5 keys)
3. OpenRouter (3 keys)

---

## Quick checklist

- [ ] `index.html` at the root of what you deploy
- [ ] `netlify.toml` + `netlify/functions/ai-proxy.js` present (Netlify)
- [ ] `vercel.json` + `api/ai-proxy.js` present (Vercel)
- [ ] `js/dv-keys.js` present (all platforms)
- [ ] After deploy, open `/ai.html` and test a question

No further setup needed.

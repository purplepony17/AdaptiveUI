# Gentle Browse

Adaptive cognitive accessibility for neurodivergent users.

---

## Opening in VS Code

1. Download and unzip this folder
2. Open VS Code
3. Click **File** → **Open Folder**
4. Select the `gentlebrowse` folder
5. VS Code will show all files in the left sidebar

---

## Setup

### 1. Install dependencies
Open the Terminal inside VS Code (press **Ctrl + `** or go to Terminal → New Terminal):
```
npm install
```

### 2. Add your Supabase keys
```
cp .env.example .env.local
```
Open `.env.local` and fill in your Supabase URL and anon key.

### 3. Set up database
In Supabase SQL Editor, paste and run everything in `supabase-schema.sql`

### 4. Run locally
```
npm run dev
```
Open http://localhost:5173

### 5. Deploy
Push to GitHub, import on vercel.com, add env variables, deploy.

---

## Adding your illustrations

### Garden scene (left panel on login page)
1. Export from GoodNotes as PNG (transparent background)
2. Save to `src/assets/garden-scene.png`
3. Open `src/pages/AuthPage.tsx`
4. Find the comment that says `YOUR GARDEN ILLUSTRATION GOES HERE`
5. Replace the `<div class="scenePlaceholder">` block with:
```tsx
<img src="/src/assets/garden-scene.png" alt="" aria-hidden className={styles.sceneImg} />
```

### Avatars
1. Export each avatar as PNG (80x80px, transparent bg)
2. Save to `src/assets/duck.png`, `spirit.png`, `flower.png`, `cat.png`
3. Open `src/pages/AuthPage.tsx`
4. Find the AVATARS array at the top
5. Change each `emoji` entry to an `img` tag if you prefer

---

## Loading the Chrome Extension

1. Open Chrome and go to: `chrome://extensions`
2. Turn on **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this project
5. The extension icon appears in your Chrome toolbar

### You need icon images first:
Create a folder called `icons` inside the `extension/` folder.
Add three PNG files named `icon16.png`, `icon48.png`, `icon128.png`.
(Any image works as placeholder — use your plant logo when ready)

---

## Pushing updates to GitHub
```
git add .
git commit -m "what you changed"
git push
```
Vercel redeploys automatically within 60 seconds.

---

## What each file does

| File | What it does |
|------|-------------|
| `src/pages/AuthPage.tsx` | Login and signup page |
| `src/pages/Dashboard.tsx` | Main dashboard with all features |
| `src/hooks/useCognitiveLoad.ts` | Tracks behavior to detect overload |
| `src/hooks/usePomodoro.ts` | Pomodoro timer logic |
| `src/hooks/useAuth.ts` | Login, signup, profile saving |
| `src/lib/supabase.ts` | Database connection and types |
| `src/index.css` | All the colors, themes, fonts |
| `extension/content.js` | Applies settings to every website |
| `extension/popup.js` | The extension popup UI |
| `supabase-schema.sql` | Run this in Supabase to set up database |

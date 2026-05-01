# Setup Guide — Backend + Database

This project now has a real backend (Vercel Serverless Functions) and a Postgres database. Follow these steps once after pushing this code to GitHub.

## 1. Push to GitHub

```bash
git add .
git commit -m "Add backend (Vercel Postgres + auth)"
git push
```

Vercel will automatically pick up the push and start a deployment — but it will **fail or behave incorrectly** until you finish steps 2 and 3.

## 2. Create a Postgres database in Vercel (Neon)

Vercel renamed "Vercel Postgres" → it's now provided through **Neon** in the Marketplace.

1. Go to your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Click the **Storage** tab in the left sidebar.
3. Scroll to **Marketplace Database Providers** and click **Create** next to **Neon — Serverless Postgres**.
4. Walk through the prompts:
   - Pick a region close to you (e.g. `Singapore (sin1)` for India).
   - Name it something like `element-db`.
   - Make sure this Vercel project is selected and that **Production**, **Preview**, and **Development** environments are all checked.
   - Leave the env-var prefix at its default (empty) unless you have a reason to change it.

Vercel automatically injects a connection-string env var into your project. The exact name is usually `DATABASE_URL` (modern Neon marketplace default), or `POSTGRES_URL` (legacy). Our backend (`api/_lib/db.js`) auto-detects whichever one is set — you don't need to copy anything.

## 3. Add a JWT secret

Login tokens are signed with a secret only your server knows.

1. Generate a random string. From any terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   (or just mash the keyboard for ~60 characters of letters/numbers)
2. In Vercel: **Project → Settings → Environment Variables**.
3. Add a new variable:
   - **Key:** `JWT_SECRET`
   - **Value:** the random string from step 1
   - **Environments:** check Production, Preview, and Development
4. Click **Save**.

## 4. Redeploy

After adding env vars, trigger a fresh deploy so they take effect:
- Either push a new commit, or
- In the Vercel dashboard go to **Deployments → ... → Redeploy** on the latest deployment.

## 5. First use

1. Open your deployed site.
2. You'll see a sign-in screen. Click **Create Account**, fill it in, and submit.
3. Tables (`users`, `employees`) are created automatically the first time the database is touched. Your account is the first user.
4. Start adding employees. They're now stored in Postgres and shared across any browser/device that signs in to the same account.

---

## Local development (optional)

If you want to run the app locally with the real backend:

```bash
npm install
npm install -g vercel       # one-time
vercel link                 # connect this folder to your Vercel project
vercel env pull .env.local  # download env vars from Vercel
vercel dev                  # serves frontend + /api routes on http://localhost:3000
```

> Don't open `index.html` directly via `file://` — the `/api/*` calls won't resolve. Always go through `vercel dev` or the deployed URL.

---

## Troubleshooting

**"Unauthorized. Please sign in."** appears right after signing in
→ `JWT_SECRET` isn't set, or you signed in *before* it was set. Re-add the env var, redeploy, and sign in again.

**500 error on signup/login**
→ Database isn't connected. Re-check step 2 — confirm the Postgres DB is linked to this project under Storage.

**Can't sign in on phone but can on laptop (or vice-versa)**
→ Each browser holds its own JWT in `localStorage`. That's normal — just sign in on the new device. The data is shared on the server side.

**Forgot password**
→ Not implemented yet. For now, you can manually delete a user row from the Vercel Postgres "Data" tab and re-sign-up. Password reset is a planned future feature.

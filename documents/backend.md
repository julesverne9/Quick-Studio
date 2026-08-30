# Backend — Deployment and Configuration

The backend is a Node.js/Express API using Mongoose (MongoDB), deployed on **Render**.

## Required environment variables

The server validates these on startup and will **refuse to start** if any are missing — this is intentional (a previous version of this app had hardcoded fallback secrets, which was a security issue; the current version fails loudly instead of silently falling back to something insecure).

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Full MongoDB Atlas connection string (see `DATABASE.md`) |
| `JWT_SECRET` | Secret used to sign auth tokens. Must be a long, random string — generate one with `openssl rand -hex 32` or an equivalent secure random generator. Never reuse a placeholder/example value. |
| `PUBLIC_BASE_URL` | The backend's actual public URL (e.g. `https://quick-studio.onrender.com`). Used to construct asset URLs (exported photos/videos) that the client can actually reach — do not rely on `req.protocol`/`localhost`, which breaks behind Render's TLS termination. |
| `RESEND_API_KEY` | API key for sending OTP verification emails via Resend (see below) |
| `RESEND_FROM_EMAIL` | The sender address used for OTP emails |

Set these under the service's **Environment** tab in the Render dashboard, not in code. Changing an environment variable triggers a redeploy automatically.

## Deploying on Render

1. Connect the GitHub repository to a Render Web Service.
2. Build command: `npm install`
3. Start command: `npm start` (runs `node server.js`)
4. Set all environment variables listed above.
5. Enable **Auto-Deploy** for the branch you push to, so pushes automatically trigger a redeploy. Render only ever deploys what's been pushed to GitHub — local changes do nothing until pushed.

## Email delivery (OTP) via Resend

OTP verification emails are sent through [Resend](https://resend.com) rather than raw SMTP, since SMTP ports are commonly restricted on hosts like Render.

### Current setup: sandbox mode
Without a verified custom domain, Resend restricts sending to `onboarding@resend.dev` as the sender, and **email delivery only works to the address associated with the Resend account itself.** This is sufficient for internal testing and demos where the tester's email matches the Resend account, but will not deliver to arbitrary user emails.

### To support real users (future work)
1. Purchase/own a domain.
2. In the Resend dashboard, go to Domains → Add Domain, and add the DNS records it provides (DKIM, SPF/CNAME records, and a recommended DMARC record) at your domain registrar's DNS settings.
3. Once verified, update `RESEND_FROM_EMAIL` to an address on that verified domain, and sending will no longer be restricted to the account owner's email.

### Getting a Resend API key
1. Sign up at resend.com (no credit card required for the free tier).
2. Dashboard → API Keys → Create API Key → Full Access.
3. Copy the key immediately — Resend only shows it once.

## Video export/render pipeline

Video export runs server-side via FFmpeg (`fluent-ffmpeg`). Key points for whoever maintains this:
- There is a single canonical render endpoint — avoid reintroducing duplicate FFmpeg code paths across route files, as this app previously had three overlapping ones that drifted out of sync.
- Rendering runs asynchronously — the API responds immediately with a job/project reference, and the client tracks progress via Socket.io, rather than the HTTP request blocking until the render finishes.
- Export time is affected by Render's CPU allocation on its current plan — if export speed needs to improve further, both FFmpeg preset/encoding settings and Render's plan tier are worth reviewing.
- Rendered output files are currently stored on local disk, which Render wipes on redeploy/restart (see README limitations). Moving to persistent object storage is recommended before scaling this to more users.

## Security notes for future maintainers
- Do not reintroduce hardcoded fallback values for secrets or connection strings.
- `/api/video/*` routes require authentication — don't add new media/export routes without the same auth middleware.
- File upload routes have size limits configured via multer — keep these in place on any new upload endpoints.
- CORS is locked to the app's actual origin — don't revert to a wildcard `*` origin.
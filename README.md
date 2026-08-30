# QuickStudio

QuickStudio is a mobile photo and video editing application built with React Native (Expo) on the client and a Node.js/Express + MongoDB backend. It allows users to import media, apply photo filters and effects, edit video on a multi-track timeline, and export finished content directly from their phone.

This project was built as part of an internship at **Tech Power Solutions**.

---

## What the app does

**Authentication**
- Email-based registration with OTP verification (delivered via Resend)
- Login with JWT-based session handling, stored securely on-device
- Account management (view/delete account)

**Photo Editor**
- Filter presets and adjustable intensity sliders
- Layers system: add stickers/overlays on top of a base image, reposition, resize, rotate, and reorder them
- Export flattens all visible layers into the final image

**Video Editor**
- Multi-track timeline: main video track, music track, and additional tracks for future expansion (overlays, voice-over, subtitles, stickers)
- Trim clip in/out points
- Split a clip by duplicating it and trimming each copy independently
- Adjust per-clip playback speed and volume
- Reorder clips on a track via drag-and-drop
- Export renders the project server-side via FFmpeg into a single final video file

**Backend**
- REST API (Express) backing both editors
- MongoDB (via Mongoose) for user accounts and project data
- Server-side video rendering via FFmpeg, running as an asynchronous job so the app doesn't block waiting on the HTTP response
- Deployed on Render

---

## Project structure

```
Quick-Studio-main/
├── frontend/     # Expo React Native app
└── backend/      # Express + MongoDB API, deployed on Render
```

See the handover documentation for setup and deployment details:
- `FRONTEND.md` — running and building the mobile app
- `BACKEND.md` — deploying and configuring the backend, including the Resend email integration
- `DATABASE.md` — MongoDB Atlas setup and data model overview

---

## Known limitations

This was built solo, on a compressed timeline, with a focus on getting core functionality genuinely working end-to-end rather than full production hardening. Worth knowing before extending it further:

- **Storage is local disk on Render**, which is ephemeral — uploaded/rendered files do not persist across a redeploy or restart. Moving to persistent object storage (e.g. S3-compatible storage) would be the natural next step for production use.
- **No automated test suite.** All verification during development was manual, on-device.
- **Render's hosting tier has limited CPU**, which affects video export time — this is partly an infrastructure constraint, not purely a code issue.
- **Email delivery via Resend is currently limited to sandbox mode** unless a custom domain is verified (see `BACKEND.md`) — until then, OTP emails can only be delivered to the email address associated with the Resend account used.
- Some timeline tracks (overlays/PIP, voice-over, subtitles, stickers on video) exist in the UI but do not yet have full backing functionality or export support — only the main video track and music track are currently reflected in the final export.

---

## Contributor

Built by a single intern at Tech Power Solutions over the course of the internship, working independently across the full stack — frontend, backend, and deployment.
# Database — MongoDB Atlas Setup and Data Model

The backend uses MongoDB Atlas (cloud-hosted MongoDB) via Mongoose.

## Setting up the cluster

1. Create a free MongoDB Atlas account at mongodb.com/atlas if you don't already have access to the existing project's cluster.
2. Create a cluster (the free M0 tier is sufficient for development/demo purposes).
3. Under **Database Access**, create a database user with a strong, unique password.
4. Under **Network Access**, allow access from Render's IP range, or `0.0.0.0/0` (allow from anywhere) for simplicity during development — note this is less restrictive and worth tightening for production use.
5. Get the connection string from the Atlas dashboard (Connect → Drivers), and set it as `MONGODB_URI` in Render's environment variables (see `BACKEND.md`). It will look like:
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
   ```

## Data model overview

### `User` collection
- Email (unique)
- Password (hashed with bcrypt, stored with `select: false` so it's excluded from normal queries by default)
- OTP fields (for email verification during registration/login)
- Standard timestamps

### `Project` collection
- Owner reference (linked user, where applicable) and/or a guest device identifier for unauthenticated/guest usage
- Asset URLs (photo/video source and exported output references)
- Project metadata (clip data, trim points, speed/volume settings, track structure) — this is stored in a flexible format to accommodate the evolving editor feature set
- Status field (e.g. tracking render/export state: queued, processing, complete)

## Notes for future maintainers
- Consider adding indexes on frequently queried fields (owner reference, guest device identifier, status) if project volume grows — these were not present as of this handover and querying performance has not been an issue yet at current scale, but this is a known gap worth addressing before scaling up usage.
- If a project's metadata structure needs to change going forward, be deliberate about backward compatibility — existing projects in the database won't automatically have new fields, so either provide sensible defaults in application code or write a migration for existing documents.
- Rotate the database user's password if it's ever exposed (e.g. accidentally committed to a public repo, shared insecurely, etc.) — this project previously had a hardcoded connection string fallback in code, which has since been removed, but it's worth confirming the original credentials from that period were rotated if they weren't already.

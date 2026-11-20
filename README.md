# RoyalTech — Innovation CRM

Forest & champagne CRM for RoyalTech with role-based dashboards, a shared data model, and Google Sheets sync.

## Run

```bash
npm install
npm run server   # API + MySQL on :4000
npm run client   # or: npm run dev (API + UI together)
```

Open [http://localhost:5173](http://localhost:5173) and sign in.

### MySQL (Sales Management)

- Schema: `server/db/schema.sql`
- Seed: `server/db/seed.sql`
- Config: `.env` (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, …)

If MySQL/MariaDB is offline, the API falls back to an in-memory store automatically.

## Login accounts

| Role | Email | Password |
| --- | --- | --- |
| Super Admin (Founder) | aryan@royaltech.io | founder123 |
| HR Admin | Google only: hr@royaltechinnovation.co.in | Sign in with Google |
| Sales Manager | rahul@royaltech.io | Google or sales123 |
| Sales Executive | sara@royaltech.io | Google or exec123 |
| Project Manager | vikram@royaltech.io | Google or pm123 |
| Developer | ananya@royaltech.io | Google or dev123 |
| Website Admin | omar@royaltech.io | Google or web123 |
| Finance Admin | meera@royaltech.io | Google or finance123 |

### Google Client ID (each CRM adds its own)

If you set up CRM for **another person / another company**, they must create **their own** Google Client ID and put it in **their** `.env`. Do not copy someone else’s Client ID.

1. That person opens [Google Cloud Console](https://console.cloud.google.com/) → new project  
2. **OAuth consent screen** → add their team emails as Test users  
3. **Credentials** → **OAuth client ID** (Web) → copy Client ID  
4. In their project `.env` add:

```env
VITE_GOOGLE_CLIENT_ID=their-own-client-id.apps.googleusercontent.com
```

5. Restart the app (`npm run dev`)

**Sign-in rules:** each user signs in with Google using the email registered in CRM. HR opens only with that CRM’s HR Google mailbox (here: `hr@royaltechinnovation.co.in`).

## Key features

1. **Centralized database** — leads, clients, employees, projects, website enquiries, and finance share one store.
2. **Google Sheets sync** — Sales → Google Sheets Integration (unique lead IDs, duplicate detection, sync logs).
3. **Role-based permissions** — salary, finance reports, and admin settings stay gated.

Demo data persists in the browser. Use **Reset demo data** in the sidebar to restore the sample set.

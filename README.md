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
| HR Admin | neha@royaltech.io | hr123 |
| Sales Manager | rahul@royaltech.io | sales123 |
| Sales Executive | sara@royaltech.io | exec123 |
| Project Manager | vikram@royaltech.io | pm123 |
| Developer | ananya@royaltech.io | dev123 |
| Website Admin | omar@royaltech.io | web123 |
| Finance Admin | meera@royaltech.io | finance123 |

Each login opens that role’s own dashboard and menu. Use **Log out** to switch users.

## Key features

1. **Centralized database** — leads, clients, employees, projects, website enquiries, and finance share one store.
2. **Google Sheets sync** — Sales → Google Sheets Integration (unique lead IDs, duplicate detection, sync logs).
3. **Role-based permissions** — salary, finance reports, and admin settings stay gated.

Demo data persists in the browser. Use **Reset demo data** in the sidebar to restore the sample set.

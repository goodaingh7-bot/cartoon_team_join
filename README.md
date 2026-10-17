# DreamKatha Toons recruitment website

Responsive single-page recruitment form with Supabase storage and a hidden admin dashboard.

## 1. Configure Supabase

The current project URL and publishable key are in `config.js`. The publishable key is intended for browser use; never add a service-role/secret key to this project.

In the Supabase SQL Editor, run the schema/policies from `supabase-setup.sql`.

## 2. Create your admin

1. In Supabase Authentication, create the admin user with email/password (or invite/create the user).
2. Copy that user's **Auth user UUID**.
3. Run this SQL, replacing the UUID with the user ID from the *current* Supabase project:

```sql
insert into public.admin_users (user_id)
values ('PASTE-AUTH-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

An admin UUID from a different Supabase project will not work. Do not use an email in `admin_users`; it stores the Auth UUID.

## 3. Run / deploy

Open `index.html` through a local static server (for example VS Code Live Server) or deploy the folder to any static host. Supabase requires the schema to be applied first. The form is intentionally public; only authenticated users on the `admin_users` allowlist can read/update/delete applications.

## Admin access

Click the circular logo 10 times quickly to open the private sign-in dialog. After login, the app calls `is_team_admin()` and only shows the dashboard if the authenticated UUID is allowlisted.

## Social links

Instagram: https://www.instagram.com/plg_gang_?psln=MWNhbHRhcGsycWM1OQ==
Telegram: https://t.me/dreamkathatoonss

Instagram icon background: the white background connected to the image edges was made transparent; the white Instagram glyph inside the gradient remains intact.

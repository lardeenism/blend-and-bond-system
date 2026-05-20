# 🚀 Deployment Checklist

## Phase 1: Database Setup (Supabase)
- [ ] Created Supabase project
- [ ] Executed `supabase_schema.sql` in SQL Editor
- [ ] Executed `supabase_seed.sql` in SQL Editor
- [ ] Copied database credentials (host, password, etc.)

## Phase 2: Backend Setup (Render)

### Environment Variables to Set:
- [ ] `DB_HOST` = `db.[YOUR_PROJECT_ID].supabase.co`
- [ ] `DB_USER` = `postgres`
- [ ] `DB_PASSWORD` = *Your Supabase password*
- [ ] `DB_NAME` = `postgres`
- [ ] `DB_PORT` = `5432`
- [ ] `NODE_ENV` = `production`
- [ ] `JWT_SECRET` = *Generate a random string (use online generator)*
- [ ] `CLIENT_URL` = *Your Vercel URL (from Step 3)*
- [ ] `PORT` = `5000`

### Before Deploying:
- [ ] Pushed code to GitHub with backend fixes
- [ ] Backend no longer tries to serve frontend
- [ ] vercel.json rewrites pointing to correct Render URL

### After Deploying:
- [ ] Render service deployed successfully
- [ ] Copied Render URL (e.g., `https://blend-and-bond-system.onrender.com`)
- [ ] Tested with `/api/health` endpoint

## Phase 3: Frontend Setup (Vercel)

### Environment Variables to Set:
In Vercel Project Settings → Environment Variables:

| Variable | Value | Scope |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://blend-and-bond-system.onrender.com` | Production |

### Deployment:
- [ ] Pushed code to GitHub
- [ ] Vercel auto-deployed frontend
- [ ] vercel.json correctly routes `/api/*` to Render backend

## Phase 4: Testing

- [ ] Frontend loads at Vercel URL
- [ ] Login page loads without errors
- [ ] Login with `jireh/faith` works
- [ ] Products page loads (calls `/api/products`)
- [ ] Admin dashboard loads
- [ ] No CORS errors in browser console

## Phase 5: Troubleshooting

If database connection fails:
- [ ] Verify all DB environment variables on Render are correct
- [ ] Check Supabase database is running
- [ ] Verify Supabase IP whitelist allows Render IPs
- [ ] Check Render logs for specific error messages

If frontend can't reach backend:
- [ ] Verify Render URL in vercel.json is correct
- [ ] Check Render service is deployed and running
- [ ] Test Render backend directly: `https://your-render-url/api/health`
- [ ] Clear browser cache and try again

If login fails:
- [ ] Check browser Network tab for API errors
- [ ] Verify JWT_SECRET is set on Render
- [ ] Check if user exists in database (run init-db if needed)

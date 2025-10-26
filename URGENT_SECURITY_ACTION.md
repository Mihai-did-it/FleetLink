# 🚨 URGENT: API Keys Exposed on GitHub

## Current Situation

Your Supabase and Mapbox API keys are **publicly visible** in your GitHub repository history at:
`https://github.com/Mihai-did-it/FleetLink`

**Exposed in commits:**
- `a71f66a` - "vercel attempt1"
- `d2ad7a6` - "supabase linked"  
- And potentially earlier commits

## Immediate Actions Required (Do These NOW)

### 1. Rotate Your Supabase Keys (CRITICAL)

**Your exposed Supabase credentials:**
- URL: `https://ncfqkcybnfncsklfdevj.supabase.co`
- Anon Key: `eyJhbGci...rdg` (visible in GitHub)

**Steps to rotate:**
1. Visit: https://app.supabase.com/project/ncfqkcybnfncsklfdevj/settings/api
2. Click "Reset" on your API keys
3. Copy the new keys
4. Update your local `.env` file with new keys
5. Test your app locally to ensure it still works

### 2. Rotate Your Mapbox Token (CRITICAL)

**Your exposed Mapbox token:**
- Token: `pk.eyJ1IjoibW5pZmFpIiwiYSI6ImNtZjM5dng3dzAxZWYybHEwdmZ2MmE4MDkifQ.CGxxP82dHH4tu6V9D6FhHg`

**Steps to rotate:**
1. Visit: https://account.mapbox.com/access-tokens/
2. Find and **Delete/Revoke** the exposed token
3. Create a new public token
4. Update your local `.env` file with the new token
5. Test your app locally

### 3. Commit and Push the Secured Code

```bash
# Stage the security fixes
git add .gitignore src/lib/supabase.ts src/FleetLinkApp.tsx .env.example SUPABASE_SETUP.md debug-full.sh debug-page.html

# Commit the changes
git commit -m "security: Move API keys to environment variables

- Remove hardcoded Supabase credentials
- Remove hardcoded Mapbox token
- Add proper .env configuration
- Update .gitignore to prevent future exposure
- Old keys will be rotated"

# Push to GitHub
git push origin main
```

### 4. Optional: Clean Git History

If you want to remove the exposed keys from git history entirely:

```bash
# Option A: Use BFG Repo-Cleaner (easiest)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Create a file with your old keys
cat > passwords.txt <<EOF
pk.eyJ1IjoibW5pZmFpIiwiYSI6ImNtZjM5dng3dzAxZWYybHEwdmZ2MmE4MDkifQ.CGxxP82dHH4tu6V9D6FhHg
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnFrY3libmZuY3NrbGZkZXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyODAxMDgsImV4cCI6MjA3NDg1NjEwOH0.DY2U6yEGxPG0fy9NPYuZc84kqer6GjgWYX7lPKo6rdg
https://ncfqkcybnfncsklfdevj.supabase.co
EOF

# Run BFG
java -jar bfg.jar --replace-text passwords.txt

# Clean up
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push origin main --force

# Option B: Start Fresh (nuclear option)
# 1. Delete the GitHub repository
# 2. Create a new repository
# 3. Push only the cleaned code
```

## What I Fixed Locally

✅ Created `.env` file with your keys (not committed)
✅ Updated `.gitignore` to exclude `.env` files
✅ Modified `src/lib/supabase.ts` to use `import.meta.env.VITE_SUPABASE_*`
✅ Modified `src/FleetLinkApp.tsx` to use `import.meta.env.VITE_MAPBOX_TOKEN`
✅ Cleaned hardcoded keys from documentation and debug files
✅ Updated `.env.example` with placeholder values

## Important Notes

- **Until you rotate the keys, they are still valid and exposed**
- Anyone with these keys can access your Supabase database
- Anyone with your Mapbox token can consume your API quota
- The `.env` file is already in your `.gitignore`, so it won't be committed

## Verification Checklist

After rotating keys:
- [ ] New Supabase keys are in `.env`
- [ ] New Mapbox token is in `.env`
- [ ] App works locally with new keys
- [ ] Committed and pushed the secured code
- [ ] Old keys have been rotated/revoked
- [ ] (Optional) Git history cleaned

## Prevention for Future

1. **Never hardcode secrets** - always use environment variables
2. **Check before committing** - review what you're committing
3. **Use pre-commit hooks** - set up git hooks to scan for secrets
4. **Regular audits** - periodically check for exposed credentials

## Need Help?

If you need assistance with any of these steps, let me know!

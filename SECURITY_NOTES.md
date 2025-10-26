# Security Notes

## ⚠️ Important: API Keys Were Exposed

Your API keys were previously hardcoded in the source code. They have been moved to environment variables, but you should consider rotating them as a precaution.

## Actions Taken

1. ✅ Created `.env` file with your current API keys
2. ✅ Updated `.gitignore` to prevent committing `.env` files
3. ✅ Modified `src/lib/supabase.ts` to use environment variables
4. ✅ Modified `src/FleetLinkApp.tsx` to use environment variables
5. ✅ Cleaned up hardcoded keys from:
   - `.env.example`
   - `SUPABASE_SETUP.md`
   - `debug-full.sh`
   - `debug-page.html`

## Recommended Next Steps

### 1. Rotate Your Supabase Keys (Recommended)

Since your Supabase credentials were exposed in the codebase:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `ncfqkcybnfncsklfdevj`
3. Go to Settings → API
4. Click "Reset" on your API keys
5. Update your `.env` file with the new keys

### 2. Rotate Your Mapbox Token (Recommended)

1. Go to [Mapbox Tokens](https://account.mapbox.com/access-tokens/)
2. Revoke the old token: `pk.eyJ1IjoibW5pZmFpIiwiYSI6ImNtZjM5dng3dzAxZWYybHEwdmZ2MmE4MDkifQ.CGxxP82dHH4tu6V9D6FhHg`
3. Create a new public token
4. Update your `.env` file with the new token

### 3. Clean Git History (If Pushed to GitHub)

If you've pushed this code to a public repository, the keys are still visible in git history. You'll need to:

```bash
# Check if keys are in git history
git log --all --full-history --source --grep="supabase" --grep="mapbox" -i

# If found, consider using git-filter-repo or BFG Repo-Cleaner to remove them
# Or create a fresh repository without the history
```

### 4. Check Your `.env` File

Make sure your `.env` file exists and is NOT committed:

```bash
# Verify .env is in .gitignore
cat .gitignore | grep .env

# Verify .env is not tracked
git status | grep .env
```

## Going Forward

**Never commit sensitive data:**
- ❌ API keys, tokens, passwords
- ❌ Database credentials
- ❌ Secret keys

**Always use environment variables:**
- ✅ Store secrets in `.env` files
- ✅ Use `import.meta.env.VITE_*` in your code
- ✅ Keep `.env` in `.gitignore`
- ✅ Document required variables in `.env.example` (without real values)

## Current Protection Status

✅ `.env` file is gitignored
✅ Environment variables are properly configured
✅ Code no longer contains hardcoded secrets
⚠️ Old keys may still be valid - consider rotating them

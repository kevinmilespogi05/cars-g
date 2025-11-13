# Deploying Cars-G to Netlify

This file explains how to deploy the Cars-G frontend to Netlify and the recommended environment settings.

1) Connect your repo

- In Netlify, create a new site from Git and connect your GitHub/GitLab/Bitbucket repo.

2) Build settings (these are set in `netlify.toml` added to the repo)

- **Build command:** `npm ci --include=dev && npm run build`
- **Publish directory:** `dist`

Notes: the build command installs `devDependencies` (needed for native tools like `esbuild` and `sharp`) then runs the Vite build which outputs to `dist`.

3) Environment variables (required)

Set the following in Netlify Site Settings → Build & deploy → Environment:

- `VITE_SUPABASE_URL` = your supabase url
- `VITE_SUPABASE_ANON_KEY` = your anon key
- `SUPABASE_SERVICE_ROLE_KEY` = (optional) service role key if backend integrations are needed
- `FRONTEND_URL` = `https://<your-netlify-site>.netlify.app` (or your custom domain)
- Any Cloudinary or Firebase env vars used by the app (e.g. `VITE_CLOUDINARY_*`, `FCM_PROJECT_ID`, etc.)

4) CSP & fonts

- `netlify.toml` defines a Content-Security-Policy allowing the external font host `https://r2cdn.perplexity.ai` and Google Fonts. Adjust the CSP if you use additional external resources.

5) Socket and API backend

- The frontend is static and must point to your API/socket servers via env variables (e.g. `VITE_API_URL`, `VITE_SOCKET_URL`). Keep your API/Socket on a server (Render, DigitalOcean, etc.).

6) Alternative: pre-build and commit `dist/`

- If you prefer not to install devDependencies on Netlify or have build issues with native binaries, build locally and commit `dist/` to the repo. Then change the Netlify build command to a no-op (or remove it) and set `publish = "dist"`.

7) Deploy

- Push changes to your repo branch connected to Netlify. Netlify will run the build command and publish the site.

Troubleshooting

- If the build fails due to a locked binary or permissions (Windows-specific), build locally and push `dist/`.
- If fonts are blocked by CSP, update `netlify.toml` CSP `font-src` directive.

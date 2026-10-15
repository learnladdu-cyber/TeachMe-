# Deploy TeachMe Back to Vercel

This project is configured for deployment on Vercel with a static frontend and a serverless API route.

## Option 1: Deploy from the Vercel dashboard

1. Open [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import the repository:

   ```text
   learnladdu-cyber/TeachMe-
   ```

3. Use these project settings:

   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** leave empty
   - **Output Directory:** leave empty
   - **Install Command:** leave empty

   The repository's `vercel.json` configures the frontend and API route.

4. Add these Environment Variables before deploying:

   ```text
   LLM_API_KEY=your_provider_api_key
   LLM_MODEL=gpt-4o-mini
   LLM_BASE_URL=https://api.openai.com/v1
   ```

   `LLM_API_KEY` is read only by the server-side `/api/teach` function. Never add it to `public/` or commit it to Git.

5. Click **Deploy**.

## Option 2: Deploy with the Vercel CLI

Install and authenticate with Vercel:

```bash
npm install -g vercel
vercel login
```

From the repository root, run:

```bash
vercel
```

For a production deployment:

```bash
vercel --prod
```

When prompted, link the deployment to the appropriate Vercel project.

## Verify the deployment

After deployment, open the generated Vercel URL and verify:

1. The landing page loads.
2. The Photosynthesis demo starts a teaching session.
3. An explanation can be submitted.
4. The student replies and the confusion meter changes.
5. **End session** generates a clarity report.
6. The report appears in the browser's History list.

The API endpoint can also be checked with:

```bash
curl -X POST https://YOUR-VERCEL-DOMAIN.vercel.app/api/teach \
  -H 'Content-Type: application/json' \
  -d '{"topic":"photosynthesis","level":"Age 10","message":"Plants use sunlight to turn water and carbon dioxide into food."}'
```

## If you do not have an API key yet

The app has a deterministic fallback response, so the UI can still be demonstrated without `LLM_API_KEY`. Add the key later in:

```text
Vercel Dashboard → Project → Settings → Environment Variables
```

After changing environment variables, redeploy the project.

## Troubleshooting

- **404 for `/api/teach`:** confirm the project root is the repository root and that `vercel.json` was pushed.
- **502 from `/api/teach`:** check the API key, model name, base URL, and Vercel function logs.
- **Changes are not visible:** confirm the latest GitHub commit is deployed or trigger a new deployment from the Vercel dashboard.
- **Provider compatibility issues:** `LLM_BASE_URL` must expose an OpenAI-compatible `/chat/completions` endpoint that supports JSON responses.

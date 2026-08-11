# Deployment settings

GitHub Pages embeds the public Firebase web configuration from `deploy-pages.yml`.

Before production deployment:

1. Add GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. Run the `Deploy Cloudflare Worker` workflow.
3. Confirm the deployed URL is `https://stock-polio-worker.moon-stock-polio.workers.dev`.
4. Re-run the `Deploy to GitHub Pages` workflow.
5. Deploy Firestore rules with `npm run firebase:rules -- --project planning-with-ai-a3485` from an authenticated Firebase CLI.

The production app reports `WORKER_NOT_CONFIGURED` instead of silently calling localhost when the Worker URL is absent.

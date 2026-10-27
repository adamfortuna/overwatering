import { defineEnvVars } from '@sveltejs/kit/env';

// Read from the process environment or app/.env in dev, Worker vars/secrets in production.
export const variables = defineEnvVars({
	// Optional: without it, bill upload is off and the UI shows the manual 12-month grid.
	EXTERNAL_ANTHROPIC_API_KEY: { schema: (v) => v || undefined }
});

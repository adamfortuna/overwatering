declare global {
	namespace App {
		interface Platform {
			env?: { DB?: D1Database; EXTERNAL_ANTHROPIC_API_KEY?: string };
		}
	}
}
export {};

declare global {
	namespace App {
		interface Platform {
			env?: { DB?: D1Database; ANTHROPIC_API_KEY?: string };
		}
	}
}
export {};

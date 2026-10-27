// Just the slice of the Workers runtime the server routes use. (`wrangler types` generates the
// full runtime, but its globals clash with the DOM types the Svelte components need.)
declare module 'cloudflare:workers' {
	interface D1Statement {
		bind(...values: unknown[]): D1Statement;
		run(): Promise<unknown>;
		all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
	}
	export interface D1Database {
		prepare(query: string): D1Statement;
	}
	export const env: { DB?: D1Database; EXTERNAL_ANTHROPIC_API_KEY?: string };
}

// Client-rendered: the maps only run in the browser, and on Cloudflare (adapter-cloudflare 8)
// server-side fetches of /data/* static assets fail, which shipped empty data to the client.
// With ssr off, every load runs in the browser and reads /data straight from static assets.
export const ssr = false;

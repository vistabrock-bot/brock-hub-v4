// pages/api/camps.js
//
// API route: GET /api/camps
//
// Fetches the latest camps data from an external source on every request and
// returns it as JSON.  A short Cache-Control header lets Netlify's CDN serve a
// cached copy for up to 60 seconds while transparently revalidating in the
// background, so clients always get fresh data without hammering the upstream.
//
// USAGE – calling from the frontend:
//   const res = await fetch('/api/camps');
//   const camps = await res.json();
//
// USAGE – with SWR (install swr first: npm install swr):
//   import useSWR from 'swr';
//   const fetcher = url => fetch(url).then(r => r.json());
//   function useCamps() {
//     return useSWR('/api/camps', fetcher, { refreshInterval: 120_000 });
//   }
//
// CONFIGURATION (required before going to production):
//   Set the CAMPS_API_URL environment variable in the Netlify dashboard
//   (Site settings → Environment variables) to your real camps data endpoint.
//   The placeholder below will fail at runtime until you replace it.

const CAMPS_API_URL = process.env.CAMPS_API_URL || 'https://external.api/camps'

export default async function handler(req, res) {
  try {
    const response = await fetch(CAMPS_API_URL)

    if (!response.ok) {
      return res.status(502).json({ error: 'Unable to load camps data from upstream.' })
    }

    const camps = await response.json()

    // Cache at the CDN/edge for 60 seconds; serve stale while revalidating so
    // users never wait on a cold cache miss.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    return res.status(200).json(camps)
  } catch (err) {
    console.error('[/api/camps] fetch error:', err)
    return res.status(500).json({ error: 'Unable to load camps data.' })
  }
}

// hooks/useCamps.js
//
// React hook that fetches camps data from /api/camps and keeps it up to date.
//
// The hook uses the browser's native fetch API with a polling interval so that
// the camps list is automatically refreshed in the background every 2 minutes.
//
// USAGE:
//   import { useCamps } from '../hooks/useCamps';
//
//   export default function CampsPage() {
//     const { camps, loading, error } = useCamps();
//     if (loading) return <p>Loading camps…</p>;
//     if (error)   return <p>Failed to load camps.</p>;
//     return <ul>{camps.map(c => <li key={c.id}>{c.name}</li>)}</ul>;
//   }
//
// SWR ALTERNATIVE (install swr: npm install swr):
//   import useSWR from 'swr';
//   const fetcher = url => fetch(url).then(r => r.json());
//   export function useCamps() {
//     const { data, error, isLoading } = useSWR('/api/camps', fetcher, {
//       refreshInterval: 120_000,
//     });
//     return { camps: data, loading: isLoading, error };
//   }

import { useState, useEffect, useCallback, useRef } from 'react'

const REFRESH_INTERVAL_MS = 120_000 // 2 minutes

export function useCamps() {
  const [camps, setCamps]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const timerRef              = useRef(null)

  const fetchCamps = useCallback(async () => {
    try {
      const res = await fetch('/api/camps')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCamps(data)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCamps()
    timerRef.current = setInterval(fetchCamps, REFRESH_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [fetchCamps])

  return { camps, loading, error }
}

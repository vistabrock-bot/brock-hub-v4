/**
 * useSyncStatus
 *
 * Lightweight hook that extracts a display-ready status object from the
 * values returned by useGoogleCalendar.  Import this separately if you only
 * need the status card without the full sync machinery.
 *
 * Usage:
 *   // Preferred: pass the gcal object from useGoogleCalendar directly
 *   const gcal = useGoogleCalendar(events, setEvents)
 *   const status = useSyncStatus(gcal)
 *
 *   status.dot          — 'green' | 'yellow' | 'red' | 'gray'
 *   status.label        — human-readable status string
 *   status.lastSyncedAgo — e.g. "2 min ago" | "just now" | null
 *   status.connected    — boolean
 *   status.email        — signed-in email string
 *   status.syncing      — boolean
 *   status.syncError    — string | null
 *   status.syncedCount  — number of synced events
 *   status.calendarCount — number of mapped calendars
 */

import { useMemo } from 'react'

function formatAgo(isoTimestamp) {
  if (!isoTimestamp) return null
  const diffMs = Date.now() - new Date(isoTimestamp).getTime()
  if (diffMs < 10_000) return 'just now'
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return `${Math.floor(diffMs / 86_400_000)}d ago`
}

export function useSyncStatus(gcal) {
  return useMemo(() => {
    const {
      connected = false,
      email = '',
      syncing = false,
      lastSynced = null,
      syncError = null,
      syncedCount = 0,
      calendarCount = 0,
      syncStatusDot = 'gray',
    } = gcal || {}

    let label
    if (!connected) {
      label = 'Not connected'
    } else if (syncing) {
      label = 'Syncing…'
    } else if (syncError) {
      label = 'Sync error'
    } else if (!lastSynced) {
      label = 'Connected — awaiting sync'
    } else {
      label = 'Connected'
    }

    return {
      dot: syncStatusDot,
      label,
      lastSyncedAgo: formatAgo(lastSynced),
      connected,
      email,
      syncing,
      syncError,
      syncedCount,
      calendarCount,
    }
  }, [gcal])
}

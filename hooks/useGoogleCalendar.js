/**
 * useGoogleCalendar
 *
 * Client hook that wraps all Google Calendar sync logic.
 *
 * Usage:
 *   const gcal = useGoogleCalendar(events, setEvents)
 *
 *   gcal.connected        — boolean, true if session cookie is valid
 *   gcal.email            — signed-in Google email
 *   gcal.syncing          — boolean, true while a sync is in progress
 *   gcal.lastSynced       — ISO timestamp of last successful sync
 *   gcal.syncError        — string | null, last error message
 *   gcal.syncedCount      — number of events that have a gcalEventId
 *   gcal.calendarCount    — number of calendars with a mapping
 *   gcal.toast            — { message, id } | null  — transient notification
 *   gcal.connect()        — navigate to /api/google/auth/start
 *   gcal.disconnect()     — call /api/google/auth/logout and clean up
 *   gcal.refresh()        — trigger a manual incremental sync
 *   gcal.upsertEvent(ev)  — push a local event to Google (create or update)
 *   gcal.deleteEvent(ev)  — delete a synced event from Google
 *
 * Data model extension on each event record:
 *   gcalEventId    — Google's event ID (string, set after first push)
 *   gcalCalendarId — Google Calendar ID the event lives in
 *   syncStatus     — 'synced' | 'pending' | 'error' | 'local-only'
 *   updatedAt      — ISO timestamp of last local modification
 *   gcalUpdatedAt  — ISO timestamp of last known Google update (conflict detection)
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const STALE_SYNC_MS = 10 * 60 * 1000   // 10 minutes

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsGet(key) {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(key) } catch { return null }
}

function lsSet(key, val) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, val) } catch {}
}

function lsDel(key) {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(key) } catch {}
}

function getMapping() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('bfh:gcalMapping') || '{}') } catch { return {} }
}

// ─── Google event ↔ local event mapping ──────────────────────────────────────

/**
 * Convert a Google Calendar event object to a local Hub event record.
 * Only fields relevant to the Hub are mapped; everything else is ignored.
 */
function mapGoogleToLocal(gEvent, calendarId) {
  const start = gEvent.start?.dateTime || gEvent.start?.date || ''
  const dateStr = start.includes('T') ? start.split('T')[0] : start
  const timeStr = start.includes('T') ? start.split('T')[1]?.slice(0, 5) : ''

  return {
    // keep existing local id if already present — caller merges with existing record
    title: gEvent.summary || '(No title)',
    date: dateStr,
    time: timeStr,
    location: gEvent.location || '',
    description: gEvent.description || '',
    color: '#7C9A82', // default sage; keep existing color if merging
    gcalEventId: gEvent.id,
    gcalCalendarId: calendarId,
    syncStatus: 'synced',
    updatedAt: gEvent.updated || new Date().toISOString(),
    gcalUpdatedAt: gEvent.updated || new Date().toISOString(),
  }
}

/**
 * Convert a local Hub event to a Google Calendar event object.
 */
function mapLocalToGoogle(ev) {
  const hasTime = Boolean(ev.time)
  let start, end

  if (hasTime && ev.date) {
    const startDt = `${ev.date}T${ev.time}:00`
    // Default 1-hour duration
    const [h, m] = ev.time.split(':').map(Number)
    const endH = (h + 1) % 24
    const endDt = `${ev.date}T${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    start = { dateTime: startDt, timeZone: 'America/Chicago' }
    end = { dateTime: endDt, timeZone: 'America/Chicago' }
  } else if (ev.date) {
    start = { date: ev.date }
    end = { date: ev.date }
  } else {
    const today = new Date().toISOString().split('T')[0]
    start = { date: today }
    end = { date: today }
  }

  const gEvent = {
    summary: ev.title || 'Untitled',
    start,
    end,
  }
  if (ev.location) gEvent.location = ev.location
  if (ev.description) gEvent.description = ev.description
  return gEvent
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGoogleCalendar(events, setEvents) {
  const [connected, setConnected] = useState(false)
  const [email, setEmail] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(() => lsGet('bfh:lastSync'))
  const [syncError, setSyncError] = useState(null)
  const [toast, setToast] = useState(null)

  const syncingRef = useRef(false)
  const eventsRef = useRef(events)
  eventsRef.current = events

  // ── Toast helper ──────────────────────────────────────────────────────────

  const showToast = useCallback((message) => {
    const id = Date.now()
    setToast({ message, id })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4000)
  }, [])

  // ── Connection check ─────────────────────────────────────────────────────

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/google/auth/status')
      if (res.ok) {
        const data = await res.json()
        setConnected(data.connected)
        if (data.email) setEmail(data.email)
        return data.connected
      }
    } catch {}
    setConnected(false)
    return false
  }, [])

  // ── Single-calendar sync ──────────────────────────────────────────────────

  const syncCalendar = useCallback(async (calendarId) => {
    const storedToken = lsGet(`bfh:syncToken:${calendarId}`)
    const now = new Date()
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString()

    const params = storedToken
      ? new URLSearchParams({ calendarId, syncToken: storedToken })
      : new URLSearchParams({ calendarId, timeMin, timeMax, singleEvents: 'true' })

    const res = await fetch(`/api/calendar/events?${params}`)

    // 410 Gone means the syncToken is expired — do a full re-sync
    if (res.status === 410) {
      lsDel(`bfh:syncToken:${calendarId}`)
      return syncCalendar(calendarId)
    }

    if (res.status === 401) {
      setConnected(false)
      setSyncError('Session expired. Please reconnect Google Calendar.')
      return
    }

    if (!res.ok) {
      const text = await res.text()
      setSyncError(`Sync error (${res.status}): ${text.slice(0, 120)}`)
      return
    }

    let payload
    try { payload = await res.json() } catch { return }

    const { items = [], nextSyncToken } = payload

    setEvents((prev) => {
      let updated = [...prev]

      for (const gEvent of items) {
        const localIdx = updated.findIndex((e) => e.gcalEventId === gEvent.id)

        if (gEvent.status === 'cancelled') {
          if (localIdx >= 0) {
            updated = updated.filter((_, i) => i !== localIdx)
          }
          continue
        }

        if (localIdx < 0) {
          // New event from Google — insert locally
          updated.push({
            id: `gcal_${gEvent.id}_${Date.now()}`,
            ...mapGoogleToLocal(gEvent, calendarId),
          })
        } else {
          const local = updated[localIdx]
          const gUpdated = new Date(gEvent.updated || 0)
          const lUpdated = new Date(local.gcalUpdatedAt || 0)
          if (gUpdated > lUpdated) {
            // Google is newer — Google wins
            updated[localIdx] = {
              ...local,
              ...mapGoogleToLocal(gEvent, calendarId),
              id: local.id, // keep local id
              color: local.color, // keep user's color choice
            }
            // Show toast outside of setEvents (after state is updated)
            setTimeout(() => showToast(`"${gEvent.summary || 'Event'}" was updated elsewhere`), 0)
          }
        }
      }

      return updated
    })

    if (nextSyncToken) {
      lsSet(`bfh:syncToken:${calendarId}`, nextSyncToken)
    }
  }, [setEvents, showToast])

  // ── Full sync (all mapped calendars) ─────────────────────────────────────

  const syncAll = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    setSyncError(null)

    try {
      const mapping = getMapping()
      const calendarIds = [...new Set(Object.values(mapping).filter(Boolean))]
      if (calendarIds.length === 0) return

      await Promise.all(calendarIds.map((calId) => syncCalendar(calId)))

      const ts = new Date().toISOString()
      lsSet('bfh:lastSync', ts)
      setLastSynced(ts)
    } catch (err) {
      setSyncError(err.message || 'Unknown sync error')
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [syncCalendar])

  // ── On mount: check status, then sync ────────────────────────────────────

  useEffect(() => {
    checkStatus().then((isConnected) => {
      if (isConnected) syncAll()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic sync (every 5 min while tab is visible) ─────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && connected) {
        syncAll()
      }
    }, SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [connected, syncAll])

  // ── Sync on tab focus (visibility change) ────────────────────────────────

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && connected) {
        syncAll()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [connected, syncAll])

  // ── Public methods ────────────────────────────────────────────────────────

  /** Navigate to Google consent screen */
  const connect = useCallback(() => {
    window.location.href = '/api/google/auth/start'
  }, [])

  /** Log out and clean up synced-event metadata */
  const disconnect = useCallback(async () => {
    try {
      await fetch('/api/google/auth/logout', { method: 'POST' })
    } catch {}
    setConnected(false)
    setEmail('')
    setSyncError(null)
    setLastSynced(null)
    lsDel('bfh:lastSync')

    // Clear all sync tokens
    const mapping = getMapping()
    Object.values(mapping).forEach((calId) => {
      if (calId) lsDel(`bfh:syncToken:${calId}`)
    })

    // Strip gcal metadata from local events (keep them as local-only)
    setEvents((prev) =>
      prev.map((ev) => ({
        ...ev,
        gcalEventId: undefined,
        gcalCalendarId: undefined,
        syncStatus: 'local-only',
        gcalUpdatedAt: undefined,
      }))
    )
  }, [setEvents])

  /** Manual sync trigger */
  const refresh = useCallback(() => {
    if (connected) syncAll()
  }, [connected, syncAll])

  /**
   * Push a local event to Google Calendar (create or update).
   * Updates the local record with the returned gcalEventId and syncStatus.
   */
  const upsertEvent = useCallback(async (ev) => {
    const mapping = getMapping()
    const calendarId = ev.gcalCalendarId || mapping[ev.color] || mapping.family || null
    if (!calendarId || !connected) {
      // Mark as local-only if no mapping
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, syncStatus: 'local-only' } : e))
      )
      return
    }

    // Optimistically mark as pending
    setEvents((prev) =>
      prev.map((e) => (e.id === ev.id ? { ...e, syncStatus: 'pending' } : e))
    )

    try {
      let res, data

      if (ev.gcalEventId) {
        // Update existing Google event
        res = await fetch(`/api/calendar/events/${encodeURIComponent(ev.gcalEventId)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ calendarId: ev.gcalCalendarId || calendarId, patch: mapLocalToGoogle(ev) }),
        })

        if (res.status === 404) {
          // Event was deleted on Google — re-create it
          res = await fetch('/api/calendar/events', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ calendarId, event: mapLocalToGoogle(ev) }),
          })
        }
      } else {
        // Create new Google event
        res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ calendarId, event: mapLocalToGoogle(ev) }),
        })
      }

      if (res.ok && res.status !== 204) {
        data = await res.json()
        const now = new Date().toISOString()
        setEvents((prev) =>
          prev.map((e) =>
            e.id === ev.id
              ? {
                  ...e,
                  gcalEventId: data.id,
                  gcalCalendarId: calendarId,
                  syncStatus: 'synced',
                  gcalUpdatedAt: data.updated || now,
                }
              : e
          )
        )
      } else if (!res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === ev.id ? { ...e, syncStatus: 'error' } : e))
        )
        setSyncError(`Failed to push event "${ev.title}" to Google (${res.status})`)
      }
    } catch (err) {
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, syncStatus: 'error' } : e))
      )
      setSyncError(`Network error syncing "${ev.title}": ${err.message}`)
    }
  }, [connected, setEvents])

  /**
   * Delete an event from Google Calendar.
   * The local deletion should be done by the caller before calling this.
   */
  const deleteEvent = useCallback(async (ev) => {
    if (!ev.gcalEventId || !ev.gcalCalendarId || !connected) return
    try {
      const res = await fetch(
        `/api/calendar/events/${encodeURIComponent(ev.gcalEventId)}?calendarId=${encodeURIComponent(ev.gcalCalendarId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        setSyncError(`Failed to delete "${ev.title}" from Google (${res.status})`)
      }
    } catch (err) {
      setSyncError(`Network error deleting "${ev.title}": ${err.message}`)
    }
  }, [connected])

  /**
   * Push all local-only events to Google Calendar (batch upload).
   */
  const pushUnsynced = useCallback(async () => {
    const unsynced = eventsRef.current.filter((e) => !e.gcalEventId && e.syncStatus !== 'synced')
    for (const ev of unsynced) {
      await upsertEvent(ev)
    }
  }, [upsertEvent])

  // ── Derived values ─────────────────────────────────────────────────────────

  const syncedCount = events.filter((e) => e.gcalEventId).length
  const calendarCount = new Set(
    Object.values(getMapping()).filter(Boolean)
  ).size

  const syncStatusDot = (() => {
    if (!connected) return 'gray'
    if (syncing) return 'yellow'
    if (syncError) return 'red'
    if (!lastSynced) return 'yellow'
    const age = Date.now() - new Date(lastSynced).getTime()
    return age < STALE_SYNC_MS ? 'green' : 'yellow'
  })()

  return {
    connected,
    email,
    syncing,
    lastSynced,
    syncError,
    syncedCount,
    calendarCount,
    syncStatusDot,
    toast,
    connect,
    disconnect,
    refresh,
    upsertEvent,
    deleteEvent,
    pushUnsynced,
  }
}

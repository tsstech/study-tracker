// All persistence + pure helpers live here so App.jsx only deals with UI.

export const STORAGE_KEY = 'study-timer-v1'

export const SUBJECT_COLORS = [
  '#2F6F5E', // pine
  '#7A4E9B', // plum
  '#B4532A', // rust
  '#2C5D8F', // slate blue
  '#8A6B1F', // ochre
  '#A03A55', // garnet
  '#3F7C4B', // moss
  '#4A4E69'  // graphite violet
]

const EMPTY = {
  subjects: [],
  sessions: [],
  running: null, // { subjectId, startedAt }
  settings: { dayStartHour: 4 }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw)
    return {
      ...structuredClone(EMPTY),
      ...parsed,
      settings: { ...EMPTY.settings, ...(parsed.settings || {}) }
    }
  } catch (err) {
    console.error('Could not read saved data:', err)
    return structuredClone(EMPTY)
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (err) {
    console.error('Could not save data:', err)
    return false
  }
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---------- time ----------

export function formatDuration(seconds, { showSeconds = true } = {}) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return showSeconds ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}`
}

export function formatClock(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// A "study day" can start at 4am so a session at 1am still counts
// towards the previous calendar day. Returns YYYY-MM-DD in local time.
export function dayKey(dateLike, dayStartHour = 4) {
  const d = new Date(dateLike)
  const shifted = new Date(d.getTime() - dayStartHour * 3600 * 1000)
  const y = shifted.getFullYear()
  const m = String(shifted.getMonth() + 1).padStart(2, '0')
  const day = String(shifted.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function prettyDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// ---------- derived data ----------

export function totalsByDay(sessions, dayStartHour) {
  const map = new Map()
  for (const s of sessions) {
    const key = dayKey(s.startedAt, dayStartHour)
    if (!map.has(key)) map.set(key, new Map())
    const bySubject = map.get(key)
    bySubject.set(s.subjectId, (bySubject.get(s.subjectId) || 0) + s.seconds)
  }
  return map
}

// ---------- export ----------

function csvCell(value) {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function sessionsToCsv(sessions, subjects, dayStartHour) {
  const nameOf = (id) => subjects.find((s) => s.id === id)?.name ?? 'Deleted subject'
  const header = [
    'study_day',
    'subject',
    'start',
    'end',
    'duration_seconds',
    'duration_hhmmss',
    'note'
  ]
  const rows = [...sessions]
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
    .map((s) => [
      dayKey(s.startedAt, dayStartHour),
      nameOf(s.subjectId),
      new Date(s.startedAt).toISOString(),
      new Date(s.endedAt).toISOString(),
      s.seconds,
      formatDuration(s.seconds),
      s.note || ''
    ])
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

export function downloadFile(filename, contents, mime = 'text/plain') {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

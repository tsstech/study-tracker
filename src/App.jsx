import { useEffect, useMemo, useRef, useState } from 'react'
import TodayView from './components/TodayView.jsx'
import HistoryView from './components/HistoryView.jsx'
import {
  SUBJECT_COLORS,
  dayKey,
  downloadFile,
  formatDuration,
  loadState,
  newId,
  saveState,
  sessionsToCsv
} from './storage.js'

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('today')
  const [now, setNow] = useState(() => Date.now())
  const [message, setMessage] = useState('')
  const messageTimer = useRef(null)

  const { subjects, sessions, running, settings } = state

  // Persist on every change.
  useEffect(() => {
    saveState(state)
  }, [state])

  // Tick only while a timer is running. Elapsed is always recomputed from the
  // stored start time, so a throttled or reopened tab still shows the truth.
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  const runningSeconds = running
    ? Math.max(0, Math.floor((now - new Date(running.startedAt).getTime()) / 1000))
    : 0

  const activeSubjects = subjects.filter((s) => !s.archived)
  const hiddenSubjects = subjects.filter((s) => s.archived)

  const todayKey = dayKey(new Date(), settings.dayStartHour)
  const todayTotals = useMemo(() => {
    const map = new Map()
    for (const s of sessions) {
      if (dayKey(s.startedAt, settings.dayStartHour) !== todayKey) continue
      map.set(s.subjectId, (map.get(s.subjectId) || 0) + s.seconds)
    }
    return map
  }, [sessions, todayKey, settings.dayStartHour])

  // Show the live timer in the tab title, the way a phone shows it on the lock screen.
  useEffect(() => {
    const name = subjects.find((s) => s.id === running?.subjectId)?.name
    document.title = running
      ? `${formatDuration(runningSeconds)} · ${name ?? 'Studying'}`
      : 'Study Timer'
  }, [running, runningSeconds, subjects])

  function notify(text) {
    setMessage(text)
    clearTimeout(messageTimer.current)
    messageTimer.current = setTimeout(() => setMessage(''), 4000)
  }

  function closeRunning(current, endedAt = new Date()) {
    if (!current) return null
    const startedAt = new Date(current.startedAt)
    const seconds = Math.floor((endedAt - startedAt) / 1000)
    if (seconds < 1) return null
    return {
      id: newId(),
      subjectId: current.subjectId,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      seconds,
      note: ''
    }
  }

  function start(subjectId) {
    setState((prev) => {
      const finished = closeRunning(prev.running)
      return {
        ...prev,
        sessions: finished ? [...prev.sessions, finished] : prev.sessions,
        running: { subjectId, startedAt: new Date().toISOString() }
      }
    })
    setNow(Date.now())
  }

  function stop() {
    setState((prev) => {
      const finished = closeRunning(prev.running)
      if (!finished) return { ...prev, running: null }
      return { ...prev, sessions: [...prev.sessions, finished], running: null }
    })
  }

  function addSubject(name) {
    setState((prev) => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        {
          id: newId(),
          name,
          color: SUBJECT_COLORS[prev.subjects.length % SUBJECT_COLORS.length],
          archived: false
        }
      ]
    }))
  }

  function updateSubject(id, patch) {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s))
    }))
  }

  function archiveSubject(id) {
    if (running?.subjectId === id) stop()
    updateSubject(id, { archived: true })
    notify('Subject hidden. Its logged time is still in your history.')
  }

  function addManualSession({ subjectId, startedAt, endedAt, note }) {
    const seconds = Math.floor((endedAt - startedAt) / 1000)
    setState((prev) => ({
      ...prev,
      sessions: [
        ...prev.sessions,
        {
          id: newId(),
          subjectId,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          seconds,
          note
        }
      ]
    }))
    notify(`Added ${formatDuration(seconds)}.`)
  }

  function deleteSession(id) {
    setState((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== id) }))
  }

  function exportCsv() {
    const stamp = dayKey(new Date(), settings.dayStartHour)
    downloadFile(
      `study-log-${stamp}.csv`,
      sessionsToCsv(sessions, subjects, settings.dayStartHour),
      'text/csv'
    )
  }

  function exportJson() {
    const stamp = dayKey(new Date(), settings.dayStartHour)
    downloadFile(`study-timer-backup-${stamp}.json`, JSON.stringify(state, null, 2), 'application/json')
  }

  async function importJson(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data.subjects) || !Array.isArray(data.sessions)) {
        return notify('That file is not a Study Timer backup.')
      }
      setState({
        subjects: data.subjects,
        sessions: data.sessions,
        running: data.running ?? null,
        settings: { dayStartHour: 4, ...(data.settings || {}) }
      })
      notify(`Restored ${data.sessions.length} sessions.`)
    } catch (err) {
      console.error(err)
      notify('That file could not be read.')
    }
  }

  const stale = running && runningSeconds > 6 * 3600

  return (
    <div className="app">
      <header className="masthead">
        <h1 className="wordmark">Study Timer</h1>
        <nav className="tabs">
          <button
            className={`tab ${tab === 'today' ? 'tab--on' : ''}`}
            onClick={() => setTab('today')}
          >
            Today
          </button>
          <button
            className={`tab ${tab === 'history' ? 'tab--on' : ''}`}
            onClick={() => setTab('history')}
          >
            History
          </button>
        </nav>
      </header>

      {stale && (
        <p className="banner">
          This timer has been running for {formatDuration(runningSeconds, { showSeconds: false })}.
          Stop it, delete the session in History, and log the real time by hand.
        </p>
      )}
      {message && <p className="banner banner--quiet">{message}</p>}

      <main>
        {tab === 'today' ? (
          <>
            <TodayView
              subjects={activeSubjects}
              todayTotals={todayTotals}
              running={running}
              runningSeconds={runningSeconds}
              onStart={start}
              onStop={stop}
              onAddSubject={addSubject}
              onRenameSubject={(id, name) =>
                name.trim() && updateSubject(id, { name: name.trim() })
              }
              onRecolorSubject={(id, color) => updateSubject(id, { color })}
              onArchiveSubject={archiveSubject}
            />
            {hiddenSubjects.length > 0 && (
              <section className="hidden-subjects">
                <h2 className="section-title">Hidden subjects</h2>
                <ul className="chip-row">
                  {hiddenSubjects.map((s) => (
                    <li key={s.id}>
                      <button
                        className="chip"
                        onClick={() => updateSubject(s.id, { archived: false })}
                      >
                        {s.name} — bring back
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <HistoryView
            subjects={subjects}
            sessions={sessions}
            settings={settings}
            onDeleteSession={deleteSession}
            onAddManualSession={addManualSession}
            onExportCsv={exportCsv}
            onExportJson={exportJson}
            onImportJson={importJson}
            onChangeDayStart={(hour) =>
              setState((prev) => ({ ...prev, settings: { ...prev.settings, dayStartHour: hour } }))
            }
          />
        )}
      </main>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { dayKey, formatClock, formatDuration, prettyDay } from '../storage.js'

const RANGES = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: 'all', label: 'Everything', days: null }
]

export default function HistoryView({
  subjects,
  sessions,
  settings,
  onDeleteSession,
  onAddManualSession,
  onExportCsv,
  onExportJson,
  onImportJson,
  onChangeDayStart
}) {
  const [rangeId, setRangeId] = useState('7')
  const range = RANGES.find((r) => r.id === rangeId)

  const nameOf = (id) => subjects.find((s) => s.id === id)?.name ?? 'Deleted subject'
  const colorOf = (id) => subjects.find((s) => s.id === id)?.color ?? 'var(--rule)'

  const cutoff = useMemo(() => {
    if (!range.days) return null
    const d = new Date()
    d.setDate(d.getDate() - (range.days - 1))
    return dayKey(d, settings.dayStartHour)
  }, [range, settings.dayStartHour])

  const visible = useMemo(() => {
    const list = sessions.filter(
      (s) => !cutoff || dayKey(s.startedAt, settings.dayStartHour) >= cutoff
    )
    return list.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  }, [sessions, cutoff, settings.dayStartHour])

  const perSubject = useMemo(() => {
    const map = new Map()
    for (const s of visible) map.set(s.subjectId, (map.get(s.subjectId) || 0) + s.seconds)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [visible])

  const grandTotal = perSubject.reduce((a, [, secs]) => a + secs, 0)
  const peak = Math.max(1, ...perSubject.map(([, secs]) => secs))

  const byDay = useMemo(() => {
    const map = new Map()
    for (const s of visible) {
      const key = dayKey(s.startedAt, settings.dayStartHour)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [visible, settings.dayStartHour])

  return (
    <div className="stack">
      <section>
        <div className="row-between">
          <h2 className="section-title">History</h2>
          <div className="segmented">
            {RANGES.map((r) => (
              <button
                key={r.id}
                className={`segmented__btn ${rangeId === r.id ? 'segmented__btn--on' : ''}`}
                onClick={() => setRangeId(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <p className="total-line">
          {formatDuration(grandTotal)} across {visible.length} session
          {visible.length === 1 ? '' : 's'}
        </p>

        {perSubject.length === 0 ? (
          <p className="empty">No sessions in this range yet.</p>
        ) : (
          <ul className="totals">
            {perSubject.map(([id, secs]) => (
              <li key={id} className="totals__row">
                <span className="totals__name">{nameOf(id)}</span>
                <div className="bar">
                  <div
                    className="bar__fill"
                    style={{ width: `${(secs / peak) * 100}%`, background: colorOf(id) }}
                  />
                </div>
                <span className="totals__time">{formatDuration(secs)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {byDay.map(([key, daySessions]) => {
        const dayTotal = daySessions.reduce((a, s) => a + s.seconds, 0)
        return (
          <section key={key} className="day-block">
            <div className="row-between day-block__head">
              <h3 className="day-title">{prettyDay(key)}</h3>
              <span className="day-total">{formatDuration(dayTotal)}</span>
            </div>
            <table className="table">
              <tbody>
                {daySessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="dot" style={{ background: colorOf(s.subjectId) }} />
                      {nameOf(s.subjectId)}
                    </td>
                    <td className="num">
                      {formatClock(s.startedAt)}–{formatClock(s.endedAt)}
                    </td>
                    <td className="num">{formatDuration(s.seconds)}</td>
                    <td className="note">{s.note}</td>
                    <td>
                      <button
                        className="link link--danger"
                        onClick={() => onDeleteSession(s.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}

      <ManualEntry subjects={subjects} onAdd={onAddManualSession} />

      <section>
        <h2 className="section-title">Your data</h2>
        <p className="muted">
          Everything is stored in this browser only. Clearing site data wipes it, so keep a
          backup somewhere you trust.
        </p>
        <div className="button-row">
          <button className="btn" onClick={onExportCsv}>
            Export CSV
          </button>
          <button className="btn" onClick={onExportJson}>
            Download backup
          </button>
          <label className="btn btn--file">
            Restore backup
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportJson(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        <label className="field field--inline">
          <span>A study day starts at</span>
          <select
            className="input input--small"
            value={settings.dayStartHour}
            onChange={(e) => onChangeDayStart(Number(e.target.value))}
          >
            {Array.from({ length: 13 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          Set this to 04:00 and a session started at 01:30 still counts towards the night
          before.
        </p>
      </section>
    </div>
  )
}

function ManualEntry({ subjects, onAdd }) {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [date, setDate] = useState(iso)
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('19:00')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    const id = subjectId || subjects[0]?.id
    if (!id) return setError('Add a subject first.')
    const startedAt = new Date(`${date}T${start}`)
    let endedAt = new Date(`${date}T${end}`)
    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      return setError('That date or time is not valid.')
    }
    // An end time earlier than the start means the session ran past midnight.
    if (endedAt <= startedAt) endedAt = new Date(endedAt.getTime() + 24 * 3600 * 1000)
    setError('')
    onAdd({ subjectId: id, startedAt, endedAt, note: note.trim() })
    setNote('')
  }

  return (
    <section>
      <h2 className="section-title">Log a session you forgot to time</h2>
      <form className="manual" onSubmit={submit}>
        <select
          className="input"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="input"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          className="input"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <input
          className="input"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn" type="submit">
          Add session
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  )
}

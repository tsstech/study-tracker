import { useState } from 'react'
import { formatDuration, SUBJECT_COLORS } from '../storage.js'

export default function TodayView({
  subjects,
  todayTotals,
  running,
  runningSeconds,
  onStart,
  onStop,
  onAddSubject,
  onRenameSubject,
  onRecolorSubject,
  onArchiveSubject
}) {
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null)

  const active = subjects.find((s) => s.id === running?.subjectId) || null
  const dayTotal =
    [...todayTotals.values()].reduce((a, b) => a + b, 0) + (running ? runningSeconds : 0)
  const longest = Math.max(1, ...subjects.map((s) => secondsFor(s.id)))

  function secondsFor(id) {
    const logged = todayTotals.get(id) || 0
    return running?.subjectId === id ? logged + runningSeconds : logged
  }

  function submitSubject(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    onAddSubject(name)
    setNewName('')
  }

  return (
    <div className="stack">
      <section className={`hero ${running ? 'hero--running' : ''}`}>
        <div
          className="hero__stripe"
          style={{ background: active ? active.color : 'var(--rule)' }}
        />
        <p className="hero__label">
          {running ? active?.name ?? 'Unknown subject' : 'Total studied today'}
        </p>
        <p className="hero__clock">
          {formatDuration(running ? runningSeconds : dayTotal)}
        </p>
        {running ? (
          <>
            <p className="hero__sub">Today so far: {formatDuration(dayTotal)}</p>
            <button className="btn btn--stop" onClick={onStop}>
              Stop timer
            </button>
          </>
        ) : (
          <p className="hero__sub">
            {subjects.length
              ? 'Pick a subject below to start the clock.'
              : 'Add your first subject to start the clock.'}
          </p>
        )}
      </section>

      <section>
        <h2 className="section-title">Subjects</h2>
        {subjects.length === 0 && (
          <p className="empty">
            Nothing here yet. Add a subject — Maths, Physics, Economics, whatever you
            actually sit down with.
          </p>
        )}

        <ul className="subject-list">
          {subjects.map((subject) => {
            const seconds = secondsFor(subject.id)
            const isRunning = running?.subjectId === subject.id
            return (
              <li key={subject.id} className={`subject ${isRunning ? 'subject--on' : ''}`}>
                <div className="subject__main">
                  <span className="dot" style={{ background: subject.color }} />
                  {editing === subject.id ? (
                    <input
                      className="input input--inline"
                      defaultValue={subject.name}
                      autoFocus
                      onBlur={(e) => {
                        onRenameSubject(subject.id, e.target.value)
                        setEditing(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur()
                        if (e.key === 'Escape') setEditing(null)
                      }}
                    />
                  ) : (
                    <button
                      className="subject__name"
                      onClick={() => setEditing(subject.id)}
                      title="Rename"
                    >
                      {subject.name}
                    </button>
                  )}
                  <span className="subject__time">{formatDuration(seconds)}</span>
                  <button
                    className={`btn ${isRunning ? 'btn--stop' : 'btn--start'}`}
                    onClick={() => (isRunning ? onStop() : onStart(subject.id))}
                  >
                    {isRunning ? 'Stop' : 'Start'}
                  </button>
                </div>

                <div className="bar">
                  <div
                    className="bar__fill"
                    style={{
                      width: `${(seconds / longest) * 100}%`,
                      background: subject.color
                    }}
                  />
                </div>

                <div className="subject__tools">
                  <div className="swatches">
                    {SUBJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`swatch ${subject.color === c ? 'swatch--on' : ''}`}
                        style={{ background: c }}
                        aria-label={`Use colour ${c}`}
                        onClick={() => onRecolorSubject(subject.id, c)}
                      />
                    ))}
                  </div>
                  <button className="link" onClick={() => onArchiveSubject(subject.id)}>
                    Hide subject
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <form className="add-row" onSubmit={submitSubject}>
          <input
            className="input"
            placeholder="New subject"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn" type="submit">
            Add subject
          </button>
        </form>
      </section>
    </div>
  )
}

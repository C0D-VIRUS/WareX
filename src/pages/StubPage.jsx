export default function StubPage({ title }) {
  return (
    <div>
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{title}</h1>
      <div
        className="mt-4 rounded-lg p-10 text-center"
        style={{ background: 'var(--paper-panel)', border: '1px dashed var(--paper-line)' }}
      >
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          The {title.toLowerCase()} screen is built in a later stage.
        </p>
      </div>
    </div>
  )
}

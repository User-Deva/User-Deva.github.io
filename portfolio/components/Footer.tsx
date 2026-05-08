export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        padding: '2.5rem 2rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      <p
        style={{
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-display)',
        }}
      >
        © {year} Devang Patidar. Built with Next.js.
      </p>
      <p
        style={{
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Designed & developed by{' '}
        <span style={{ color: 'var(--accent)' }}>Devang</span>.
      </p>
    </footer>
  )
}

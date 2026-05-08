'use client'

import { useState } from 'react'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      // Replace YOUR_FORM_ID with your Formspree form ID from formspree.io
      const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('sent')
        setForm({ name: '', email: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.85rem 1rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
  }

  return (
    <section
      id="contact"
      style={{ padding: '8rem 2rem', maxWidth: '700px', margin: '0 auto' }}
    >
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--accent)',
          letterSpacing: '0.15em',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          marginBottom: '1rem',
        }}
      >
        GET IN TOUCH
      </p>
      <h2
        style={{
          fontSize: 'clamp(2rem, 4vw, 3.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          marginBottom: '1rem',
        }}
      >
        Let's work together
      </h2>
      <p
        style={{
          color: 'var(--text-secondary)',
          marginBottom: '3rem',
          fontSize: '1rem',
          lineHeight: 1.7,
        }}
      >
        I'm open to Supply Chain Analyst, Demand Planning, and Operations roles —
        full-time or contract. Reach out about a role, a forecasting/inventory
        problem, or just to talk shop. I reply within 24 hours.
      </p>

      {status === 'sent' ? (
        <div
          style={{
            padding: '2rem',
            border: '1px solid rgba(110,231,183,0.3)',
            borderRadius: '12px',
            background: 'rgba(110,231,183,0.05)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '1.5rem',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
            }}
          >
            Message sent!
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Thanks for reaching out. I'll get back to you shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Devang Patidar"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="york.devang@email.com"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Message</label>
            <textarea
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              rows={6}
              placeholder="Tell me about your project..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: '140px' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {status === 'error' && (
            <p style={{ color: '#f87171', fontSize: '0.85rem' }}>
              Something went wrong. Please email me directly at devangpatidar40@gmail.com
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              padding: '0.85rem 2rem',
              background: status === 'sending' ? 'rgba(110,231,183,0.5)' : 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.02em',
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={e => {
              if (status !== 'sending') e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {status === 'sending' ? 'Sending...' : 'Send message'}
          </button>
        </form>
      )}

      {/* Social links */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        {[
          { label: 'LinkedIn', href: 'https://linkedin.com/in/devangpatidar' },
          { label: 'Email',    href: 'mailto:york.devang@gmail.com' },
          { label: 'Phone',    href: 'tel:+17326643401' },
          { label: 'Resume',   href: '/DPRSC.pdf' },
        ].map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            {link.label} ↗
          </a>
        ))}
      </div>
    </section>
  )
}

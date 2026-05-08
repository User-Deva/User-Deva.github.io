'use client'

import { useState } from 'react'
import { projects, allTags } from '@/data/projects'

export default function Projects() {
  const [activeTag, setActiveTag] = useState('All')

  const filtered = activeTag === 'All'
    ? projects
    : projects.filter(p => p.tags.includes(activeTag))

  return (
    <section
      id="projects"
      style={{
        padding: '8rem 2rem',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {/* Section header */}
      <div style={{ marginBottom: '4rem' }}>
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
          SELECTED WORK
        </p>
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: '2rem',
          }}
        >
          Case studies
        </h2>

        {/* Filter tags */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['All', ...allTags].map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                padding: '0.3rem 0.85rem',
                borderRadius: '100px',
                border: '1px solid',
                borderColor: activeTag === tag ? 'var(--accent)' : 'var(--border)',
                background: activeTag === tag ? 'rgba(110,231,183,0.1)' : 'transparent',
                color: activeTag === tag ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {filtered.map((project, i) => (
          <ProjectCard key={project.title} project={project} index={i} />
        ))}
      </div>
    </section>
  )
}

function ProjectCard({ project, index }: { project: any; index: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: '1px solid',
        borderColor: hovered ? 'var(--border-hover)' : 'var(--border)',
        borderRadius: '12px',
        padding: '1.75rem',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {project.featured && (
        <span
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            fontSize: '0.65rem',
            padding: '0.2rem 0.6rem',
            background: 'rgba(110,231,183,0.1)',
            color: 'var(--accent)',
            borderRadius: '100px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            border: '1px solid rgba(110,231,183,0.2)',
          }}
        >
          FEATURED
        </span>
      )}

      {/* Subtle glow on hover */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 0%, rgba(110,231,183,0.04), transparent 60%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }}
      />

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.15rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          paddingRight: project.featured ? '4rem' : 0,
        }}
      >
        {project.title}
      </h3>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          flex: 1,
        }}
      >
        {project.description}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {project.tags.map((tag: string) => (
          <span
            key={tag}
            style={{
              fontSize: '0.72rem',
              padding: '0.2rem 0.6rem',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-muted)',
              borderRadius: '4px',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              letterSpacing: '0.02em',
              border: '1px solid var(--border)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Links */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <a
          href={project.url}
          rel="noopener noreferrer"
          style={{
            fontSize: '0.82rem',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Discuss this work →
        </a>
        {project.repo && (
          <a
            href={project.repo}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            GitHub →
          </a>
        )}
      </div>
    </div>
  )
}

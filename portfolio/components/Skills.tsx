'use client'

import { useEffect, useRef, useState } from 'react'
const skillGroups = [
  {
    category: 'Supply Chain & Logistics',
    skills: [
      { name: 'Supply Chain Management', level: 90 },
      { name: 'Demand Forecasting', level: 88 },
      { name: 'Inventory Optimization', level: 92 },
      { name: 'Warehouse Operations', level: 85 },
      { name: 'Order Fulfillment', level: 87 },
      { name: 'Distribution Planning', level: 85 },
      { name: 'Transportation Management', level: 83 },
      { name: 'S&OP Planning', level: 88 },
    ],
  },
  {
    category: 'Procurement & Vendor Management',
    skills: [
      { name: 'Procurement Strategy', level: 85 },
      { name: 'Strategic Sourcing', level: 87 },
      { name: 'Vendor Management', level: 90 },
      { name: 'Contract Negotiation', level: 82 },
      { name: 'Risk & Compliance Management', level: 80 },
    ],
  },
  {
    category: 'Data & Analytics',
    skills: [
      { name: 'SQL', level: 88 },
      { name: 'Advanced Excel', level: 95 },
      { name: 'Tableau', level: 85 },
      { name: 'Power BI', level: 87 },
      { name: 'Python (Pandas, NumPy)', level: 82 },
      { name: 'Data Visualization', level: 90 },
      { name: 'KPI Dashboards', level: 88 },
      { name: 'Forecasting & Planning', level: 89 },
      { name: 'Root Cause Analysis', level: 90 },
      { name: 'Reporting Automation', level: 85 },
    ],
  },
  {
    category: 'Systems & Process Improvement',
    skills: [
      { name: 'SAP S/4HANA', level: 85 },
      { name: 'Oracle Cloud ERP', level: 80 },
      { name: 'WMS', level: 87 },
      { name: 'Flipkart Commerce Cloud', level: 78 },
      { name: 'Smartsheet / MS Project', level: 82 },
      { name: 'Lean Six Sigma (Green Belt)', level: 88 },
      { name: 'Business Process Optimization', level: 90 },
      { name: 'Kaizen', level: 85 },
      { name: 'Reverse Logistics', level: 83 },
      { name: 'Cost Reduction', level: 88 },
    ],
  },
  {
    category: 'Soft Skills',
    skills: [
      { name: 'Cross-Functional Collaboration', level: 92 },
      { name: 'Stakeholder Management', level: 90 },
      { name: 'Negotiation', level: 85 },
      { name: 'Communication', level: 92 },
      { name: 'Presentation', level: 88 },
      { name: 'Problem-Solving', level: 93 },
      { name: 'Critical Thinking', level: 91 },
    ],
  },
]

function SkillBar({ name, level }: { name: string; level: number }) {
  const [animated, setAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ marginBottom: '1.1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            fontWeight: 400,
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
          }}
        >
          {level}%
        </span>
      </div>
      <div
        style={{
          height: '2px',
          background: 'var(--border)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: animated ? `${level}%` : '0%',
            background: `linear-gradient(90deg, var(--accent-dim), var(--accent))`,
            borderRadius: '2px',
            transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: '0.1s',
          }}
        />
      </div>
    </div>
  )
}

export default function Skills() {
  return (
    <section
      id="skills"
      style={{
        padding: '8rem 2rem',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
          CAPABILITIES
        </p>
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: '4rem',
          }}
        >
          My toolkit
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
          }}
        >
          {skillGroups.map(group => (
            <div key={group.category}>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                  marginBottom: '1.5rem',
                  textTransform: 'uppercase',
                }}
              >
                {group.category}
              </h3>
              {group.skills.map(skill => (
                <SkillBar key={skill.name} {...skill} />
              ))}
            </div>
          ))}
        </div>

        {/* Tech pills */}
        <div
          style={{
            marginTop: '4rem',
            paddingTop: '3rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '1.25rem',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.06em',
            }}
          >
            CERTIFICATIONS & TOOLS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              'Lean Six Sigma Green Belt', 'Power BI for BI', 'Advanced Excel & VBA',
              'SAP S/4HANA', 'Oracle Cloud ERP', 'WMS', 'Smartsheet', 'MS Project',
              'Tableau', 'SQL', 'Pandas', 'NumPy', 'Matplotlib', 'Power Query',
            ].map(tech => (
              <span
                key={tech}
                style={{
                  padding: '0.35rem 0.85rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

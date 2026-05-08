import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Devang Patidar — Supply Chain Analyst',
  description: 'Drive around a 3D world to explore my supply chain work — demand forecasting, inventory optimization, and Lean Six Sigma.',
  openGraph: {
    title: 'Devang Patidar — Supply Chain Analyst',
    description: 'An interactive portfolio: drive a car through a 3D world to discover demand forecasting, S&OP, and process-improvement case studies.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#0a0a14' }}>
        {children}
      </body>
    </html>
  )
}

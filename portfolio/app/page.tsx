import dynamic from 'next/dynamic'

// Lazy-load the 3D world — avoids SSR issues with Three.js
const World = dynamic(() => import('@/components/World'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#0a0a14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      color: 'rgba(255,255,255,0.3)',
      fontSize: '0.85rem',
      letterSpacing: '0.1em',
    }}>
      LOADING...
    </div>
  ),
})

export default function Home() {
  return <World />
}

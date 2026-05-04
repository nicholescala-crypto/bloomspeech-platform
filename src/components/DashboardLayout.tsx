import { Link } from 'react-router-dom'

export default function DashboardLayout({ role, title, subtitle, children }: any) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        color: '#111827',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          minHeight: '100vh',
        }}
      >
        <aside
          style={{
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            padding: '28px 20px',
          }}
        >
          <h2 style={{ margin: 0 }}>Bloom</h2>
          <p style={{ margin: '6px 0 32px', color: '#6b7280' }}>Speech Platform</p>

          <nav style={{ display: 'grid', gap: '10px', marginBottom: '28px' }}>
            <Link to="/login">Login</Link>
            <Link to="/parent">Parent</Link>
            <Link to="/clinician">Clinician</Link>
          </nav>

          <div
            style={{
              marginTop: '20px',
              background: '#111827',
              color: '#ffffff',
              borderRadius: '18px',
              padding: '16px',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px' }}>Active View</p>
            <p style={{ margin: '6px 0 0', fontSize: '18px', fontWeight: 700 }}>{role}</p>
          </div>
        </aside>

        <main style={{ padding: '32px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '24px',
              padding: '28px',
              marginBottom: '24px',
            }}
          >
            <h1 style={{ margin: 0 }}>{title}</h1>
            <p style={{ margin: '10px 0 0', color: '#6b7280' }}>{subtitle}</p>
          </div>

          {children}
        </main>
      </div>
    </div>
  )
}
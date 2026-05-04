export default function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <p style={{ margin: 0, color: '#6b7280' }}>{label}</p>
      <h2 style={{ margin: '8px 0' }}>{value}</h2>
      {helper ? <p style={{ margin: 0 }}>{helper}</p> : null}
    </div>
  )
}
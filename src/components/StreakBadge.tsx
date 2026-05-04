import type { CSSProperties } from 'react'

type StreakBadgeProps = {
  streak: number
}

function getBadgeStyle(streak: number): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    borderRadius: '18px',
    background:
      streak >= 7
        ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
        : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: streak >= 7 ? '1px solid #f59e0b' : '1px solid #93c5fd',
    boxShadow:
      streak >= 7
        ? '0 0 0 1px rgba(245, 158, 11, 0.15), 0 0 22px rgba(245, 158, 11, 0.35), 0 10px 24px rgba(245, 158, 11, 0.22)'
        : '0 0 0 1px rgba(59, 130, 246, 0.10), 0 0 18px rgba(59, 130, 246, 0.18), 0 10px 22px rgba(59, 130, 246, 0.12)',
    marginTop: '18px',
    marginBottom: '18px',
    animation: streak >= 7 ? 'pulseGlow 1.8s ease-in-out infinite' : 'none',
  }
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const badgeLabel =
    streak >= 14 ? 'Super Streak' : streak >= 7 ? 'Hot Streak' : 'Building Streak'

  const badgeEmoji =
    streak >= 14 ? '🏆' : streak >= 7 ? '🔥' : '✨'

  return (
    <>
      <style>
        {`
          @keyframes pulseGlow {
            0% {
              transform: scale(1);
              box-shadow:
                0 0 0 1px rgba(245, 158, 11, 0.15),
                0 0 18px rgba(245, 158, 11, 0.28),
                0 10px 22px rgba(245, 158, 11, 0.16);
            }
            50% {
              transform: scale(1.02);
              box-shadow:
                0 0 0 1px rgba(245, 158, 11, 0.18),
                0 0 28px rgba(245, 158, 11, 0.42),
                0 14px 28px rgba(245, 158, 11, 0.22);
            }
            100% {
              transform: scale(1);
              box-shadow:
                0 0 0 1px rgba(245, 158, 11, 0.15),
                0 0 18px rgba(245, 158, 11, 0.28),
                0 10px 22px rgba(245, 158, 11, 0.16);
            }
          }
        `}
      </style>

      <div style={getBadgeStyle(streak)}>
        <div style={{ fontSize: '28px' }}>{badgeEmoji}</div>
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#92400e',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {badgeLabel}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827' }}>
            {streak} day streak
          </div>
        </div>
      </div>
    </>
  )
}
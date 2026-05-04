import { useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'

type RewardUnlockModalProps = {
  open: boolean
  coinsEarned: number
  reward?: string
  onClose: () => void
}

type ConfettiPiece = {
  left: string
  delay: string
  duration: string
  rotate: string
}

export default function RewardUnlockModal({
  open,
  coinsEarned,
  reward,
  onClose,
}: RewardUnlockModalProps) {
  const confetti = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: `${4 + i * 4}%`,
        delay: `${(i % 6) * 0.08}s`,
        duration: `${1.8 + (i % 5) * 0.18}s`,
        rotate: `${-30 + (i % 7) * 12}deg`,
      })),
    []
  )

  useEffect(() => {
    if (!open) return

    const audio = new Audio('/audio/reward-win.mp3')
    audio.volume = 0.55
    void audio.play().catch(() => {
      // ignore autoplay or missing-file issues
    })

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [open])

  if (!open) return null

  return (
    <div style={overlay}>
      <style>
        {`
        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0 }
          100% { transform: scale(1); opacity: 1 }
        }

        @keyframes glowPulse {
          0% { box-shadow: 0 0 18px rgba(245,158,11,0.25) }
          50% { box-shadow: 0 0 38px rgba(245,158,11,0.6) }
          100% { box-shadow: 0 0 18px rgba(245,158,11,0.25) }
        }

        @keyframes floatUp {
          0% { transform: translateY(10px); opacity: 0 }
          100% { transform: translateY(0); opacity: 1 }
        }

        @keyframes confettiDrop {
          0% { transform: translateY(-30px) rotate(0deg); opacity: 0 }
          10% { opacity: 1 }
          100% { transform: translateY(340px) rotate(360deg); opacity: 0 }
        }
        `}
      </style>

      <div style={modal}>
        <div style={confettiLayer}>
          {confetti.map((piece, index) => (
            <span
              key={index}
              style={{
                ...confettiPiece,
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                transform: `rotate(${piece.rotate})`,
                background:
                  index % 4 === 0
                    ? '#f59e0b'
                    : index % 4 === 1
                    ? '#60a5fa'
                    : index % 4 === 2
                    ? '#f472b6'
                    : '#34d399',
              }}
            />
          ))}
        </div>

        <div style={emoji}>🎉</div>

        <h2 style={title}>Session Complete</h2>

        <div style={coinsBox}>
          <div style={coinsLabel}>Coins Earned</div>
          <div style={coinsValue}>+{coinsEarned}</div>
        </div>

        {reward && (
          <div style={rewardBox}>
            <div style={rewardLabel}>Unlocked Reward</div>
            <div style={rewardValue}>{reward}</div>
          </div>
        )}

        <button onClick={onClose} style={button}>
          Continue
        </button>
      </div>
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(15, 23, 42, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
}

const modal: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: '#ffffff',
  padding: '42px',
  borderRadius: '22px',
  textAlign: 'center',
  minWidth: '320px',
  maxWidth: '380px',
  animation: 'popIn 0.3s ease',
  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.25)',
}

const confettiLayer: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
}

const confettiPiece: CSSProperties = {
  position: 'absolute',
  top: '-20px',
  width: '10px',
  height: '18px',
  borderRadius: '3px',
  animationName: 'confettiDrop',
  animationTimingFunction: 'ease-in',
  animationIterationCount: 1,
  opacity: 0,
}

const emoji: CSSProperties = {
  fontSize: '52px',
  marginBottom: '10px',
  position: 'relative',
  zIndex: 1,
}

const title: CSSProperties = {
  margin: 0,
  fontSize: '28px',
  fontWeight: 800,
  color: '#111827',
  position: 'relative',
  zIndex: 1,
}

const coinsBox: CSSProperties = {
  marginTop: '18px',
  padding: '14px',
  borderRadius: '14px',
  background: '#fff7ed',
  border: '1px solid #f59e0b',
  animation: 'floatUp 0.4s ease',
  position: 'relative',
  zIndex: 1,
}

const coinsLabel: CSSProperties = {
  fontSize: '13px',
  color: '#92400e',
  fontWeight: 600,
}

const coinsValue: CSSProperties = {
  fontSize: '30px',
  fontWeight: 800,
  color: '#b45309',
  marginTop: '4px',
}

const rewardBox: CSSProperties = {
  marginTop: '18px',
  padding: '16px',
  borderRadius: '16px',
  background: '#fef3c7',
  animation: 'glowPulse 1.6s infinite',
  position: 'relative',
  zIndex: 1,
}

const rewardLabel: CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#92400e',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

const rewardValue: CSSProperties = {
  fontSize: '22px',
  fontWeight: 800,
  marginTop: '6px',
}

const button: CSSProperties = {
  marginTop: '26px',
  padding: '14px 20px',
  borderRadius: '12px',
  border: 'none',
  background: '#111827',
  color: '#ffffff',
  fontWeight: 800,
  cursor: 'pointer',
  position: 'relative',
  zIndex: 1,
}
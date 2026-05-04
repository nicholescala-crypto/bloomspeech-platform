import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

type RecorderControlsProps = {
  promptLabel?: string
}

const wrapStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '18px',
  padding: '18px',
  marginTop: '18px',
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginTop: '12px',
}

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  background: '#111827',
  color: '#ffffff',
  padding: '12px 16px',
  borderRadius: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#111827',
  padding: '12px 16px',
  borderRadius: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}

const dangerButtonStyle: CSSProperties = {
  border: 'none',
  background: '#b91c1c',
  color: '#ffffff',
  padding: '12px 16px',
  borderRadius: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}

export default function RecorderControls({
  promptLabel = 'Try your best production',
}: RecorderControlsProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Ready')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef('')

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [audioUrl])

  function getSupportedMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      '',
    ]

    for (const type of candidates) {
      if (!type || MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return ''
  }

  async function startRecording() {
    try {
      setError(null)
      setStatus('Checking microphone access...')

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser does not support microphone recording.')
        setStatus('Unsupported browser')
        return
      }

      if (typeof MediaRecorder === 'undefined') {
        setError('This browser does not support MediaRecorder.')
        setStatus('Unsupported browser')
        return
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mimeType = getSupportedMimeType()
      mimeTypeRef.current = mimeType

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setError('Recording failed while the microphone was active.')
        setStatus('Recording error')
      }

      recorder.onstop = () => {
        const blobType = mimeTypeRef.current || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType })

        if (audioBlob.size === 0) {
          setError('No audio was captured. Try recording again.')
          setStatus('No audio captured')
          return
        }

        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        setStatus('Recording saved')

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }

      recorder.start()
      setIsRecording(true)
      setStatus('Recording...')
    } catch (err) {
      console.error(err)
      setError('Microphone access was blocked or unavailable.')
      setStatus('Microphone unavailable')
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) return
    mediaRecorderRef.current.stop()
    setIsRecording(false)
    setStatus('Processing recording...')
  }

  async function playRecording() {
    try {
      if (!audioUrl) return
      const audio = new Audio(audioUrl)
      await audio.play()
      setStatus('Playing recording')
    } catch (err) {
      console.error(err)
      setError('Playback failed. Try recording again.')
      setStatus('Playback error')
    }
  }

  function clearRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setError(null)
    setStatus('Ready')
  }

  return (
    <div style={wrapStyle}>
      <h3 style={{ marginTop: 0 }}>Record + Playback</h3>
      <p style={{ margin: '6px 0 0', color: '#6b7280' }}>{promptLabel}</p>

      <div style={buttonRowStyle}>
        {!isRecording ? (
          <button style={primaryButtonStyle} onClick={startRecording}>
            Start Recording
          </button>
        ) : (
          <button style={dangerButtonStyle} onClick={stopRecording}>
            Stop Recording
          </button>
        )}

        <button
          style={secondaryButtonStyle}
          onClick={playRecording}
          disabled={!audioUrl}
        >
          Play My Recording
        </button>

        <button
          style={secondaryButtonStyle}
          onClick={clearRecording}
          disabled={!audioUrl && !error}
        >
          Clear
        </button>
      </div>

      <p style={{ marginTop: '12px', color: '#374151', fontWeight: 700 }}>
        Status: {status}
      </p>

      {error ? (
        <p style={{ marginTop: '12px', color: '#b91c1c', fontWeight: 700 }}>
          {error}
        </p>
      ) : null}

      {audioUrl ? (
        <audio
          controls
          src={audioUrl}
          style={{ marginTop: '12px', width: '100%' }}
        />
      ) : null}
    </div>
  )
}
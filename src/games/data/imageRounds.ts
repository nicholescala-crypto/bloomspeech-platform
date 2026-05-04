export type TargetSound = 's' | 'r' | 'l' | 'sh'
export type PositionFocus = 'initial' | 'medial' | 'final' | 'mixed'

export type ImageChoice = {
  word: string
  image: string
  audio: string
  isCorrect: boolean
  phoneme: TargetSound | 'not-target'
  position: PositionFocus
  difficulty: 1 | 2 | 3
}

export type ImageRound = {
  prompt: string
  promptAudio?: string
  targetSound: TargetSound
  positionFocus: PositionFocus
  difficulty: 1 | 2 | 3
  choices: ImageChoice[]
}

export const imageRounds: ImageRound[] = [
  {
    prompt: 'Tap the /s/ word',
    promptAudio: '/audio/prompt-s.mp3',
    targetSound: 's',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'sun',
        image: '/images/sun.png',
        audio: '/audio/sun.mp3',
        isCorrect: true,
        phoneme: 's',
        position: 'initial',
        difficulty: 1,
      },
      {
        word: 'cat',
        image: '/images/cat.png',
        audio: '/audio/cat.mp3',
        isCorrect: false,
        phoneme: 'not-target',
        position: 'initial',
        difficulty: 1,
      },
    ],
  },
  {
    prompt: 'Tap the /s/ word',
    promptAudio: '/audio/prompt-s.mp3',
    targetSound: 's',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'sock',
        image: '/images/sock.png',
        audio: '/audio/sock.mp3',
        isCorrect: true,
        phoneme: 's',
        position: 'initial',
        difficulty: 1,
      },
      {
        word: 'car',
        image: '/images/car.png',
        audio: '/audio/car.mp3',
        isCorrect: false,
        phoneme: 'not-target',
        position: 'initial',
        difficulty: 1,
      },
    ],
  },
]
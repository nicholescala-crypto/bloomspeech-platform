import type { ImageRound } from './imageRounds'

export const lRounds: ImageRound[] = [
  {
    prompt: 'Tap the /l/ word',
    promptAudio: '/audio/prompt-l.mp3',
    targetSound: 'l',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'lion',
        image: '/images/lion.png',
        audio: '/audio/lion.mp3',
        isCorrect: true,
        phoneme: 'l',
        position: 'initial',
        difficulty: 1,
      },
      {
        word: 'dog',
        image: '/images/dog.png',
        audio: '/audio/dog.mp3',
        isCorrect: false,
        phoneme: 'not-target',
        position: 'initial',
        difficulty: 1,
      },
    ],
  },
  {
    prompt: 'Tap the /l/ word',
    promptAudio: '/audio/prompt-l.mp3',
    targetSound: 'l',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'leaf',
        image: '/images/leaf.png',
        audio: '/audio/leaf.mp3',
        isCorrect: true,
        phoneme: 'l',
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
]
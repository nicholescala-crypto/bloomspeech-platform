import type { ImageRound } from './imageRounds'

export const shRounds: ImageRound[] = [
  {
    prompt: 'Tap the /sh/ word',
    promptAudio: '/audio/prompt-sh.mp3',
    targetSound: 'sh',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'shoe',
        image: '/images/shoe.png',
        audio: '/audio/shoe.mp3',
        isCorrect: true,
        phoneme: 'sh',
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
    prompt: 'Tap the /sh/ word',
    promptAudio: '/audio/prompt-sh.mp3',
    targetSound: 'sh',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'ship',
        image: '/images/ship.png',
        audio: '/audio/ship.mp3',
        isCorrect: true,
        phoneme: 'sh',
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
]
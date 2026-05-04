import type { ImageRound } from './imageRounds'

export const rRounds: ImageRound[] = [
  {
    prompt: 'Tap the /r/ word',
    promptAudio: '/audio/prompt-r.mp3',
    targetSound: 'r',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'red',
        image: '/images/red.png',
        audio: '/audio/red.mp3',
        isCorrect: true,
        phoneme: 'r',
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
    prompt: 'Tap the /r/ word',
    promptAudio: '/audio/prompt-r.mp3',
    targetSound: 'r',
    positionFocus: 'initial',
    difficulty: 1,
    choices: [
      {
        word: 'rain',
        image: '/images/rain.png',
        audio: '/audio/rain.mp3',
        isCorrect: true,
        phoneme: 'r',
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

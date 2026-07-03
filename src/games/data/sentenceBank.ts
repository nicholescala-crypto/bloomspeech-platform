// Auto-suggested carrier sentences for articulation practice.
// One target word per sentence, with an easy (K-2) and a harder (3-5) version.
// Suggestions land in the clinician's editable box, so anything can be tweaked
// before it's assigned. Most word-bank words are picturable nouns and read well
// with the templates below; clear non-nouns (colors, common verbs/adjectives)
// are curated so they stay grammatical.

export type SentencePair = { easy: string; hard: string };

// Hand-written pairs for words a generic "I see a ___" frame would break on.
const CURATED: Record<string, SentencePair> = {
  // colors
  red: { easy: "My ball is red.", hard: "She painted the old fence a bright red." },
  blue: { easy: "The sky is blue.", hard: "He wore his favorite blue jacket to school." },
  black: { easy: "The cat is black.", hard: "We drove past a shiny black car downtown." },
  green: { easy: "The frog is green.", hard: "The tall grass turned a deep green in spring." },
  yellow: { easy: "The sun is yellow.", hard: "A row of yellow flowers grew by the path." },
  purple: { easy: "I like the color purple.", hard: "She picked a purple crayon to draw the sky." },
  // common verbs
  run: { easy: "I can run fast.", hard: "They like to run around the track after lunch." },
  ride: { easy: "I ride my bike.", hard: "We ride the bus to school every morning." },
  rip: { easy: "Do not rip the paper.", hard: "Be careful, or you will rip your new shirt." },
  go: { easy: "We can go now.", hard: "We should go to the store before it closes." },
  chase: { easy: "The dog will chase the ball.", hard: "The kitten loves to chase the little red dot." },
  chew: { easy: "Chew your food well.", hard: "Remember to chew slowly so you do not choke." },
  sing: { easy: "I like to sing.", hard: "We sing a happy song at the end of class." },
  swim: { easy: "I can swim.", hard: "We swim in the lake all summer long." },
  sweep: { easy: "I sweep the floor.", hard: "Please sweep the porch before our guests arrive." },
  draw: { easy: "I can draw a cat.", hard: "She likes to draw pictures of the ocean." },
  dream: { easy: "I dream at night.", hard: "Sometimes I dream about flying over the mountains." },
  drink: { easy: "I drink my milk.", hard: "Remember to drink water when it is hot outside." },
  drop: { easy: "Do not drop it.", hard: "Try not to drop the eggs on the way home." },
  stop: { easy: "We stop at the sign.", hard: "The cars all stop when the light turns red." },
  step: { easy: "Take one step.", hard: "Watch your step when you climb the tall ladder." },
  speak: { easy: "Please speak up.", hard: "The teacher asked me to speak in front of the class." },
  spin: { easy: "The top can spin.", hard: "The dancer began to spin around and around." },
  grab: { easy: "Grab the rope.", hard: "Grab your coat before we head out the door." },
  print: { easy: "I can print my name.", hard: "Please print your name at the top of the page." },
  // adjectives / describing words
  loud: { easy: "The drum is loud.", hard: "The music was so loud we could not talk." },
  cool: { easy: "The water is cool.", hard: "A cool breeze blew across the quiet beach." },
  shiny: { easy: "The star is shiny.", hard: "She found a shiny penny under the old bench." },
  sad: { easy: "I feel sad.", hard: "He felt sad when his best friend moved away." },
  // mass / uncountable nouns ("a rain" would be wrong)
  rain: { easy: "I hear the rain.", hard: "The rain fell softly on the roof all night." },
  snow: { easy: "I see the snow.", hard: "The white snow covered the whole backyard." },
  water: { easy: "I want some water.", hard: "The clear water sparkled in the bright sun." },
  soup: { easy: "I eat my soup.", hard: "We made warm soup on the cold winter day." },
  bread: { easy: "I like fresh bread.", hard: "The baker sold warm bread every morning." },
  music: { easy: "I love music.", hard: "We listened to soft music after dinner." },
  cheese: { easy: "I like cheese.", hard: "He put yellow cheese on his sandwich." },
  rice: { easy: "I eat rice.", hard: "We cooked a big pot of rice for dinner." },
  grass: { easy: "The grass is green.", hard: "The soft grass tickled my bare feet." },
  sand: { easy: "I play in the sand.", hard: "The warm sand felt nice between my toes." },
  soap: { easy: "I use the soap.", hard: "She washed her hands with the sweet-smelling soap." },
  milk: { easy: "I drink my milk.", hard: "She poured cold milk into the tall glass." },
};

function startsWithVowel(word: string): boolean {
  return /^[aeiou]/i.test(word);
}

function aOrAn(word: string): string {
  return startsWithVowel(word) ? "an" : "a";
}

// Noun carrier frames. Easy = short & simple; hard = longer, richer context.
const EASY_FRAMES = [
  (w: string) => `I see ${aOrAn(w)} ${w}.`,
  (w: string) => `Look at the ${w}.`,
  (w: string) => `Here is my ${w}.`,
  (w: string) => `I like the ${w}.`,
  (w: string) => `That is ${aOrAn(w)} ${w}.`,
];

const HARD_FRAMES = [
  (w: string) => `I can see the little ${w} over there.`,
  (w: string) => `My friend found ${aOrAn(w)} ${w} at the park today.`,
  (w: string) => `The ${w} is sitting right next to me.`,
  (w: string) => `Can you help me find the ${w} outside?`,
  (w: string) => `We looked at the big ${w} after school.`,
];

// Deterministic pick so a given word always yields the same sentence (stable
// across renders) while different words get variety.
function pick(word: string, salt: string, len: number): number {
  let h = 0;
  const s = word + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % len;
}

export function generateSentences(rawWord: string): SentencePair {
  const word = rawWord.trim().toLowerCase();
  if (!word) return { easy: "", hard: "" };
  if (CURATED[word]) return CURATED[word];
  return {
    easy: EASY_FRAMES[pick(word, "e", EASY_FRAMES.length)](word),
    hard: HARD_FRAMES[pick(word, "h", HARD_FRAMES.length)](word),
  };
}

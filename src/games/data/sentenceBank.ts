// Auto-suggested carrier sentences for articulation practice.
// One target word per sentence, with an easy (K-2) and a harder (3-5) version.
// Suggestions land in the clinician's editable box, so anything can be tweaked
// before it's assigned. Most word-bank words are picturable nouns and read well
// with the templates below; clear non-nouns (colors, common verbs/adjectives)
// are curated so they stay grammatical.

export type SentenceSet = { phrase: string; easy: string; hard: string };

// Hand-written sets for words a generic "a ___" frame would break on.
const CURATED: Record<string, SentenceSet> = {
  // colors
  red: { phrase: "bright red", easy: "My ball is red.", hard: "She painted the old fence a bright red." },
  blue: { phrase: "dark blue", easy: "The sky is blue.", hard: "He wore his favorite blue jacket to school." },
  black: { phrase: "shiny black", easy: "The cat is black.", hard: "We drove past a shiny black car downtown." },
  green: { phrase: "deep green", easy: "The frog is green.", hard: "The tall grass turned a deep green in spring." },
  yellow: { phrase: "bright yellow", easy: "The sun is yellow.", hard: "A row of yellow flowers grew by the path." },
  purple: { phrase: "dark purple", easy: "I like the color purple.", hard: "She picked a purple crayon to draw the sky." },
  // common verbs
  run: { phrase: "run fast", easy: "I can run fast.", hard: "They like to run around the track after lunch." },
  ride: { phrase: "ride a bike", easy: "I ride my bike.", hard: "We ride the bus to school every morning." },
  rip: { phrase: "rip the paper", easy: "Do not rip the paper.", hard: "Be careful, or you will rip your new shirt." },
  go: { phrase: "go home", easy: "We can go now.", hard: "We should go to the store before it closes." },
  chase: { phrase: "chase the ball", easy: "The dog will chase the ball.", hard: "The kitten loves to chase the little red dot." },
  chew: { phrase: "chew it up", easy: "Chew your food well.", hard: "Remember to chew slowly so you do not choke." },
  sing: { phrase: "sing a song", easy: "I like to sing.", hard: "We sing a happy song at the end of class." },
  swim: { phrase: "swim fast", easy: "I can swim.", hard: "We swim in the lake all summer long." },
  sweep: { phrase: "sweep the floor", easy: "I sweep the floor.", hard: "Please sweep the porch before our guests arrive." },
  draw: { phrase: "draw a cat", easy: "I can draw a cat.", hard: "She likes to draw pictures of the ocean." },
  dream: { phrase: "a good dream", easy: "I dream at night.", hard: "Sometimes I dream about flying over the mountains." },
  drink: { phrase: "drink it up", easy: "I drink my milk.", hard: "Remember to drink water when it is hot outside." },
  drop: { phrase: "drop it down", easy: "Do not drop it.", hard: "Try not to drop the eggs on the way home." },
  stop: { phrase: "stop here", easy: "We stop at the sign.", hard: "The cars all stop when the light turns red." },
  step: { phrase: "one big step", easy: "Take one step.", hard: "Watch your step when you climb the tall ladder." },
  speak: { phrase: "speak up", easy: "Please speak up.", hard: "The teacher asked me to speak in front of the class." },
  spin: { phrase: "spin around", easy: "The top can spin.", hard: "The dancer began to spin around and around." },
  grab: { phrase: "grab the rope", easy: "Grab the rope.", hard: "Grab your coat before we head out the door." },
  print: { phrase: "print your name", easy: "I can print my name.", hard: "Please print your name at the top of the page." },
  // adjectives / describing words
  loud: { phrase: "very loud", easy: "The drum is loud.", hard: "The music was so loud we could not talk." },
  cool: { phrase: "nice and cool", easy: "The water is cool.", hard: "A cool breeze blew across the quiet beach." },
  shiny: { phrase: "so shiny", easy: "The star is shiny.", hard: "She found a shiny penny under the old bench." },
  sad: { phrase: "a little sad", easy: "I feel sad.", hard: "He felt sad when his best friend moved away." },
  // mass / uncountable nouns ("a rain" would be wrong)
  rain: { phrase: "the rain", easy: "I hear the rain.", hard: "The rain fell softly on the roof all night." },
  snow: { phrase: "white snow", easy: "I see the snow.", hard: "The white snow covered the whole backyard." },
  water: { phrase: "cold water", easy: "I want some water.", hard: "The clear water sparkled in the bright sun." },
  soup: { phrase: "hot soup", easy: "I eat my soup.", hard: "We made warm soup on the cold winter day." },
  bread: { phrase: "fresh bread", easy: "I like fresh bread.", hard: "The baker sold warm bread every morning." },
  music: { phrase: "soft music", easy: "I love music.", hard: "We listened to soft music after dinner." },
  cheese: { phrase: "yellow cheese", easy: "I like cheese.", hard: "He put yellow cheese on his sandwich." },
  rice: { phrase: "white rice", easy: "I eat rice.", hard: "We cooked a big pot of rice for dinner." },
  grass: { phrase: "green grass", easy: "The grass is green.", hard: "The soft grass tickled my bare feet." },
  sand: { phrase: "warm sand", easy: "I play in the sand.", hard: "The warm sand felt nice between my toes." },
  soap: { phrase: "the soap", easy: "I use the soap.", hard: "She washed her hands with the sweet-smelling soap." },
  milk: { phrase: "cold milk", easy: "I drink my milk.", hard: "She poured cold milk into the tall glass." },
  // tricky words that don't fit any generic frame
  love: { phrase: "lots of love", easy: "I love my dog.", hard: "A warm hug shows someone how much you love them." },
  life: { phrase: "a happy life", easy: "I have a good life.", hard: "The old turtle lived a long and happy life." },
  french: { phrase: "so French", easy: "It is French.", hard: "It looks very French." },
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

// Short 2-3 word phrases (the step between single word and full sentence).
// "the"/"my" keep them grammatical for both countable and mass nouns.
const PHRASE_FRAMES = [
  (w: string) => `the big ${w}`,
  (w: string) => `my little ${w}`,
  (w: string) => `the funny ${w}`,
  (w: string) => `my new ${w}`,
  (w: string) => `the happy ${w}`,
];

// ── Part-of-speech routing ──────────────────────────────────────────────────
// The noun frames above only fit concrete, picturable nouns. These sets catch
// words that don't (verbs, adjectives, -ing activities, abstract/function
// words) and route them to frames that stay grammatical. Anything not listed
// defaults to the noun frames. Populated from a full sweep of the word bank.

const VERBS = new Set<string>([
  "run","ride","rip","carry","marry","hurry","borrow","care","dare","sit","sell","listen","miss","toss","follow","smile","fall","pull","chew","chase","chat","chop","cheer","capture","teach","catch","touch","reach","hatch","fetch","scratch","march","punch","crunch","itch","pitch","shake","share","shut","shine","shout","wish","splash","crash","wash","push","flash","mash","gush","blush","dash","swish","crush","smash","polish","hush","finish","think","thank","thaw","thump","throw","cut","kick","look","lick","pick","peek","go","gather","gallop","wiggle","giggle","juggle","hug","dig","tug","jog","snag","cough","laugh","puff","sniff","scuff","scoff","surf","visit","vote","travel","dive","save","give","drive","move","pave","weave","leave","shave","stop","stare","start","steer","sting","stink","stir","stoke","stomp","stun","stay","speak","spell","spill","spin","spawn","spend","spit","splice","spoil","spray","sprint","spurt","sparkle","blend","blink","bloom","blow","blur","blame","blare","bleed","bless","grab","grow","grasp","graze","grin","groan","growl","grunt","trim","trace","trade","tromp","trot","trill","trek","tread","trust","praise","pray","press","prove","preach","preen","prep","pretend","probe","prickle","promise","practice","draw","drag","drift","drip","drown","drool","drench","drawl","dread","dribble","drizzle","swim","swear","sweep","swell","swill","swipe","swoop","swirl","swivel","sway","sweat","snap","sneak","snarl","snatch","sneer","snoop","snore","snort","snub","snuff","sneeze","snuggle","sniffle","snip","freeze","frown","fray","fret","frighten","freak","frizz","defend","refill",
]);
const ADJECTIVES = new Set<string>([
  "red","merry","hairy","scary","dirty","purple","thirsty","perfect","juicy","messy","bossy","tall","yellow","polar","solar","hollow","jolly","chubby","itchy","richer","scratchy","shy","shaggy","sharp","shiny","special","delicious","thick","thin","thorny","healthy","filthy","frothy","wealthy","broken","foggy","soggy","regular","bigger","big","sick","fast","awful","comfy","careful","vivid","woven","stale","stark","steep","stiff","stout","stinky","stuck","stern","spare","spooky","black","blue","bland","blank","bleak","blind","blunt","blond","grand","grim","grumpy","graceful","gray","great","greedy","green","true","proud","prim","pretty","free","frail","frank","frozen","french","friendly","frantic","dry","dried","drowsy","sweet","swift","swampy","snug","snowy","good","brave",
]);
const GERUNDS = new Set<string>([
  "racing","kissing","dancing","bouncing","watching","marching","punching","munching","teaching","washing","fishing","pushing","wishing","splashing","crashing","hugging","jogging","tugging","digging","surfing","diving","driving","shaving","waving","swimming","swinging","spelling",
]);
// abstract (love/truth/error…) + function words (very/after…) share a safe,
// always-grammatical "say the word" fallback rather than a usage sentence.
const SAY_ONLY = new Set<string>([
  // abstract nouns
  "error","story","war","soccer","recess","gossip","love","color","feeling","channel","chapter","charm","future","nature","feature","adventure","motion","fashion","vacation","action","math","breath","youth","growth","truth","faith","myth","month","marathon","method","mathematics","toothache","sympathy","earthquake","music","traffic","fun","life","stuff","heaven","fever","navy","speed","sport","spree","spoof","blight","bliss","grade","grace","greed","grief","group","grunge","gravity","grant","trip","trend","trial","trick","truce","price","prank","prose","project","frostbite","dream","draft","swag","thud","theme","voice","volume","golf","yoga","birthday","party","morning","stunt","style",
  // function / grammar words
  "scratching","sorry","tomorrow","four","far","more","six","seven","missing","yes","less","hello","much","each","inch","thirty","thursday","thousand","third","three","thirteen","anything","nothing","something","everything","north","south","both","beneath","fourth","second","week","before","after","half","off","above","twelve","eleven","never","living","having","given","gave","wove","august","still","stank","stung","stunk","spun","tried","trod","swept","frequently","front","very","gram","drove","matching",
]);

function verbSet(w: string): SentenceSet {
  return { phrase: `${w} again`, easy: `I can ${w}.`, hard: `I ${w} every day.` };
}
function adjectiveSet(w: string): SentenceSet {
  return { phrase: `so ${w}`, easy: `It is ${w}.`, hard: `It looks very ${w}.` };
}
function gerundSet(w: string): SentenceSet {
  return { phrase: `love ${w}`, easy: `I like ${w}.`, hard: `I am good at ${w}.` };
}
function sayOnlySet(w: string): SentenceSet {
  return { phrase: `the word ${w}`, easy: `I can say ${w}.`, hard: `Can you say the word ${w}?` };
}

// Deterministic pick so a given word always yields the same sentence (stable
// across renders) while different words get variety.
function pick(word: string, salt: string, len: number): number {
  let h = 0;
  const s = word + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % len;
}

export function generateSentences(rawWord: string): SentenceSet {
  const word = rawWord.trim().toLowerCase();
  if (!word) return { phrase: "", easy: "", hard: "" };
  if (CURATED[word]) return CURATED[word];
  if (GERUNDS.has(word)) return gerundSet(word);
  if (ADJECTIVES.has(word)) return adjectiveSet(word);
  if (VERBS.has(word)) return verbSet(word);
  if (SAY_ONLY.has(word)) return sayOnlySet(word);
  return {
    phrase: PHRASE_FRAMES[pick(word, "p", PHRASE_FRAMES.length)](word),
    easy: EASY_FRAMES[pick(word, "e", EASY_FRAMES.length)](word),
    hard: HARD_FRAMES[pick(word, "h", HARD_FRAMES.length)](word),
  };
}

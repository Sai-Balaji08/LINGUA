// LINGUA starter curriculum. Pure data + builders, no database access.
// scripts/build-seed.mjs turns this into supabase/seed.sql; tests/seed.test.ts checks every exercise.
//
// Exercise content shapes (see src/lib/exercises/validate.ts):
//   multiple_choice | listening | reading | grammar -> options with exactly one is_correct
//   translation | fill_blank -> content.accepted: string[]
//   word_arrangement         -> content.answer: string[] (+ content.distractors)
//   matching                 -> options with text + match_text
//   writing                  -> content.minWords, content.keywords, content.sample
//   speaking                 -> content.target

import { createHash } from "node:crypto";

/** Deterministic UUID from a stable key, so re-running the seed updates rows instead of duplicating them. */
export function uid(key) {
  const h = createHash("md5").update(`lingua:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- builders ----------

/** Puts the correct option at a stable, non-obvious position. */
function choiceOptions(right, wrong, salt) {
  const opts = wrong.map((text) => ({ text, match_text: null, is_correct: false }));
  const at = [...salt].reduce((a, c) => a + c.charCodeAt(0), 0) % (opts.length + 1);
  opts.splice(at, 0, { text: right, match_text: null, is_correct: true });
  return opts;
}

const ex = (type, skill, prompt, instructions, explanation, content = {}, options = []) => ({
  type,
  skill,
  prompt,
  instructions,
  explanation,
  audio_url: null,
  content,
  options,
});

const mc = (prompt, right, wrong, explanation, o = {}) =>
  ex("multiple_choice", o.skill ?? "vocabulary", prompt, o.instructions ?? "Choose the correct answer.", explanation, o.content ?? {}, choiceOptions(right, wrong, prompt));

const grammar = (prompt, right, wrong, explanation, o = {}) =>
  ex("grammar", "grammar", prompt, o.instructions ?? "Choose the form that completes the sentence.", explanation, o.content ?? {}, choiceOptions(right, wrong, prompt));

const listening = (speak, question, right, wrong, explanation, o = {}) =>
  ex("listening", "listening", question, "Press play, listen, then choose the answer. You can replay it as often as you like.", explanation, { speak, ...(o.content ?? {}) }, choiceOptions(right, wrong, speak));

const reading = (passage, question, right, wrong, explanation, glossary = {}, o = {}) =>
  ex("reading", "reading", question, "Read the text, then answer the question.", explanation, { passage, glossary, ...(o.content ?? {}) }, choiceOptions(right, wrong, question));

const translation = (prompt, accepted, explanation, o = {}) =>
  ex("translation", "writing", prompt, o.instructions ?? "Translate the sentence into the language you are learning.", explanation, { accepted, ...(o.transliteration ? { transliteration: o.transliteration } : {}) });

const fillBlank = (prompt, accepted, explanation, o = {}) =>
  ex("fill_blank", o.skill ?? "vocabulary", prompt, o.instructions ?? "Type the missing word.", explanation, { accepted, ...(o.meaning ? { meaning: o.meaning } : {}) });

const arrange = (meaning, answer, distractors, explanation) =>
  ex("word_arrangement", "writing", meaning, "Tap the words in the right order to build the sentence.", explanation, { answer, distractors });

const matching = (pairs, explanation, prompt = "Match each word with its meaning.") =>
  ex("matching", "vocabulary", prompt, "Tap a word on the left, then its match on the right.", explanation, {}, pairs.map(([text, match_text]) => ({ text, match_text, is_correct: false })));

const writing = (prompt, minWords, keywords, sample, explanation) =>
  ex("writing", "writing", prompt, "Write your answer in the language you are learning. Use the suggested words.", explanation, { minWords, keywords, sample });

const speaking = (prompt, target, explanation, o = {}) =>
  ex("speaking", "speaking", prompt, "Say the phrase out loud. If your browser cannot listen, you can rate yourself instead.", explanation, { target, ...(o.transliteration ? { transliteration: o.transliteration } : {}) });

/** vocabulary row: [term, translation, transliteration, partOfSpeech, definition, example, exampleTranslation] */
const v = (term, translation, transliteration, pos, definition, example, example_translation) => ({
  term,
  translation,
  transliteration,
  part_of_speech: pos,
  definition,
  example_sentence: example,
  example_translation,
});

// ---------- curriculum ----------

const spanish = {
  code: "es",
  name: "Spanish",
  native_name: "Español",
  greeting: "Hola",
  speech_locale: "es-ES",
  position: 1,
  course: {
    title: "Spanish Foundations",
    description: "Everyday Spanish for greetings, introductions, cafés and restaurants.",
    levels: [
      {
        code: "A1",
        title: "A1 · First steps",
        units: [
          {
            title: "Greetings and introductions",
            description: "Say hello, say goodbye and tell people who you are.",
            lessons: [
              {
                title: "Hello and goodbye",
                description: "The greetings you will use every single day.",
                grammar_note:
                  "Spanish greets by time of day: buenos días (morning), buenas tardes (afternoon until early evening) and buenas noches (evening and night). Notice that días is masculine plural and tardes/noches are feminine plural, so the greeting changes its ending.",
                minutes: 6,
                vocab: [
                  v("hola", "hello", null, "interjection", "A friendly greeting used at any time of day.", "¡Hola! ¿Qué tal?", "Hello! How's it going?"),
                  v("buenos días", "good morning", null, "phrase", "Greeting used until around midday.", "Buenos días, señora.", "Good morning, madam."),
                  v("buenas tardes", "good afternoon", null, "phrase", "Greeting used from midday until early evening.", "Buenas tardes, Luis.", "Good afternoon, Luis."),
                  v("buenas noches", "good night", null, "phrase", "Evening greeting and the way to say good night.", "Buenas noches y hasta mañana.", "Good night and see you tomorrow."),
                  v("adiós", "goodbye", null, "interjection", "The standard way to say goodbye.", "Adiós, hasta pronto.", "Goodbye, see you soon."),
                  v("hasta luego", "see you later", null, "phrase", "Casual goodbye when you expect to meet again.", "Hasta luego, Ana.", "See you later, Ana."),
                  v("gracias", "thank you", null, "interjection", "Used to thank someone.", "Muchas gracias por tu ayuda.", "Thank you very much for your help."),
                  v("¿cómo estás?", "how are you?", null, "phrase", "Informal way to ask how someone is.", "Hola, Luis, ¿cómo estás?", "Hello, Luis, how are you?"),
                ],
                exercises: [
                  mc("How do you say “good morning” in Spanish?", "Buenos días", ["Buenas noches", "Hasta luego", "Gracias"], "Buenos días is used in the morning. Buenas noches is for the evening and night."),
                  matching(
                    [["Hola", "Hello"], ["Adiós", "Goodbye"], ["Gracias", "Thank you"], ["Hasta luego", "See you later"]],
                    "Hola opens a conversation, adiós and hasta luego close it, and gracias thanks someone.",
                  ),
                  listening("Buenas noches", "What did you hear?", "Good night", ["Good morning", "See you later", "Thank you"], "Buenas noches is said in the evening and when going to bed."),
                  translation("Thank you", ["gracias", "muchas gracias"], "Gracias means thank you. Muchas gracias adds “very much”.", { instructions: "Translate into Spanish." }),
                  arrange("Good afternoon, thank you.", ["Buenas", "tardes", "gracias"], ["días", "adiós"], "Greeting first, then the thanks: Buenas tardes, gracias."),
                  fillBlank("Buenos ___, señora López.", ["días"], "Before midday you say buenos días. Remember the accent on días.", { meaning: "Good morning, Mrs López." }),
                  speaking("Greet someone for the morning.", "Hola, buenos días", "Hola is hello and buenos días is good morning. Roll the r lightly in Spanish and say every vowel clearly."),
                  reading(
                    "Ana: Hola, buenas tardes.\nLuis: Buenas tardes, Ana. ¿Cómo estás?\nAna: Muy bien, gracias.",
                    "How does Ana answer Luis?",
                    "She says she is very well.",
                    ["She says goodbye.", "She asks for something.", "She says she is tired."],
                    "“Muy bien, gracias” means “Very well, thank you”.",
                    { "¿Cómo estás?": "How are you?", "muy bien": "very well" },
                  ),
                ],
              },
              {
                title: "Introducing yourself",
                description: "Say your name and where you are from.",
                grammar_note:
                  "To say your name use me llamo (literally “I call myself”). To say where you are from use soy de (“I am from”). Soy comes from the verb ser: yo soy, tú eres, él/ella es.",
                minutes: 7,
                vocab: [
                  v("me llamo", "my name is", null, "phrase", "Used to give your name. Literally “I call myself”.", "Me llamo Carmen.", "My name is Carmen."),
                  v("¿cómo te llamas?", "what is your name?", null, "phrase", "Informal question to ask someone's name.", "Hola, ¿cómo te llamas?", "Hello, what is your name?"),
                  v("soy de", "I am from", null, "phrase", "Used with a country or city to say where you come from.", "Soy de México.", "I am from Mexico."),
                  v("¿de dónde eres?", "where are you from?", null, "phrase", "Informal question about someone's origin.", "¿De dónde eres, Pablo?", "Where are you from, Pablo?"),
                  v("mucho gusto", "nice to meet you", null, "phrase", "Said when you meet someone for the first time.", "Mucho gusto, soy Pablo.", "Nice to meet you, I'm Pablo."),
                  v("soy", "I am", null, "verb", "First person singular of ser, used for identity and origin.", "Soy estudiante.", "I am a student."),
                  v("eres", "you are", null, "verb", "Informal singular form of ser.", "Eres de Chile.", "You are from Chile."),
                ],
                exercises: [
                  mc("What does “¿Cómo te llamas?” mean?", "What is your name?", ["How are you?", "Where are you from?", "Nice to meet you."], "Literally “How do you call yourself?”, which is the usual way to ask someone's name."),
                  grammar("Yo ___ de México.", "soy", ["eres", "es", "son"], "With yo (I) the verb ser becomes soy: yo soy."),
                  translation("My name is Sara.", ["me llamo Sara", "mi nombre es Sara"], "Me llamo Sara is the natural way. Mi nombre es is also correct but sounds more formal.", { instructions: "Translate into Spanish." }),
                  fillBlank("¿De dónde ___ tú?", ["eres"], "With tú (you, informal) the verb ser is eres.", { meaning: "Where are you from?", skill: "grammar" }),
                  arrange("Nice to meet you, I am Pablo.", ["Mucho", "gusto", "soy", "Pablo"], ["eres", "llamas"], "Mucho gusto is the greeting, then soy Pablo."),
                  listening("Me llamo Carmen", "What is her name?", "Carmen", ["Carlos", "Camila", "Marta"], "Me llamo Carmen means “My name is Carmen”."),
                  writing(
                    "Write two or three sentences introducing yourself: your name and where you are from.",
                    4,
                    ["me llamo", "soy de"],
                    "Me llamo Sara. Soy de la India. Mucho gusto.",
                    "Start with me llamo plus your name, then soy de plus a place.",
                  ),
                  speaking("Introduce yourself out loud.", "Me llamo Ana y soy de España", "Say me llamo and soy de as smooth groups of sounds. The double l in llamo sounds like a y."),
                ],
              },
            ],
          },
          {
            title: "Food and drink",
            description: "Order at a café and in a restaurant.",
            lessons: [
              {
                title: "At the café",
                description: "Order a drink and a snack politely.",
                grammar_note:
                  "Spanish nouns have gender. Most nouns ending in -o are masculine (un bocadillo) and most ending in -a are feminine (una limonada). Words like café and té are masculine, so they take un. Quisiera (“I would like”) is a polite way to ask for something.",
                minutes: 7,
                vocab: [
                  v("el café", "coffee", null, "noun", "The drink, masculine in Spanish.", "Un café, por favor.", "A coffee, please."),
                  v("el té", "tea", null, "noun", "The drink, masculine in Spanish.", "Quisiera un té.", "I would like a tea."),
                  v("el agua", "water", null, "noun", "Feminine, but uses el before the stressed a sound.", "Un vaso de agua, por favor.", "A glass of water, please."),
                  v("la leche", "milk", null, "noun", "Feminine noun.", "El café con leche.", "Coffee with milk."),
                  v("el pan", "bread", null, "noun", "Masculine noun.", "Quisiera pan, por favor.", "I would like some bread, please."),
                  v("el bocadillo", "sandwich", null, "noun", "A sandwich made with a bread roll.", "Un bocadillo de queso.", "A cheese sandwich."),
                  v("la limonada", "lemonade", null, "noun", "A cold drink made with lemon.", "Una limonada fría.", "A cold lemonade."),
                  v("quisiera", "I would like", null, "verb", "Polite way to ask for something.", "Quisiera una ensalada.", "I would like a salad."),
                  v("la cuenta", "the bill", null, "noun", "What you ask for at the end of a meal.", "La cuenta, por favor.", "The bill, please."),
                ],
                exercises: [
                  matching(
                    [["el café", "coffee"], ["el té", "tea"], ["el agua", "water"], ["la leche", "milk"]],
                    "These are the four drinks you will meet most often on a Spanish café menu.",
                  ),
                  mc("Which word means “bread”?", "el pan", ["la leche", "el agua", "el té"], "Pan is bread. It is masculine, so it takes el."),
                  grammar("___ limonada, por favor.", "Una", ["Un", "Uno", "Unos"], "Limonada ends in -a and is feminine, so it takes una."),
                  translation("A coffee, please.", ["un café, por favor", "un café por favor", "quisiera un café", "quisiera un café, por favor"], "Café is masculine, so un café. Por favor means please.", { instructions: "Translate into Spanish." }),
                  listening("Quisiera un té, por favor", "What does the customer want?", "A tea", ["A coffee", "Water", "Milk"], "Quisiera un té means “I would like a tea”."),
                  fillBlank("La ___, por favor.", ["cuenta"], "La cuenta is the bill. You ask for it at the end of the meal.", { meaning: "The bill, please." }),
                  arrange("I would like a salad.", ["Quisiera", "una", "ensalada"], ["un", "té"], "Ensalada is feminine, so it takes una."),
                  reading(
                    "Camarero: Buenas tardes. ¿Qué desea?\nCliente: Quisiera un café y un bocadillo, por favor.\nCamarero: Muy bien.",
                    "What does the customer order?",
                    "A coffee and a sandwich",
                    ["A tea and a salad", "Water and bread", "A lemonade and a soup"],
                    "The customer says un café y un bocadillo: a coffee and a sandwich.",
                    { camarero: "waiter", "¿Qué desea?": "What would you like?", "muy bien": "very good, fine" },
                  ),
                  speaking("Order a coffee politely.", "Un café, por favor", "Keep the stress on the é in café. Por favor has the stress on the last syllable."),
                ],
              },
              {
                title: "Ordering a meal",
                description: "Say you are hungry and order food.",
                grammar_note:
                  "To say you are hungry or thirsty Spanish uses tener (to have): tengo hambre, tengo sed. Literally “I have hunger” and “I have thirst”. Yo tengo → tengo; tú tienes → tienes; él/ella tiene → tiene.",
                minutes: 8,
                vocab: [
                  v("tengo hambre", "I am hungry", null, "phrase", "Literally “I have hunger”.", "Tengo hambre, quisiera una sopa.", "I'm hungry, I would like a soup."),
                  v("tengo sed", "I am thirsty", null, "phrase", "Literally “I have thirst”.", "Tengo sed, quisiera agua.", "I'm thirsty, I would like water."),
                  v("la sopa", "soup", null, "noun", "A hot liquid dish.", "La sopa está caliente.", "The soup is hot."),
                  v("el pollo", "chicken", null, "noun", "The meat, masculine.", "Pollo con arroz.", "Chicken with rice."),
                  v("el arroz", "rice", null, "noun", "A staple side dish, masculine.", "El arroz está bueno.", "The rice is good."),
                  v("la ensalada", "salad", null, "noun", "Cold dish of vegetables.", "Una ensalada mixta.", "A mixed salad."),
                  v("delicioso", "delicious", null, "adjective", "Describes tasty food. Feminine: deliciosa.", "La sopa está deliciosa.", "The soup is delicious."),
                  v("el menú", "the menu", null, "noun", "The list of dishes.", "El menú, por favor.", "The menu, please."),
                ],
                exercises: [
                  mc("How do you say “I am hungry”?", "Tengo hambre", ["Soy hambre", "Estoy comida", "Tengo sed"], "Spanish uses tener for hunger: tengo hambre, literally “I have hunger”."),
                  grammar("Yo ___ sed.", "tengo", ["soy", "tiene", "tienes"], "Yo goes with tengo, the first person of tener."),
                  matching(
                    [["el pollo", "chicken"], ["el arroz", "rice"], ["la sopa", "soup"], ["la ensalada", "salad"]],
                    "Pollo, arroz, sopa and ensalada are common words on any menu.",
                  ),
                  translation(
                    "I would like the chicken.",
                    ["quisiera el pollo", "quiero el pollo", "me gustaría el pollo", "me gustaria el pollo"],
                    "Quisiera is the polite wish. Quiero (“I want”) is also fine and me gustaría (“I would like”) is very polite.",
                    { instructions: "Translate into Spanish." },
                  ),
                  listening("La sopa está deliciosa", "What is delicious?", "The soup", ["The rice", "The chicken", "The salad"], "La sopa está deliciosa means “The soup is delicious”."),
                  arrange("I am thirsty, I would like water.", ["Tengo", "sed", "quisiera", "agua"], ["hambre"], "Say how you feel first (tengo sed) and then what you want (quisiera agua)."),
                  fillBlank("Tengo ___, quisiera una sopa.", ["hambre"], "Hambre is hunger. Tengo hambre means I am hungry.", { meaning: "I am hungry, I would like a soup.", skill: "vocabulary" }),
                  writing(
                    "Write a short order for the waiter. Say what you would like to eat and drink.",
                    4,
                    ["quisiera", "por favor"],
                    "Buenas tardes. Quisiera la sopa y agua, por favor.",
                    "Use quisiera for what you would like and finish politely with por favor.",
                  ),
                  speaking("Ask for the bill.", "La cuenta, por favor", "Say it clearly: la CUEN-ta, por fa-VOR."),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

const french = {
  code: "fr",
  name: "French",
  native_name: "Français",
  greeting: "Bonjour",
  speech_locale: "fr-FR",
  position: 2,
  course: {
    title: "French Foundations",
    description: "First French for greetings, introductions and the café.",
    levels: [
      {
        code: "A1",
        title: "A1 · First steps",
        units: [
          {
            title: "Salutations",
            description: "Greet people and introduce yourself.",
            lessons: [
              {
                title: "Bonjour!",
                description: "Greetings and polite words.",
                grammar_note:
                  "Use bonjour during the day and bonsoir in the evening. Salut is informal, for friends. French also has two ways to say “you”: tu (informal) and vous (polite or plural), so s'il vous plaît is the polite “please” and s'il te plaît is the friendly one.",
                minutes: 6,
                vocab: [
                  v("bonjour", "hello", null, "interjection", "Greeting used during the day.", "Bonjour, madame.", "Hello, madam."),
                  v("bonsoir", "good evening", null, "interjection", "Greeting used in the evening.", "Bonsoir, tout le monde.", "Good evening, everyone."),
                  v("salut", "hi", null, "interjection", "Informal hello and goodbye.", "Salut, Paul !", "Hi, Paul!"),
                  v("au revoir", "goodbye", null, "phrase", "The standard goodbye.", "Au revoir, à demain.", "Goodbye, see you tomorrow."),
                  v("merci", "thank you", null, "interjection", "Used to thank someone.", "Merci beaucoup.", "Thank you very much."),
                  v("s'il vous plaît", "please", null, "phrase", "Polite “please”.", "Un café, s'il vous plaît.", "A coffee, please."),
                  v("oui", "yes", null, "adverb", "Agreeing word.", "Oui, merci.", "Yes, thank you."),
                  v("ça va ?", "how are you?", null, "phrase", "Informal “How's it going?”, also the answer “I'm fine”.", "Salut, ça va ?", "Hi, how's it going?"),
                ],
                exercises: [
                  mc("Which greeting is polite for the evening?", "Bonsoir", ["Salut", "Merci", "Au revoir"], "Bonsoir is the evening greeting. Salut is too casual for a polite situation."),
                  matching(
                    [["Bonjour", "Hello"], ["Au revoir", "Goodbye"], ["Merci", "Thank you"], ["Oui", "Yes"]],
                    "Four of the most useful French words.",
                  ),
                  translation("Thank you very much.", ["merci beaucoup"], "Merci is thank you and beaucoup adds “very much”.", { instructions: "Translate into French." }),
                  listening("Au revoir", "What did you hear?", "Goodbye", ["Hello", "Thank you", "Please"], "Au revoir means goodbye, literally “until we see again”."),
                  fillBlank("S'il ___ plaît, un café.", ["vous", "te"], "S'il vous plaît is the polite form and s'il te plaît the informal one.", { meaning: "A coffee, please.", skill: "grammar" }),
                  arrange("Hello, how are you?", ["Bonjour", "ça", "va"], ["merci", "oui"], "Bonjour, ça va ? is a friendly way to open a chat."),
                  speaking("Greet someone and thank them.", "Bonjour, merci beaucoup", "In French the final consonants are often silent: say bonjour as “bon-ZHOOR”."),
                  reading(
                    "Marie : Bonjour, Paul ! Ça va ?\nPaul : Oui, ça va bien, merci. Et toi ?\nMarie : Ça va. Au revoir !",
                    "How is Paul?",
                    "He is fine.",
                    ["He is tired.", "He says goodbye first.", "He asks for a coffee."],
                    "Paul says “Ça va bien, merci”: he is doing well.",
                    { "et toi ?": "and you?", "ça va bien": "it's going well" },
                  ),
                ],
              },
              {
                title: "Introductions",
                description: "Say who you are and where you are from.",
                grammar_note:
                  "Je m'appelle means “my name is” (literally “I call myself”). Je suis de means “I am from”. Suis comes from être: je suis, tu es, il/elle est.",
                minutes: 7,
                vocab: [
                  v("je m'appelle", "my name is", null, "phrase", "Used to say your name.", "Je m'appelle Léa.", "My name is Léa."),
                  v("comment tu t'appelles ?", "what is your name?", null, "phrase", "Informal question.", "Salut, comment tu t'appelles ?", "Hi, what's your name?"),
                  v("je suis de", "I am from", null, "phrase", "Used with a place.", "Je suis de Lyon.", "I am from Lyon."),
                  v("enchanté", "nice to meet you", null, "adjective", "Said when you meet someone. Women may write enchantée.", "Enchanté, Paul.", "Nice to meet you, Paul."),
                  v("je suis", "I am", null, "phrase", "First person of être.", "Je suis étudiant.", "I am a student."),
                  v("elle est", "she is", null, "phrase", "Third person feminine of être.", "Elle est française.", "She is French."),
                ],
                exercises: [
                  mc("What does “Comment tu t'appelles ?” mean?", "What is your name?", ["How are you?", "Where are you from?", "Nice to meet you."], "Literally “How do you call yourself?”. It is the informal way to ask someone's name."),
                  grammar("Je ___ de Paris.", "suis", ["es", "est", "sommes"], "With je (I) the verb être becomes suis."),
                  translation("My name is Léa.", ["je m'appelle Léa", "je m’appelle Léa", "je m'appelle Lea"], "Je m'appelle plus your name. The apostrophe replaces the e of me.", { instructions: "Translate into French." }),
                  fillBlank("Elle ___ française.", ["est"], "With elle (she) the verb être is est.", { meaning: "She is French.", skill: "grammar" }),
                  arrange("I am from Lyon.", ["Je", "suis", "de", "Lyon"], ["es", "est"], "Je suis de followed by the city."),
                  listening("Je m'appelle Julien", "What is his name?", "Julien", ["Julie", "Jules", "Lucien"], "Je m'appelle Julien means “My name is Julien”."),
                  writing(
                    "Write two or three sentences introducing yourself in French: your name and where you are from.",
                    4,
                    ["je m'appelle", "je suis de"],
                    "Je m'appelle Sara. Je suis de Londres. Enchantée.",
                    "Use je m'appelle for your name and je suis de for your origin.",
                  ),
                  speaking("Introduce yourself out loud.", "Enchanté, je m'appelle Paul", "Link je and m'appelle smoothly: “zhuh ma-PELL”."),
                ],
              },
            ],
          },
          {
            title: "At the café",
            description: "Order a drink and something to eat.",
            lessons: [
              {
                title: "Au café",
                description: "Order politely in a French café.",
                grammar_note:
                  "French nouns are masculine or feminine: un café, un croissant, une eau. Je voudrais (“I would like”) is the polite way to order. Before a vowel, le and la become l': l'eau, l'addition.",
                minutes: 7,
                vocab: [
                  v("un café", "a coffee", null, "noun", "Masculine noun. In France it usually means a small espresso.", "Un café, s'il vous plaît.", "A coffee, please."),
                  v("le thé", "tea", null, "noun", "Masculine noun.", "Je voudrais un thé.", "I would like a tea."),
                  v("l'eau", "water", null, "noun", "Feminine noun, written l'eau.", "Une carafe d'eau.", "A jug of water."),
                  v("le lait", "milk", null, "noun", "Masculine noun.", "Un café au lait.", "A coffee with milk."),
                  v("le pain", "bread", null, "noun", "Masculine noun.", "Du pain, s'il vous plaît.", "Some bread, please."),
                  v("un croissant", "a croissant", null, "noun", "A buttery pastry.", "Un croissant et un café.", "A croissant and a coffee."),
                  v("je voudrais", "I would like", null, "phrase", "Polite way to order.", "Je voudrais un croissant.", "I would like a croissant."),
                  v("l'addition", "the bill", null, "noun", "What you ask for at the end.", "L'addition, s'il vous plaît.", "The bill, please."),
                ],
                exercises: [
                  matching(
                    [["le pain", "bread"], ["le lait", "milk"], ["l'eau", "water"], ["le thé", "tea"]],
                    "Four basics from a French café menu.",
                  ),
                  mc(
                    "How do you politely order a coffee?",
                    "Je voudrais un café, s'il vous plaît.",
                    ["Je suis un café.", "Un café s'appelle.", "Merci un café au revoir."],
                    "Je voudrais means “I would like” and s'il vous plaît makes it polite.",
                    { skill: "grammar" },
                  ),
                  grammar("Je voudrais ___ croissant.", "un", ["une", "des", "la"], "Croissant is masculine, so it takes un."),
                  translation(
                    "A tea, please.",
                    ["un thé, s'il vous plaît", "un thé s'il vous plaît", "un thé, s'il te plaît", "un thé s'il te plaît", "je voudrais un thé", "je voudrais un thé, s'il vous plaît"],
                    "Thé is masculine, so un thé. Add s'il vous plaît to be polite.",
                    { instructions: "Translate into French." },
                  ),
                  listening("L'addition, s'il vous plaît", "What does the customer ask for?", "The bill", ["The menu", "A coffee", "Water"], "L'addition is the bill."),
                  fillBlank("Je ___ un café.", ["voudrais"], "Je voudrais is the polite “I would like”.", { meaning: "I would like a coffee.", skill: "grammar" }),
                  arrange("I would like a croissant.", ["Je", "voudrais", "un", "croissant"], ["une", "suis"], "Je voudrais + un + the item."),
                  speaking("Order a coffee politely.", "Je voudrais un café, s'il vous plaît", "Keep the rhythm even: je vou-DRAIS un ca-FÉ, s'il vous plaît."),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

const hindi = {
  code: "hi",
  name: "Hindi",
  native_name: "हिन्दी",
  greeting: "नमस्ते",
  speech_locale: "hi-IN",
  position: 3,
  course: {
    title: "Hindi Foundations",
    description: "Your first Hindi words and phrases, with the Devanagari script and romanisation.",
    levels: [
      {
        code: "A1",
        title: "A1 · First steps",
        units: [
          {
            title: "Greetings",
            description: "Say hello, thank people and tell them your name.",
            lessons: [
              {
                title: "नमस्ते: first greetings",
                description: "Greet people and answer politely.",
                grammar_note:
                  "Hindi sentences put the verb at the end: मेरा नाम प्रिया है (“My name Priya is”). है (hai) means “is”. The polite “you” is आप (aap), which takes the verb form हैं (hain): आप कैसे हैं?",
                minutes: 7,
                vocab: [
                  v("नमस्ते", "hello", "namaste", "interjection", "Respectful greeting, also used for goodbye.", "नमस्ते, आप कैसे हैं?", "Hello, how are you?"),
                  v("धन्यवाद", "thank you", "dhanyavaad", "interjection", "Formal way to say thank you.", "आपका बहुत धन्यवाद।", "Thank you very much."),
                  v("कृपया", "please", "kripya", "adverb", "Used to make a polite request.", "कृपया बैठिए।", "Please sit down."),
                  v("हाँ", "yes", "haan", "adverb", "Agreeing word.", "हाँ, मैं ठीक हूँ।", "Yes, I am fine."),
                  v("नहीं", "no", "nahin", "adverb", "Word for no.", "नहीं, धन्यवाद।", "No, thank you."),
                  v("आप कैसे हैं?", "how are you?", "aap kaise hain?", "phrase", "Polite way to ask how someone is.", "नमस्ते, आप कैसे हैं?", "Hello, how are you?"),
                  v("मैं ठीक हूँ", "I am fine", "main theek hoon", "phrase", "Usual answer to आप कैसे हैं?", "मैं ठीक हूँ, धन्यवाद।", "I am fine, thank you."),
                  v("मेरा नाम", "my name", "mera naam", "phrase", "Used before your name: मेरा नाम ... है.", "मेरा नाम प्रिया है।", "My name is Priya."),
                ],
                exercises: [
                  mc("What does नमस्ते (namaste) mean?", "Hello", ["Thank you", "Please", "No"], "नमस्ते is the respectful greeting. It can also be used when leaving.", { content: { transliteration: "namaste" } }),
                  matching(
                    [["धन्यवाद", "Thank you"], ["हाँ", "Yes"], ["नहीं", "No"], ["कृपया", "Please"]],
                    "धन्यवाद (dhanyavaad), हाँ (haan), नहीं (nahin) and कृपया (kripya).",
                  ),
                  listening("धन्यवाद", "What did you hear?", "Thank you", ["Hello", "Please", "Yes"], "धन्यवाद (dhanyavaad) means thank you."),
                  translation("Thank you", ["धन्यवाद", "dhanyavaad", "dhanyavad", "शुक्रिया"], "धन्यवाद is the formal thank you. शुक्रिया (shukriya) is a common everyday alternative.", {
                    instructions: "Translate into Hindi. You may type in Devanagari or in romanised letters.",
                    transliteration: "dhanyavaad",
                  }),
                  fillBlank("मेरा ___ प्रिया है।", ["नाम", "naam"], "नाम (naam) means name: मेरा नाम प्रिया है, “My name is Priya”.", { meaning: "My name is Priya.", skill: "vocabulary" }),
                  arrange("My name is Priya.", ["मेरा", "नाम", "प्रिया", "है"], ["आप", "हाँ"], "Hindi puts the verb है last: मेरा नाम प्रिया है."),
                  reading(
                    "राहुल: नमस्ते! आप कैसे हैं?\nप्रिया: मैं ठीक हूँ, धन्यवाद।",
                    "How is Priya?",
                    "She is fine.",
                    ["She says no.", "She says please.", "She is leaving."],
                    "प्रिया says “मैं ठीक हूँ”: I am fine.",
                    { कैसे: "how", ठीक: "fine, okay", हूँ: "am" },
                  ),
                  speaking("Greet someone and thank them.", "नमस्ते, धन्यवाद", "Say na-mas-TE and dhan-ya-VAAD. The ध is a breathy d.", { transliteration: "namaste, dhanyavaad" }),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

export const languagesData = [spanish, french, hindi];

// ---------- flatten into table rows with deterministic ids ----------

export function buildRows(langs = languagesData) {
  const rows = { languages: [], courses: [], levels: [], units: [], lessons: [], exercises: [], options: [], vocabulary: [], lessonVocabulary: [] };

  for (const lang of langs) {
    const languageId = uid(`lang:${lang.code}`);
    rows.languages.push({
      id: languageId,
      code: lang.code,
      name: lang.name,
      native_name: lang.native_name,
      greeting: lang.greeting,
      speech_locale: lang.speech_locale,
      published: true,
      position: lang.position,
    });
    const courseId = uid(`course:${lang.code}`);
    rows.courses.push({
      id: courseId,
      language_id: languageId,
      title: lang.course.title,
      description: lang.course.description,
      taught_in: "en",
      published: true,
      position: 1,
    });

    lang.course.levels.forEach((level, li) => {
      const levelId = uid(`level:${lang.code}:${level.code}`);
      rows.levels.push({ id: levelId, course_id: courseId, code: level.code, title: level.title, position: li + 1, published: true });

      level.units.forEach((unit, ui) => {
        const unitId = uid(`unit:${lang.code}:${level.code}:${ui}`);
        rows.units.push({ id: unitId, level_id: levelId, title: unit.title, description: unit.description, position: ui + 1, published: true });

        unit.lessons.forEach((lesson, si) => {
          const lessonKey = `${lang.code}:${level.code}:${ui}:${si}`;
          const lessonId = uid(`lesson:${lessonKey}`);
          rows.lessons.push({
            id: lessonId,
            unit_id: unitId,
            title: lesson.title,
            description: lesson.description,
            grammar_note: lesson.grammar_note ?? null,
            estimated_minutes: lesson.minutes,
            position: si + 1,
            published: true,
            // not a column; kept so tests and docs can group by language
            _language: lang.code,
          });

          lesson.vocab.forEach((w) => {
            const vocabId = uid(`vocab:${lang.code}:${w.term}:${w.translation}`);
            if (!rows.vocabulary.some((r) => r.id === vocabId)) {
              rows.vocabulary.push({ id: vocabId, language_id: languageId, ...w });
            }
            rows.lessonVocabulary.push({ lesson_id: lessonId, vocabulary_id: vocabId });
          });

          lesson.exercises.forEach((e, ei) => {
            const exerciseId = uid(`exercise:${lessonKey}:${ei}`);
            rows.exercises.push({
              id: exerciseId,
              lesson_id: lessonId,
              type: e.type,
              skill: e.skill,
              prompt: e.prompt,
              instructions: e.instructions,
              explanation: e.explanation,
              audio_url: e.audio_url,
              content: e.content,
              position: ei + 1,
              _language: lang.code,
            });
            e.options.forEach((o, oi) => {
              rows.options.push({
                id: uid(`option:${lessonKey}:${ei}:${oi}`),
                exercise_id: exerciseId,
                text: o.text,
                match_text: o.match_text ?? null,
                is_correct: Boolean(o.is_correct),
                position: oi + 1,
              });
            });
          });
        });
      });
    });
  }
  return rows;
}

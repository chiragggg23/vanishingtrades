// The demo world. Loaded by the browser mock (client/src/mock) and by `npm run seed` on the server.
// Everyone here is fictional. Crafts and places are real. Numbers are samples.
import { DEMO_PASSWORD, ROADMAP_STEPS, demoEmail } from './constants.js';
import { timeSegments } from './mockAi.js';

/** Deterministic 24-hex ids so mock ids and Mongo ObjectIds are the same strings. */
export const oid = (prefix, n) => `${prefix}${String(n.toString(16)).padStart(22, '0')}`;
const U = (n) => oid('a1', n);
const A = (n) => oid('a2', n);
const C = (n) => oid('a3', n);
const S = (n) => oid('a4', n);
const E = (n) => oid('a5', n);
const P = (n) => oid('a6', n);
const AP = (n) => oid('a7', n);
const F = (n) => oid('a8', n);
const CE = (n) => oid('a9', n);
const PR = (n) => oid('aa', n);

export const SEED_CERT_CODE = 'VT-7K3M-9QX2';

const ARTISANS = [
  // [name, craftType, village, district, years, featured, bio.en, bio.kn, languages]
  [
    'Kempamma',
    'channapatna',
    'Kalanagara',
    'Ramanagara',
    34,
    true,
    'Turns toys on a lathe her husband built from a cycle wheel. Colours everything with lac and kitchen dyes.',
    'ಸೈಕಲ್ ಚಕ್ರದಿಂದ ಗಂಡ ಮಾಡಿದ ಯಂತ್ರದಲ್ಲಿ ಗೊಂಬೆಗಳನ್ನು ಕಡೆಯುತ್ತಾರೆ. ಅರಗು ಮತ್ತು ಅಡುಗೆಮನೆಯ ಬಣ್ಣಗಳನ್ನೇ ಬಳಸುತ್ತಾರೆ.',
    ['kn', 'hi'],
  ],
  [
    'Shivalingaiah',
    'channapatna',
    'Akkur',
    'Ramanagara',
    41,
    false,
    'Third generation toy-maker. Known in the lane for spinning tops that hum.',
    'ಮೂರನೇ ತಲೆಮಾರಿನ ಗೊಂಬೆ ಕಲಾವಿದರು. ಗುನುಗುವ ಬುಗುರಿಗಳಿಗೆ ಬೀದಿಯಲ್ಲಿ ಹೆಸರುವಾಸಿ.',
    ['kn'],
  ],
  [
    'Mohammed Rafiq',
    'bidriware',
    'Chidri',
    'Bidar',
    29,
    true,
    'Inlays silver wire into blackened zinc. Insists the soil of the old fort is the real artist.',
    'ಕಪ್ಪಾದ ಸತುವಿನ ಮೇಲೆ ಬೆಳ್ಳಿ ತಂತಿ ಕೂರಿಸುತ್ತಾರೆ. ಹಳೆಯ ಕೋಟೆಯ ಮಣ್ಣೇ ನಿಜವಾದ ಕಲಾವಿದ ಎನ್ನುತ್ತಾರೆ.',
    ['hi', 'kn', 'en'],
  ],
  [
    'Shabana Begum',
    'bidriware',
    'Ashtur',
    'Bidar',
    22,
    false,
    'Learnt the poppy and vine patterns from her mother. Teaches two girls from her lane on Sundays.',
    'ಅಮ್ಮನಿಂದ ಗಸಗಸೆ ಹೂ ಮತ್ತು ಬಳ್ಳಿ ವಿನ್ಯಾಸ ಕಲಿತರು. ಭಾನುವಾರ ಬೀದಿಯ ಇಬ್ಬರು ಹುಡುಗಿಯರಿಗೆ ಕಲಿಸುತ್ತಾರೆ.',
    ['hi', 'en'],
  ],
  [
    'Gangamma Hiremath',
    'ilkal',
    'Ilkal',
    'Bagalkot',
    38,
    true,
    'Weaves Ilkal sarees with the kondi join, ten days a saree. Her daughter sits at the loom in the holidays.',
    'ಕೊಂಡಿ ಜೋಡಣೆಯ ಇಳಕಲ್ ಸೀರೆ ನೇಯುತ್ತಾರೆ, ಒಂದು ಸೀರೆಗೆ ಹತ್ತು ದಿನ. ರಜೆಯಲ್ಲಿ ಮಗಳು ಮಗ್ಗದ ಬಳಿ ಕೂರುತ್ತಾಳೆ.',
    ['kn'],
  ],
  [
    'Basavaraj Kalaburgi',
    'ilkal',
    'Hungund',
    'Bagalkot',
    26,
    false,
    'Handloom weaver holding out against the power looms down the road.',
    'ರಸ್ತೆಯ ಆಚೆಯ ವಿದ್ಯುತ್ ಮಗ್ಗಗಳ ನಡುವೆಯೂ ಕೈಮಗ್ಗ ಬಿಡದ ನೇಕಾರರು.',
    ['kn', 'hi'],
  ],
  [
    'Murthy Chitragar',
    'kinhal',
    'Kinhal',
    'Koppal',
    45,
    true,
    'One of the few Chitragar craftsmen still shaping festival figures from light wood and tamarind paste.',
    'ಹಗುರ ಮರ ಮತ್ತು ಹುಣಸೆ ಅಂಟಿನಿಂದ ಹಬ್ಬದ ಮೂರ್ತಿಗಳನ್ನು ಮಾಡುವ ಕೆಲವೇ ಚಿತ್ರಗಾರರಲ್ಲಿ ಒಬ್ಬರು.',
    ['kn'],
  ],
  [
    'Lakshmi Chitragar',
    'kinhal',
    'Kinhal',
    'Koppal',
    19,
    false,
    'Painted figures for years before anyone let her carve one. Now does the whole piece, wood to varnish.',
    'ಹಲವು ವರ್ಷ ಬಣ್ಣ ಮಾತ್ರ ಹಚ್ಚುತ್ತಿದ್ದರು. ಈಗ ಮರದಿಂದ ಕೊನೆಯ ಹೊಳಪಿನವರೆಗೆ ಪೂರ್ತಿ ಮೂರ್ತಿ ಮಾಡುತ್ತಾರೆ.',
    ['kn', 'hi'],
  ],
  [
    'Abdul Sattar',
    'rosewood-inlay',
    'Mandi Mohalla',
    'Mysuru',
    36,
    true,
    'Fits slivers of light wood into rosewood, one piece at a time. An elephant panel takes him three weeks.',
    'ರೋಸ್‌ವುಡ್‌ನಲ್ಲಿ ತಿಳಿ ಮರದ ಚೂರುಗಳನ್ನು ಒಂದೊಂದಾಗಿ ಕೂರಿಸುತ್ತಾರೆ. ಒಂದು ಆನೆ ಫಲಕಕ್ಕೆ ಮೂರು ವಾರ.',
    ['kn', 'en', 'hi'],
  ],
  [
    'Nagaraj Achar',
    'rosewood-inlay',
    'Ashokapuram',
    'Mysuru',
    31,
    false,
    'Keeps two fretsaws that belonged to his teacher and is looking for someone to hand them to.',
    'ಗುರುಗಳ ಎರಡು ಗರಗಸಗಳನ್ನು ಜೋಪಾನ ಮಾಡಿದ್ದಾರೆ. ಅವನ್ನು ಕೊಡಲು ಶಿಷ್ಯರನ್ನು ಹುಡುಕುತ್ತಿದ್ದಾರೆ.',
    ['kn', 'en'],
  ],
  [
    'Puttamma Kumbar',
    'pottery',
    'Kollegal',
    'Chamarajanagar',
    40,
    true,
    'Digs clay from the lake bed every summer. Nobody in her house sleeps on the night of a firing.',
    'ಪ್ರತಿ ಬೇಸಿಗೆಯಲ್ಲಿ ಕೆರೆಯ ತಳದ ಮಣ್ಣು ತರುತ್ತಾರೆ. ಸುಡುವ ರಾತ್ರಿ ಮನೆಯಲ್ಲಿ ಯಾರೂ ನಿದ್ದೆ ಮಾಡುವುದಿಲ್ಲ.',
    ['kn'],
  ],
  [
    'Venkappa Moolya',
    'pottery',
    'Bantwal',
    'Dakshina Kannada',
    27,
    false,
    'Makes curd pots and festival lamps on a stone wheel his grandfather set in the yard.',
    'ಅಜ್ಜ ಅಂಗಳದಲ್ಲಿ ಇಟ್ಟ ಕಲ್ಲಿನ ಚಕ್ರದಲ್ಲಿ ಮೊಸರು ಗಡಿಗೆ ಮತ್ತು ಹಬ್ಬದ ದೀಪಗಳನ್ನು ಮಾಡುತ್ತಾರೆ.',
    ['kn', 'en'],
  ],
];

const WORKS = [
  // [artisanIndex(1-based), en, kn, description, materials, min, max]
  [
    1,
    'Small rocking horse',
    'ಸಣ್ಣ ತೂಗುಕುದುರೆ',
    'A palm-sized rocking horse turned from aale wood and finished in lac red and turmeric yellow.',
    ['aale wood', 'lac', 'vegetable dye'],
    450,
    650,
  ],
  [
    1,
    'Abacus with turned beads',
    'ಮಣಿಗಳ ಲೆಕ್ಕದ ಚೌಕಟ್ಟು',
    'Ten rows of hand-turned beads on a lacquered frame. Children chew it; the dyes are safe.',
    ['aale wood', 'lac', 'turmeric'],
    380,
    500,
  ],
  [
    2,
    'Spinning tops, set of six',
    'ಆರು ಬುಗುರಿಗಳ ಸೆಟ್',
    'Six tops that hum when they spin, each banded in a different colour.',
    ['aale wood', 'lac'],
    240,
    320,
  ],
  [
    2,
    'Bride and groom dolls',
    'ವಧು-ವರ ಗೊಂಬೆಗಳು',
    'A wedding pair for the Dasara doll display, with painted jewellery.',
    ['aale wood', 'lac', 'natural dye'],
    900,
    1200,
  ],
  [
    3,
    'Surahi with poppy inlay',
    'ಗಸಗಸೆ ಹೂವಿನ ಸುರಾಹಿ',
    'A long-necked water flask in blackened alloy with a band of silver poppies.',
    ['zinc alloy', 'silver wire', 'Bidar soil'],
    8500,
    12000,
  ],
  [
    3,
    'Paan box, vine pattern',
    'ಬಳ್ಳಿ ವಿನ್ಯಾಸದ ಎಲೆ-ಅಡಿಕೆ ಡಬ್ಬಿ',
    'A small hinged paan box with a creeping vine in silver wire.',
    ['zinc alloy', 'silver wire'],
    4200,
    5600,
  ],
  [
    4,
    'Bangle box with silver vine',
    'ಬೆಳ್ಳಿ ಬಳ್ಳಿಯ ಬಳೆ ಡಬ್ಬಿ',
    'A round bangle box; the vine runs all the way round the lid without a join.',
    ['zinc alloy', 'silver wire'],
    3000,
    4000,
  ],
  [
    4,
    'Hookah base, fish-scale pattern',
    'ಮೀನು-ಹುರುಪೆ ವಿನ್ಯಾಸದ ಹುಕ್ಕಾ ತಳ',
    'A heavy hookah base covered in a fish-scale pattern of silver sheet.',
    ['zinc alloy', 'silver sheet'],
    15000,
    22000,
  ],
  [
    5,
    'Ilkal saree, kumkum red pallu',
    'ಕುಂಕುಮ ಕೆಂಪು ಸೆರಗಿನ ಇಳಕಲ್ ಸೀರೆ',
    'Nine yards of cotton body with a red silk pallu joined by the kondi interlock.',
    ['cotton', 'art silk', 'natural dye'],
    3200,
    4800,
  ],
  [
    5,
    'Saree with chikki paras border',
    'ಚಿಕ್ಕಿ ಪರಸ್ ಅಂಚಿನ ಸೀರೆ',
    'A dark green saree with the small chikki paras border, woven for everyday wear.',
    ['cotton', 'art silk'],
    2800,
    3600,
  ],
  [
    6,
    'Saree with gomi border',
    'ಗೋಮಿ ಅಂಚಿನ ಸೀರೆ',
    'A saree with the gomi border and the temple-shaped tope teni pallu.',
    ['cotton', 'silk'],
    3500,
    5200,
  ],
  [
    6,
    'Cotton dupatta, kondi join',
    'ಕೊಂಡಿ ಜೋಡಣೆಯ ಹತ್ತಿ ದುಪಟ್ಟಾ',
    'A light dupatta showing the kondi join, for anyone who wants to see how it is done.',
    ['cotton'],
    900,
    1400,
  ],
  [
    7,
    'Garuda figure for festivals',
    'ಹಬ್ಬದ ಗರುಡ ಮೂರ್ತಿ',
    'A Garuda figure built over light wood with tamarind paste and cloth, finished with tin leaf.',
    ['light wood', 'tamarind paste', 'cotton cloth', 'tin foil'],
    6000,
    9000,
  ],
  [
    7,
    'Pair of painted parrots',
    'ಬಣ್ಣದ ಗಿಳಿಗಳ ಜೋಡಿ',
    'Two parrots in Kinhal green, light enough to hang from a doorway.',
    ['light wood', 'tamarind paste'],
    1800,
    2600,
  ],
  [
    8,
    'Hanuman mask',
    'ಹನುಮಂತನ ಮುಖವಾಡ',
    'A wearable mask for street plays, painted in vermilion and gold.',
    ['light wood', 'cotton cloth', 'mineral colour'],
    2200,
    3000,
  ],
  [
    8,
    'Cradle toys, set of four',
    'ತೊಟ್ಟಿಲ ಆಟಿಕೆಗಳು',
    'Four small birds to hang over a cradle; each one painted differently.',
    ['light wood', 'lacquer'],
    1500,
    2200,
  ],
  [
    9,
    'Elephant panel in rosewood',
    'ಆನೆಯ ಫಲಕ',
    'A book-sized panel of a procession elephant, inlaid with satinwood and bone.',
    ['rosewood', 'satinwood', 'bone'],
    18000,
    26000,
  ],
  [
    9,
    'Jewellery box with lotus',
    'ಕಮಲದ ಆಭರಣ ಪೆಟ್ಟಿಗೆ',
    'A jewellery box with an inlaid lotus on the lid and a velvet tray.',
    ['rosewood', 'satinwood'],
    5200,
    7000,
  ],
  [
    10,
    'Tray with peacock inlay',
    'ನವಿಲು ಕೆತ್ತನೆಯ ತಟ್ಟೆ',
    'A serving tray with a peacock whose tail uses four kinds of wood.',
    ['rosewood', 'teak', 'satinwood'],
    4800,
    6500,
  ],
  [
    10,
    'Wall plaque of Chamundi hill',
    'ಚಾಮುಂಡಿ ಬೆಟ್ಟದ ಗೋಡೆ ಫಲಕ',
    'The hill, the steps and the Nandi, cut into a rosewood plaque.',
    ['rosewood', 'bone'],
    9000,
    14000,
  ],
  [
    11,
    'Water pot with lid',
    'ಮುಚ್ಚಳದ ನೀರಿನ ಮಡಕೆ',
    'A wide-bellied water pot from lake-bed clay. Keeps water cool through April.',
    ['tank clay', 'sand'],
    350,
    500,
  ],
  [
    11,
    'Curd pots, set of three',
    'ಮೊಸರು ಗಡಿಗೆಗಳು',
    'Three small curd pots. The curd sets thicker in clay, and that is not a sample number.',
    ['tank clay'],
    450,
    600,
  ],
  [
    12,
    'Tulasi planter',
    'ತುಳಸಿ ಕಟ್ಟೆ ಕುಂಡ',
    'A planter for the tulasi with a stamped border of lamps.',
    ['red clay'],
    600,
    900,
  ],
  [
    12,
    'Festival lamp stand',
    'ಹಬ್ಬದ ದೀಪದ ಕಂಬ',
    'A five-wick lamp stand for Deepavali, fired twice so it does not crack.',
    ['red clay', 'sand'],
    1200,
    1600,
  ],
];

// [artisanIndex, language, title, status, durationSec|null, original sentences, english sentences, tags, plays]
const STORIES = [
  [
    1,
    'kn',
    'ಅಜ್ಜನ ಮೊದಲ ಗೊಂಬೆ',
    'approved',
    26,
    [
      'ನನ್ನ ಅಜ್ಜ ನನಗೆ ಮೊದಲ ಗೊಂಬೆ ಮಾಡಲು ಕಲಿಸಿದರು.',
      'ಆಲೆ ಮರವನ್ನು ಕಡೆತದ ಯಂತ್ರದ ಮೇಲೆ ಕಡೆದು, ಅರಗು ಹಚ್ಚಿ, ಕೇದಗೆ ಎಲೆಯಿಂದ ಹೊಳಪು ಕೊಡುತ್ತೇವೆ.',
      'ಈಗ ನಮ್ಮ ಬೀದಿಯಲ್ಲಿ ಮೂರೇ ಮನೆಗಳು ಈ ಕೆಲಸ ಮಾಡುತ್ತವೆ.',
      'ಮಕ್ಕಳು ಗೊಂಬೆ ಹಿಡಿದು ನಗುವಾಗ ನನ್ನ ಕೈ ದಣಿವು ಮರೆಯುತ್ತದೆ.',
    ],
    [
      'My grandfather taught me to make my first toy.',
      'We turn aale wood on the lathe, press on lac, and polish it with a screwpine leaf.',
      'Now only three houses on our street still do this work.',
      'When children hold a toy and laugh, my hands forget they are tired.',
    ],
    ['family', 'lac'],
    41,
  ],
  [
    2,
    'kn',
    'ಬಣ್ಣಗಳು ಅಡುಗೆಮನೆಯಿಂದ ಬರುತ್ತವೆ',
    'approved',
    22,
    [
      'ನಮ್ಮ ಬಣ್ಣಗಳು ಅಂಗಡಿಯಿಂದ ಬರುವುದಿಲ್ಲ, ಅಡುಗೆಮನೆಯಿಂದ ಬರುತ್ತವೆ.',
      'ಅರಿಶಿನದಿಂದ ಹಳದಿ, ಕುಂಕುಮದಿಂದ ಕೆಂಪು, ನೀಲಿಯಿಂದ ನೀಲಿ ಬಣ್ಣ ಮಾಡುತ್ತೇವೆ.',
      'ಬಣ್ಣವನ್ನು ಅರಗಿನ ಕಡ್ಡಿಯಲ್ಲಿ ಬೆರೆಸಿ, ತಿರುಗುವ ಮರಕ್ಕೆ ಒತ್ತುತ್ತೇವೆ.',
      'ಆ ಬಿಸಿ ಘರ್ಷಣೆಯೇ ಗೊಂಬೆಗೆ ಹೊಳಪು ಕೊಡುತ್ತದೆ.',
    ],
    [
      "Our colours don't come from a shop; they come from the kitchen.",
      'Turmeric gives yellow, kumkum gives red, and indigo gives blue.',
      'We melt the colour into a stick of lac and press it against the spinning wood.',
      'That heat from friction is what gives the toy its shine.',
    ],
    ['dyes', 'lac'],
    27,
  ],
  [
    3,
    'hi',
    'बीदर के किले की मिट्टी',
    'approved',
    24,
    [
      'बीदरी का काला रंग बीदर के पुराने किले की मिट्टी से आता है।',
      'हम जस्ते और तांबे के बर्तन पर चाँदी का पतला तार बिठाते हैं।',
      'फिर मिट्टी और पानी के लेप से बर्तन काला हो जाता है, पर चाँदी चमकती रहती है।',
      'मेरे पिता कहते थे, यह मिट्टी किसी और शहर में काम नहीं करती।',
    ],
    [
      "The black of Bidri comes from the soil of Bidar's old fort.",
      'We set thin silver wire into a vessel of zinc and copper.',
      'Then a paste of that soil and water turns the vessel black, while the silver keeps shining.',
      'My father used to say this soil does not work in any other town.',
    ],
    ['soil', 'silver'],
    33,
  ],
  [
    4,
    'en',
    "My mother's hands, my hands",
    'approved',
    null,
    [
      'My mother drew the patterns with a needle before she had ever held a pencil.',
      'I learnt the poppy and the vine from watching her, sitting on the floor of our one room.',
      'Today I teach two girls from our lane on Sunday mornings.',
      'They are quicker than I was, and they argue with me about the patterns, which is a good sign.',
    ],
    null,
    ['teaching', 'family'],
    12,
  ],
  [
    5,
    'kn',
    'ತೋಪು ತೆನಿ ಸೆರಗು',
    'approved',
    28,
    [
      'ಇಳಕಲ್ ಸೀರೆಯ ಕೆಂಪು ಸೆರಗನ್ನು ಬೇರೆಯಾಗಿ ನೇಯ್ದು, ಕೊಂಡಿ ಹಾಕಿ ಜೋಡಿಸುತ್ತೇವೆ.',
      'ಒಂದು ಸೀರೆಗೆ ಹತ್ತು ದಿನ ಬೇಕು, ಕೆಲವೊಮ್ಮೆ ಹೆಚ್ಚು.',
      'ಸೆರಗಿನ ಮೇಲಿನ ತೋಪು ತೆನಿ ಗುರುತು ಕೋಟೆಯ ಗೋಡೆಯಂತೆ ಕಾಣುತ್ತದೆ.',
      'ನನ್ನ ಮಗಳು ಈಗ ಕಾಲೇಜಿಗೆ ಹೋಗುತ್ತಾಳೆ, ಆದರೆ ರಜೆಯಲ್ಲಿ ಮಗ್ಗದ ಬಳಿ ಕುಳಿತುಕೊಳ್ಳುತ್ತಾಳೆ.',
    ],
    [
      'We weave the red pallu of an Ilkal saree separately and join it with the kondi interlock.',
      'One saree takes ten days, sometimes more.',
      'The tope teni mark on the pallu looks like the wall of a fort.',
      'My daughter goes to college now, but in the holidays she sits by the loom.',
    ],
    ['loom', 'family'],
    58,
  ],
  [
    6,
    'kn',
    'ವಿದ್ಯುತ್ ಮಗ್ಗದ ಸದ್ದು',
    'pending',
    20,
    [
      'ನಮ್ಮ ಊರಿನಲ್ಲಿ ಈಗ ವಿದ್ಯುತ್ ಮಗ್ಗಗಳ ಸದ್ದು ಹೆಚ್ಚಾಗಿದೆ.',
      'ಅವು ಬೇಗ ನೇಯುತ್ತವೆ, ಆದರೆ ಕೊಂಡಿ ಜೋಡಣೆ ಅವಕ್ಕೆ ಬರುವುದಿಲ್ಲ.',
      'ಕೈಮಗ್ಗದ ಸೀರೆಯನ್ನು ಗುರುತಿಸುವವರು ಇನ್ನೂ ಇದ್ದಾರೆ, ಅದೇ ನಮ್ಮ ಭರವಸೆ.',
    ],
    [
      'In our town the noise of power looms has grown louder.',
      'They weave fast, but they cannot do the kondi join.',
      'There are still people who can tell a handloom saree apart, and that is our hope.',
    ],
    ['loom', 'livelihood'],
    0,
  ],
  [
    7,
    'kn',
    'ಹಂಪಿಯ ರಥದ ಕುದುರೆಗಳು',
    'approved',
    25,
    [
      'ನಮ್ಮ ಪೂರ್ವಜರು ಹಂಪಿಯ ರಥಗಳಿಗೆ ಕುದುರೆಗಳನ್ನು ಮಾಡುತ್ತಿದ್ದರು ಎಂದು ಹೇಳುತ್ತಾರೆ.',
      'ಹಗುರವಾದ ಮರ, ಹುಣಸೆ ಬೀಜದ ಅಂಟು ಮತ್ತು ಹತ್ತಿ ಬಟ್ಟೆಯಿಂದ ಆಕಾರ ಕೊಡುತ್ತೇವೆ.',
      'ಕೊನೆಯಲ್ಲಿ ಬಣ್ಣ ಮತ್ತು ಹೊಳೆಯುವ ತಗಡಿನ ಎಲೆ ಹಚ್ಚುತ್ತೇವೆ.',
      'ಈಗ ಕಿನ್ನಾಳದಲ್ಲಿ ಕೆಲವೇ ಕುಟುಂಬಗಳು ಈ ಕೆಲಸ ಉಳಿಸಿಕೊಂಡಿವೆ.',
    ],
    [
      "They say our ancestors made the horses for Hampi's chariots.",
      'We shape them from light wood, tamarind-seed paste and cotton cloth.',
      'Last, we add paint and a shining leaf of tin.',
      'Only a few families in Kinhal still keep this work alive.',
    ],
    ['history', 'festival'],
    64,
  ],
  [
    8,
    'hi',
    'रंग भरने वाली औरतें',
    'approved',
    22,
    [
      'किन्हाल में मूर्ति गढ़ने का काम पहले सिर्फ़ आदमी करते थे।',
      'हम औरतें रंग भरती थीं, पर हमारा नाम कोई नहीं लेता था।',
      'अब मैं पूरी मूर्ति खुद बनाती हूँ, लकड़ी से लेकर आख़िरी रंग तक।',
    ],
    [
      "In Kinhal, carving the figures used to be men's work only.",
      'We women did the painting, but nobody said our names.',
      'Now I make the whole figure myself, from the wood to the last coat of colour.',
    ],
    ['women', 'painting'],
    37,
  ],
  [
    9,
    'en',
    'Elephants in the grain',
    'approved',
    24,
    [
      'Rosewood is hard on the tools and harder on the eyes.',
      'We cut the pattern into the dark wood and fit tiny pieces of lighter wood into it, one by one.',
      'An elephant panel the size of a book takes me three weeks.',
      'The old masters used ivory; we use other woods and bone now, and I think the elephants prefer it.',
    ],
    null,
    ['inlay', 'patience'],
    29,
  ],
  [
    10,
    'en',
    'Who will hold the fretsaw',
    'pending',
    null,
    [
      'I have two fretsaws that belonged to my teacher.',
      'Nobody in my street wants to learn anymore, because the work is slow and the pay comes late.',
      'If two young people sit with me for a year, they will know enough to earn.',
    ],
    null,
    ['apprentices'],
    0,
  ],
  [
    11,
    'kn',
    'ಕೆರೆಯ ಮಣ್ಣು',
    'approved',
    23,
    [
      'ಬೇಸಿಗೆಯಲ್ಲಿ ಕೆರೆ ಒಣಗಿದಾಗ ನಾವು ಅದರ ತಳದ ಮಣ್ಣನ್ನು ತರುತ್ತೇವೆ.',
      'ಮಣ್ಣನ್ನು ಕಾಲಿನಿಂದ ತುಳಿದು, ಚಕ್ರದ ಮೇಲೆ ಮಡಕೆ ಎಬ್ಬಿಸುತ್ತೇವೆ.',
      'ಒಲೆಯಲ್ಲಿ ಸುಡುವ ರಾತ್ರಿ ಯಾರೂ ನಿದ್ದೆ ಮಾಡುವುದಿಲ್ಲ.',
      'ಮಣ್ಣಿನ ಮಡಕೆಯ ನೀರು ಇನ್ನೂ ಎಲ್ಲಕ್ಕಿಂತ ತಣ್ಣಗಿರುತ್ತದೆ.',
    ],
    [
      'In summer, when the lake dries, we bring clay from its bed.',
      'We knead the clay with our feet and raise the pot on the wheel.',
      'On the night of the firing, nobody sleeps.',
      'Water from a clay pot is still the coolest of all.',
    ],
    ['clay', 'kiln'],
    46,
  ],
  [
    1,
    'hi',
    'खिलौनों के रंग',
    'rejected',
    14,
    [
      'हमारे खिलौने बच्चों के मुँह में भी जाएँ तो डर नहीं।',
      'रंग पेड़-पौधों से बनते हैं।',
      'इसके बाद मैं...',
    ],
    [
      "Even if our toys end up in a child's mouth, there is nothing to fear.",
      'The colours are made from plants.',
      'After that I...',
    ],
    ['dyes'],
    0,
  ],
  [
    1,
    'en',
    'The lathe my husband built',
    'draft',
    null,
    [
      'My husband built our first lathe from an old cycle wheel.',
      'It still runs, though it complains.',
    ],
    null,
    [],
    0,
  ],
];

const APPRENTICESHIPS = [
  // [artisanIndex, title, description, seats, weeks, stipend, location, deadlineDays(+future/-past), status]
  [
    1,
    'Lathe and lac: twelve weeks in Kalanagara',
    'Learn to turn aale wood, mix lac colours from turmeric and indigo, and polish with screwpine leaf. You will finish with a set of toys you made yourself.',
    2,
    12,
    3000,
    'Kalanagara, Ramanagara',
    40,
    'open',
  ],
  [
    3,
    'Silver wire inlay for beginners',
    'Six months at the bench: casting the alloy, engraving, hammering in silver wire and the final blackening with fort soil.',
    1,
    24,
    4500,
    'Chidri, Bidar',
    25,
    'open',
  ],
  [
    5,
    'Ilkal loom: the kondi join',
    'Sit at a pit loom and learn the kondi interlock that joins the pallu to the body. Weekends possible for students.',
    2,
    16,
    3500,
    'Ilkal, Bagalkot',
    55,
    'open',
  ],
  [
    7,
    'Kinhal figures: wood, paste and tin',
    'Work beside a Chitragar family on festival figures, from carving light wood to laying tin leaf.',
    1,
    20,
    4000,
    'Kinhal, Koppal',
    30,
    'open',
  ],
  [
    10,
    'Fretsaw and inlay apprenticeship',
    'A year with two fretsaws and a lot of rosewood. Patience is the only entry requirement.',
    2,
    52,
    5000,
    'Ashokapuram, Mysuru',
    60,
    'open',
  ],
  [
    11,
    'Wheel and kiln, one summer',
    'From lake-bed clay to the firing night. This opening has closed; watch for the next one.',
    3,
    8,
    null,
    'Kollegal, Chamarajanagar',
    -12,
    'closed',
  ],
];

/** Build the whole demo world. All dates are relative to `now`. */
export function buildSeed(now = new Date()) {
  const t = now.getTime();
  const ago = (days, hours = 0) => new Date(t - days * 86400000 - hours * 3600000).toISOString();
  const ahead = (days) => new Date(t + days * 86400000).toISOString();

  const users = [];
  const addUser = (n, name, role, email, days, lang = 'en') =>
    users.push({
      id: U(n),
      name,
      email,
      password: DEMO_PASSWORD,
      role,
      active: true,
      preferredLang: lang,
      demo: true,
      createdAt: ago(days),
      updatedAt: ago(days),
    });
  addUser(1, 'Kempamma', 'artisan', demoEmail('artisan'), 175, 'kn');
  addUser(2, 'Meera Hegde', 'learner', demoEmail('learner'), 150);
  addUser(3, 'Ananya Rao', 'buyer', demoEmail('buyer'), 140);
  addUser(4, 'Farida Khan', 'reviewer', demoEmail('reviewer'), 178);
  addUser(5, 'Raghav Kulkarni', 'admin', demoEmail('admin'), 179);
  ARTISANS.slice(1).forEach((a, i) => {
    const slug = a[0].toLowerCase().replace(/[^a-z]+/g, '.');
    addUser(6 + i, a[0], 'artisan', `${slug}@artisans.vanishingtrades.test`, 170 - i * 9, 'kn');
  });
  addUser(17, 'Arjun Patil', 'learner', 'arjun.patil@learners.vanishingtrades.test', 60);
  addUser(18, 'Sneha Gowda', 'learner', 'sneha.gowda@learners.vanishingtrades.test', 45);
  addUser(19, 'Thomas Mathew', 'buyer', 'thomas.mathew@buyers.vanishingtrades.test', 90);
  const artisanUser = (i) => (i === 1 ? U(1) : U(4 + i));

  const artisans = ARTISANS.map((a, i) => ({
    id: A(i + 1),
    userId: artisanUser(i + 1),
    name: a[0],
    craftType: a[1],
    village: a[2],
    district: a[3],
    yearsOfPractice: a[4],
    featured: a[5],
    bio: { en: a[6], kn: a[7] },
    languages: a[8],
    avatarUrl: null,
    seed: `artisan-${i + 1}`,
    demo: true,
    createdAt: ago(175 - i * 9),
    updatedAt: ago(175 - i * 9),
  }));

  const crafts = WORKS.map((w, i) => ({
    id: C(i + 1),
    artisanId: A(w[0]),
    title: { en: w[1], kn: w[2] },
    craftType: ARTISANS[w[0] - 1][1],
    description: { en: w[3] },
    materials: w[4],
    priceMin: w[5],
    priceMax: w[6],
    imageUrl: null,
    seed: `work-${i + 1}`,
    createdAt: ago(165 - i * 6, i),
    updatedAt: ago(165 - i * 6, i),
  }));

  const stories = STORIES.map((s, i) => {
    const [ai, language, title, status, duration, original, english, tags, plays] = s;
    const created = 160 - i * 11;
    const processed = status !== 'draft';
    const transcript = processed ? timeSegments(original, duration) : [];
    const translation = processed ? timeSegments(english || original, duration) : [];
    const submitted = status === 'draft' ? null : ago(created - 2);
    return {
      id: S(i + 1),
      artisanId: A(ai),
      title,
      language,
      craftType: ARTISANS[ai - 1][1],
      text: original.join(' '),
      audioUrl: null,
      audioIsSample: duration !== null,
      hasSampleAudio: duration !== null,
      durationSec: duration,
      transcript,
      translation,
      summary: processed ? { en: (english || original).slice(0, 2).join(' ') } : { en: '' },
      tags,
      ai: processed ? { provider: 'mock', isSample: true, processedAt: ago(created - 1) } : null,
      status,
      reviewNote:
        status === 'rejected'
          ? 'The story stops mid-sentence. Could you record the ending about how the colours are made?'
          : null,
      submittedAt: submitted,
      approvedAt: status === 'approved' ? ago(created - 4) : null,
      plays,
      createdAt: ago(created),
      updatedAt: ago(
        status === 'rejected' ? created - 5 : created - (status === 'approved' ? 4 : 2),
      ),
    };
  });

  const reply = (n, authorId, message, days) => ({
    id: oid('ac', n),
    authorId,
    message,
    createdAt: ago(days),
  });
  const enquiries = [
    {
      id: E(1),
      buyerId: U(3),
      artisanId: A(1),
      craftId: C(1),
      subject: 'Twenty rocking horses for a school',
      message:
        'We run a small primary school in Mysuru and would like twenty rocking horses for the nursery class. Is that possible before the new term?',
      status: 'answered',
      replies: [
        reply(
          1,
          U(1),
          'Yes, twenty is possible in five weeks. I will send a photo of the first one so you can check the colour.',
          20,
        ),
      ],
      createdAt: ago(22),
      updatedAt: ago(20),
    },
    {
      id: E(2),
      buyerId: U(3),
      artisanId: A(5),
      craftId: C(9),
      subject: 'Ilkal saree in red and green',
      message:
        'Could you weave the kumkum red pallu with a dark green body? It is for my mother’s sixtieth birthday.',
      status: 'open',
      replies: [],
      createdAt: ago(6),
      updatedAt: ago(6),
    },
    {
      id: E(3),
      buyerId: U(19),
      artisanId: A(3),
      craftId: C(5),
      subject: 'A surahi as a wedding gift',
      message:
        'I would like the poppy surahi as a wedding gift in December. Can you engrave two initials on the base?',
      status: 'answered',
      replies: [
        reply(
          2,
          U(6 + 1),
          'Initials are no trouble. Tell me the letters and I will start after Friday prayers.',
          40,
        ),
      ],
      createdAt: ago(43),
      updatedAt: ago(40),
    },
    {
      id: E(4),
      buyerId: U(19),
      artisanId: A(1),
      craftId: null,
      subject: 'Toys for a shop in Pune',
      message:
        'I run a toy shop in Pune and would like to stock your toys every quarter. What quantities can you manage?',
      status: 'open',
      replies: [],
      createdAt: ago(3),
      updatedAt: ago(3),
    },
  ];

  const apprenticeships = APPRENTICESHIPS.map((p, i) => ({
    id: P(i + 1),
    artisanId: A(p[0]),
    title: p[1],
    craftType: ARTISANS[p[0] - 1][1],
    description: p[2],
    seats: p[3],
    durationWeeks: p[4],
    stipend: p[5],
    location: p[6],
    deadline: p[7] > 0 ? ahead(p[7]) : ago(-p[7]),
    status: p[8],
    createdAt: ago(150 - i * 20),
    updatedAt: ago(150 - i * 20),
  }));

  const roadmap = (doneCount, days) =>
    ROADMAP_STEPS.map((s, i) => ({
      ...s,
      done: i < doneCount,
      doneAt: i < doneCount ? ago(days - i * 7) : null,
    }));
  const applications = [
    {
      id: AP(1),
      apprenticeshipId: P(1),
      learnerId: U(2),
      motivation:
        'My grandmother had Channapatna toys at home and I want to learn to make them, not only buy them.',
      status: 'completed',
      roadmap: roadmap(5, 120),
      certificateCode: SEED_CERT_CODE,
      createdAt: ago(145),
      updatedAt: ago(30),
    },
    {
      id: AP(2),
      apprenticeshipId: P(3),
      learnerId: U(2),
      motivation: 'I study textile design and want to understand the kondi join with my own hands.',
      status: 'accepted',
      roadmap: roadmap(2, 40),
      certificateCode: null,
      createdAt: ago(70),
      updatedAt: ago(26),
    },
    {
      id: AP(3),
      apprenticeshipId: P(1),
      learnerId: U(17),
      motivation:
        'I am a carpenter’s son and already know the lathe. I want to learn the lac colours.',
      status: 'applied',
      roadmap: roadmap(0, 0),
      certificateCode: null,
      createdAt: ago(9),
      updatedAt: ago(9),
    },
    {
      id: AP(4),
      apprenticeshipId: P(1),
      learnerId: U(18),
      motivation:
        'I make clay toys at home and would like to learn wood. I can come every weekday.',
      status: 'shortlisted',
      roadmap: roadmap(0, 0),
      certificateCode: null,
      createdAt: ago(14),
      updatedAt: ago(8),
    },
    {
      id: AP(5),
      apprenticeshipId: P(4),
      learnerId: U(18),
      motivation:
        'The Kinhal figures at Hampi stayed with me since a school trip. I would like to learn.',
      status: 'applied',
      roadmap: roadmap(0, 0),
      certificateCode: null,
      createdAt: ago(5),
      updatedAt: ago(5),
    },
  ];

  const progress = [
    {
      id: PR(1),
      applicationId: AP(1),
      note: 'Turned my first top. It wobbles, but it spins.',
      photoUrl: null,
      createdAt: ago(110),
    },
    {
      id: PR(2),
      applicationId: AP(2),
      note: 'Learnt to set up the warp. Gangamma did it in half the time.',
      photoUrl: null,
      createdAt: ago(35),
    },
    {
      id: PR(3),
      applicationId: AP(2),
      note: 'First kondi join. Three threads went the wrong way; undid it twice.',
      photoUrl: null,
      createdAt: ago(27),
    },
  ];

  const certificates = [
    {
      id: CE(1),
      code: SEED_CERT_CODE,
      applicationId: AP(1),
      learnerName: 'Meera Hegde',
      artisanName: 'Kempamma',
      craftType: 'channapatna',
      apprenticeshipTitle: APPRENTICESHIPS[0][1],
      durationWeeks: 12,
      issuedAt: ago(30),
    },
  ];

  const flags = [
    {
      id: F(1),
      targetType: 'story',
      targetId: S(9),
      reason: 'The story mentions ivory. Please check it is fine to keep in the archive.',
      reporterId: U(17),
      status: 'open',
      resolution: null,
      resolvedAt: null,
      createdAt: ago(4),
    },
    {
      id: F(2),
      targetType: 'craft',
      targetId: C(23),
      reason: 'Listed as red clay, but the description of the border sounds like cement casting.',
      reporterId: U(3),
      status: 'open',
      resolution: null,
      resolvedAt: null,
      createdAt: ago(2),
    },
    {
      id: F(3),
      targetType: 'artisan',
      targetId: A(12),
      reason: 'The bio reads like it was copied from a tourism brochure.',
      reporterId: U(19),
      status: 'open',
      resolution: null,
      resolvedAt: null,
      createdAt: ago(1),
    },
  ];

  return {
    users,
    artisans,
    crafts,
    stories,
    enquiries,
    apprenticeships,
    applications,
    progress,
    certificates,
    flags,
    audit: [],
  };
}

/** Text a native speaker should check (used by scripts/translations-review.mjs). */
export function seedTextsForReview() {
  const out = [];
  ARTISANS.forEach((a) =>
    out.push({ key: `seed.artisan.${a[0]}.bio`, en: a[6], kn: a[7], hi: '' }),
  );
  WORKS.forEach((w, i) =>
    out.push({ key: `seed.work.${i + 1}.title`, en: w[1], kn: w[2], hi: '' }),
  );
  STORIES.forEach((s, i) =>
    s[5].forEach((line, j) =>
      out.push({
        key: `seed.story.${i + 1}.${j + 1}`,
        en: (s[6] || s[5])[j],
        kn: s[1] === 'kn' ? line : '',
        hi: s[1] === 'hi' ? line : '',
      }),
    ),
  );
  return out;
}

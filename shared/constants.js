// Shared constants used by the browser mock, the client UI and the Express server.
export const ROLES = ['artisan', 'learner', 'buyer', 'reviewer', 'admin'];
export const PUBLIC_ROLES = ['artisan', 'learner', 'buyer'];
export const LANGS = ['en', 'kn', 'hi'];
export const STORY_LANGS = ['kn', 'hi', 'en'];
export const CRAFT_KEYS = [
  'channapatna',
  'bidriware',
  'ilkal',
  'kinhal',
  'rosewood-inlay',
  'pottery',
];
export const STORY_STATUSES = ['draft', 'pending', 'approved', 'rejected'];
export const APPLICATION_STATUSES = ['applied', 'shortlisted', 'accepted', 'rejected', 'completed'];
export const ENQUIRY_STATUSES = ['open', 'answered', 'closed'];
export const FLAG_TARGETS = ['story', 'craft', 'artisan'];
export const ROADMAP_STEPS = [
  { id: 's1', key: 'tools' },
  { id: 's2', key: 'materials' },
  { id: 's3', key: 'technique' },
  { id: 's4', key: 'first-piece' },
  { id: 's5', key: 'showcase' },
];
export const DISTRICTS = [
  'Ramanagara',
  'Bidar',
  'Bagalkot',
  'Koppal',
  'Mysuru',
  'Chamarajanagar',
  'Dakshina Kannada',
];
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'video/webm',
];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const PAGE_LIMIT_DEFAULT = 12;
export const PAGE_LIMIT_MAX = 50;
export const CERT_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const DEMO_PASSWORD = 'demo1234';
export const demoEmail = (role) => `demo-${role}@vanishingtrades.test`;

/** Strip MIME parameters: "audio/webm;codecs=opus" -> "audio/webm". */
export const baseMime = (type) =>
  String(type || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

/** Craft types with sample practitioner counts. Numbers are illustrative only (isSample: true). */
export const CRAFT_TYPES = [
  {
    key: 'channapatna',
    name: { en: 'Channapatna toys', kn: 'ಚನ್ನಪಟ್ಟಣದ ಗೊಂಬೆಗಳು', hi: 'चन्नपटना के खिलौने' },
    region: 'Ramanagara',
    since: '18th century',
    practitioners: 640,
    practitionersNote: 'households turning lacquered toys',
  },
  {
    key: 'bidriware',
    name: { en: 'Bidriware', kn: 'ಬಿದರಿ ಕಲೆ', hi: 'बीदरी शिल्प' },
    region: 'Bidar',
    since: '14th century',
    practitioners: 310,
    practitionersNote: 'metalworkers inlaying silver',
  },
  {
    key: 'ilkal',
    name: { en: 'Ilkal weaving', kn: 'ಇಳಕಲ್ ನೇಯ್ಗೆ', hi: 'इलकल बुनाई' },
    region: 'Bagalkot',
    since: '8th century',
    practitioners: 420,
    practitionersNote: 'handloom weavers',
  },
  {
    key: 'kinhal',
    name: { en: 'Kinhal lacquerware', kn: 'ಕಿನ್ನಾಳ ಕಲೆ', hi: 'किन्हाल लाख शिल्प' },
    region: 'Koppal',
    since: '16th century',
    practitioners: 14,
    practitionersNote: 'Chitragar families',
  },
  {
    key: 'rosewood-inlay',
    name: { en: 'Rosewood inlay', kn: 'ರೋಸ್‌ವುಡ್ ಕೆತ್ತನೆ', hi: 'रोज़वुड जड़ाई' },
    region: 'Mysuru',
    since: '19th century',
    practitioners: 85,
    practitionersNote: 'inlay workshops',
  },
  {
    key: 'pottery',
    name: { en: 'Village pottery', kn: 'ಕುಂಬಾರಿಕೆ', hi: 'गाँव की कुम्हारी' },
    region: 'Chamarajanagar',
    since: 'time out of mind',
    practitioners: 900,
    practitionersNote: 'potters at the wheel',
  },
].map((c) => ({ ...c, isSample: true }));

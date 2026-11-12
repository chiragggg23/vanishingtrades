// Mongoose models. Every model has timestamps and a toJSON that exposes `id` and hides `_id`,
// `__v` and password hashes. Services read with .lean() and convert through utils/plain(), then
// shape responses with shared/views.js.
import mongoose from 'mongoose';
import {
  APPLICATION_STATUSES,
  CRAFT_KEYS,
  ENQUIRY_STATUSES,
  FLAG_TARGETS,
  LANGS,
  ROLES,
  STORY_LANGS,
  STORY_STATUSES,
  VERIFY_ID_TYPES,
  VERIFY_STATUSES,
} from '../../../shared/constants.js';

const { Schema, model, models } = mongoose;
const { ObjectId } = Schema.Types;

const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
};
const opts = { timestamps: true, toJSON };
const localized = { en: { type: String, default: '' }, kn: String, hi: String };
const define = (name, schema) => models[name] || model(name, schema);
// Stories have a `language` field (kn/hi/en). MongoDB would read it as the text-index language
// override and reject "kn", so text indexes use no stemming and an unused override field.
const TEXT = { default_language: 'none', language_override: 'textIndexLanguage' };

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    active: { type: Boolean, default: true },
    preferredLang: { type: String, enum: LANGS, default: 'en' },
    demo: { type: Boolean, default: false },
    // Bumped on logout: every token signed with an older version stops working.
    tokenVersion: { type: Number, default: 0 },
  },
  opts,
);
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ name: 'text', email: 'text' }, TEXT);

const artisanSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    craftType: { type: String, enum: CRAFT_KEYS, required: true },
    village: String,
    district: String,
    bio: localized,
    yearsOfPractice: { type: Number, default: 0 },
    languages: [String],
    avatarUrl: { type: String, default: null },
    seed: String,
    featured: { type: Boolean, default: false },
    demo: { type: Boolean, default: false },
    // Identity check. Only `verifyStatus === 'verified'` is ever shown publicly; the proof
    // details below are returned to the artisan themself and to admins only.
    verifyStatus: { type: String, enum: VERIFY_STATUSES, default: 'none' },
    verifyIdType: { type: String, enum: [...VERIFY_ID_TYPES, null], default: null },
    verifyIdNumber: { type: String, default: null },
    verifyNote: { type: String, default: null },
    verifyReason: { type: String, default: null },
    verifySubmittedAt: { type: Date, default: null },
    verifyDecidedAt: { type: Date, default: null },
    verifyDecidedBy: { type: ObjectId, ref: 'User', default: null },
  },
  opts,
);
artisanSchema.index({ userId: 1 }, { unique: true });
artisanSchema.index({ verifyStatus: 1, verifySubmittedAt: 1 });
artisanSchema.index({ craftType: 1 });
artisanSchema.index({ district: 1 });
artisanSchema.index({ name: 'text', village: 'text', district: 'text', 'bio.en': 'text' }, TEXT);

const craftSchema = new Schema(
  {
    artisanId: { type: ObjectId, ref: 'Artisan', required: true },
    title: localized,
    craftType: { type: String, enum: CRAFT_KEYS, required: true },
    description: localized,
    materials: [String],
    priceMin: { type: Number, default: null },
    priceMax: { type: Number, default: null },
    imageUrl: { type: String, default: null },
    seed: String,
  },
  opts,
);
craftSchema.index({ artisanId: 1 });
craftSchema.index({ craftType: 1 });
craftSchema.index({ 'title.en': 'text', 'description.en': 'text', materials: 'text' }, TEXT);

const segment = new Schema(
  {
    id: String,
    start: { type: Number, default: null },
    end: { type: Number, default: null },
    text: String,
  },
  { _id: false },
);
const storySchema = new Schema(
  {
    artisanId: { type: ObjectId, ref: 'Artisan', required: true },
    title: { type: String, required: true },
    language: { type: String, enum: STORY_LANGS, required: true },
    craftType: { type: String, enum: CRAFT_KEYS, required: true },
    text: { type: String, default: '' },
    audioUrl: { type: String, default: null },
    audioIsSample: { type: Boolean, default: false },
    durationSec: { type: Number, default: null },
    transcript: { type: [segment], default: [] },
    translation: { type: [segment], default: [] },
    summary: { en: { type: String, default: '' } },
    tags: [String],
    ai: {
      type: new Schema({ provider: String, isSample: Boolean, processedAt: Date }, { _id: false }),
      default: null,
    },
    status: { type: String, enum: STORY_STATUSES, default: 'draft' },
    reviewNote: { type: String, default: null },
    reviewedBy: { type: ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    plays: { type: Number, default: 0 },
  },
  opts,
);
storySchema.index({ status: 1 });
storySchema.index({ artisanId: 1 });
storySchema.index({ craftType: 1 });
storySchema.index({ language: 1 });
storySchema.index({ approvedAt: -1 });
storySchema.index({ title: 'text', 'summary.en': 'text', 'translation.text': 'text' }, TEXT);

const reply = new Schema(
  { id: String, authorId: { type: ObjectId, ref: 'User' }, message: String, createdAt: Date },
  { _id: false },
);
const enquirySchema = new Schema(
  {
    buyerId: { type: ObjectId, ref: 'User', required: true },
    artisanId: { type: ObjectId, ref: 'Artisan', required: true },
    craftId: { type: ObjectId, ref: 'Craft', default: null },
    subject: String,
    message: String,
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'open' },
    replies: { type: [reply], default: [] },
  },
  opts,
);
enquirySchema.index({ buyerId: 1 });
enquirySchema.index({ artisanId: 1 });
enquirySchema.index({ status: 1 });

const apprenticeshipSchema = new Schema(
  {
    artisanId: { type: ObjectId, ref: 'Artisan', required: true },
    title: String,
    craftType: { type: String, enum: CRAFT_KEYS },
    description: String,
    seats: Number,
    durationWeeks: Number,
    stipend: { type: Number, default: null },
    location: String,
    deadline: Date,
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  opts,
);
apprenticeshipSchema.index({ deadline: 1 });
apprenticeshipSchema.index({ status: 1 });
apprenticeshipSchema.index({ craftType: 1 });
apprenticeshipSchema.index({ artisanId: 1 });
apprenticeshipSchema.index({ title: 'text', description: 'text', location: 'text' }, TEXT);

const step = new Schema(
  {
    id: String,
    key: String,
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
  },
  { _id: false },
);
const applicationSchema = new Schema(
  {
    apprenticeshipId: { type: ObjectId, ref: 'Apprenticeship', required: true },
    learnerId: { type: ObjectId, ref: 'User', required: true },
    motivation: String,
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied' },
    roadmap: { type: [step], default: [] },
    certificateCode: { type: String, default: null },
  },
  opts,
);
applicationSchema.index({ apprenticeshipId: 1, learnerId: 1 }, { unique: true });
applicationSchema.index({ learnerId: 1 });
applicationSchema.index({ status: 1 });

const progressSchema = new Schema(
  {
    applicationId: { type: ObjectId, ref: 'Application', required: true },
    note: String,
    photoUrl: { type: String, default: null },
  },
  opts,
);
progressSchema.index({ applicationId: 1, createdAt: 1 });

const certificateSchema = new Schema(
  {
    code: { type: String, required: true },
    applicationId: { type: ObjectId, ref: 'Application' },
    learnerName: String,
    artisanName: String,
    craftType: String,
    apprenticeshipTitle: String,
    durationWeeks: Number,
    issuedAt: Date,
  },
  opts,
);
certificateSchema.index({ code: 1 }, { unique: true });

const flagSchema = new Schema(
  {
    targetType: { type: String, enum: FLAG_TARGETS, required: true },
    targetId: { type: ObjectId, required: true },
    reason: String,
    reporterId: { type: ObjectId, ref: 'User' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    resolution: { type: String, enum: ['dismissed', 'removed', null], default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: ObjectId, ref: 'User', default: null },
  },
  opts,
);
flagSchema.index({ status: 1, createdAt: -1 });

const auditSchema = new Schema(
  {
    actorId: { type: ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: String,
    targetId: String,
    details: { type: Schema.Types.Mixed, default: {} },
  },
  opts,
);
auditSchema.index({ createdAt: -1 });

export const User = define('User', userSchema);
export const Artisan = define('Artisan', artisanSchema);
export const Craft = define('Craft', craftSchema);
export const Story = define('Story', storySchema);
export const Enquiry = define('Enquiry', enquirySchema);
export const Apprenticeship = define('Apprenticeship', apprenticeshipSchema);
export const Application = define('Application', applicationSchema);
export const ProgressLog = define('ProgressLog', progressSchema);
export const Certificate = define('Certificate', certificateSchema);
export const Flag = define('Flag', flagSchema);
export const AuditLog = define('AuditLog', auditSchema);

export const ALL_MODELS = [
  User,
  Artisan,
  Craft,
  Story,
  Enquiry,
  Apprenticeship,
  Application,
  ProgressLog,
  Certificate,
  Flag,
  AuditLog,
];

import multer from 'multer';
import {
  AUDIO_MAX_BYTES,
  AUDIO_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  baseMime,
} from '../../../shared/constants.js';
import { validate } from '../../../shared/validation.js';
import { schemas } from '../../../shared/validation.js';
import { fail, MSG } from '../utils/http.js';

// Files stay in memory; storage.js decides where they end up (Cloudinary or disk).
// Type checks happen in the validators below so they return 422 field errors, like the mock.
export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_MAX_BYTES, files: 1, fields: 5 },
}).single('audio');

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_MAX_BYTES, files: 1, fields: 2 },
}).single('image');

export function validateAudio(req, _res, next) {
  try {
    const v = validate(schemas.audioMeta, req.body || {});
    const errors = { ...v.errors };
    if (!req.file) errors.audio = 'Attach a recording.';
    else if (!AUDIO_TYPES.includes(baseMime(req.file.mimetype)))
      errors.audio = 'Use a webm, mp4, m4a, ogg, mp3 or wav recording.';
    if (Object.keys(errors).length) fail(422, MSG.invalid, { errors });
    req.body = v.value;
    next();
  } catch (err) {
    next(err);
  }
}

export function validateImage(req, _res, next) {
  try {
    if (!req.file) fail(422, MSG.invalid, { errors: { image: 'Choose an image.' } });
    if (!IMAGE_TYPES.includes(baseMime(req.file.mimetype)))
      fail(422, MSG.invalid, { errors: { image: 'Use a JPEG, PNG, WebP or GIF image.' } });
    next();
  } catch (err) {
    next(err);
  }
}

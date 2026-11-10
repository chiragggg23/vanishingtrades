// Where uploaded files live: Cloudinary when CLOUDINARY_* is set, otherwise local disk under
// server/uploads (served at /uploads). Images are re-encoded to JPEG, longest side <= 800 px.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { config, hasCloudinary } from '../config/env.js';
import { baseMime } from '../../../shared/constants.js';
import { fail } from '../utils/http.js';

let cloud = null;
async function cloudinary() {
  if (!cloud) {
    const mod = await import('cloudinary');
    cloud = mod.v2;
    cloud.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
  }
  return cloud;
}

const uploadToCloudinary = async (buffer, options) => {
  const c = await cloudinary();
  return new Promise((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      { folder: 'vanishingtrades', ...options },
      (err, res) => (err ? reject(err) : resolve(res.secure_url)),
    );
    stream.end(buffer);
  });
};

async function writeLocal(sub, name, buffer) {
  const dir = join(config.uploadsDir, sub);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buffer);
  return `/uploads/${sub}/${name}`;
}

const AUDIO_EXT = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
};

export async function saveImage(buffer) {
  let jpeg;
  try {
    jpeg = await sharp(buffer)
      .rotate()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    fail(422, 'Please check the highlighted fields.', {
      errors: { image: 'That file is not a readable image.' },
    });
  }
  if (hasCloudinary()) return uploadToCloudinary(jpeg, { resource_type: 'image', format: 'jpg' });
  return writeLocal('images', `${randomUUID()}.jpg`, jpeg);
}

export async function saveAudio(buffer, mimetype, name = randomUUID()) {
  const ext = AUDIO_EXT[baseMime(mimetype)] || 'webm';
  if (hasCloudinary())
    return uploadToCloudinary(buffer, { resource_type: 'video', public_id: name });
  return writeLocal('audio', `${name}.${ext}`, buffer);
}

/** Read stored audio back (for the real AI provider). Returns { buffer, mimetype } or null. */
export async function loadAudio(url) {
  if (!url) return null;
  try {
    if (url.startsWith('/uploads/')) {
      const buffer = await readFile(join(config.uploadsDir, url.replace('/uploads/', '')));
      const ext = url.split('.').pop();
      const mimetype = Object.entries(AUDIO_EXT).find(([, e]) => e === ext)?.[0] || 'audio/webm';
      return { buffer, mimetype };
    }
    if (/^https?:/.test(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      return {
        buffer: Buffer.from(await res.arrayBuffer()),
        mimetype: res.headers.get('content-type') || 'audio/webm',
      };
    }
  } catch {
    return null;
  }
  return null;
}

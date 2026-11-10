// Every endpoint from docs/API_CONTRACT.md. Order on each route: auth (401/403 paused) ->
// role (403) -> validation (422) -> controller -> service (404, ownership 403, 409).
import { Router } from 'express';
import { schemas } from '../../../shared/validation.js';
import { auth } from '../middleware/auth.js';
import { validateBody as v } from '../middleware/validate.js';
import { limits } from '../middleware/limits.js';
import { audioUpload, imageUpload, validateAudio, validateImage } from '../middleware/upload.js';
import {
  adminC,
  applicationsC,
  apprenticeshipsC,
  archiveC,
  artisansC,
  authC,
  craftsC,
  demoC,
  enquiriesC,
  impactC,
  reviewC,
  storiesC,
  uploadsC,
} from '../controllers/index.js';

const r = Router();
const partial = { partial: true };

// Auth
r.post('/auth/login', limits.auth, v(schemas.login), authC.login);
r.post('/auth/register', limits.auth, v(schemas.register), authC.register);
r.get('/auth/me', auth(), authC.me);
r.post('/auth/logout', auth(), authC.logout);
r.patch('/auth/me', auth(), v(schemas.updateMe, partial), authC.updateMe);

// Artisans
r.get('/artisans', artisansC.list);
r.get('/artisans/featured', artisansC.featured);
r.get('/artisans/me', auth('artisan'), artisansC.mine);
r.put('/artisans/me', auth('artisan'), v(schemas.artisan, partial), artisansC.updateMine);
r.get('/artisans/:id', artisansC.getOne);

// Crafts
r.get('/craft-types', craftsC.types);
r.get('/crafts', craftsC.list);
r.get('/crafts/mine', auth('artisan'), craftsC.mine);
r.post('/crafts', auth('artisan'), v(schemas.craft), craftsC.create);
r.get('/crafts/:id', craftsC.getOne);
r.put('/crafts/:id', auth('artisan'), v(schemas.craft, partial), craftsC.update);
r.delete('/crafts/:id', auth('artisan', 'admin'), craftsC.remove);

// Enquiries
r.post('/enquiries', auth('buyer'), v(schemas.enquiry), enquiriesC.create);
r.get('/enquiries', auth('buyer', 'artisan', 'admin'), enquiriesC.list);
r.get('/enquiries/:id', auth(), enquiriesC.getOne);
r.post('/enquiries/:id/replies', auth(), v(schemas.reply), enquiriesC.reply);
r.patch('/enquiries/:id/status', auth(), v(schemas.enquiryStatus), enquiriesC.setStatus);

// Stories
r.get('/stories/mine', auth('artisan'), storiesC.mine);
r.post('/stories', auth('artisan'), v(schemas.storyCreate), storiesC.create);
r.get('/stories/:id', auth(), storiesC.getOne);
r.put('/stories/:id', auth('artisan'), v(schemas.storyUpdate, partial), storiesC.update);
r.post(
  '/stories/:id/audio',
  auth('artisan'),
  limits.uploads,
  audioUpload,
  validateAudio,
  storiesC.audio,
);
r.post('/stories/:id/submit', auth('artisan'), storiesC.submit);
r.delete('/stories/:id', auth('artisan', 'admin'), storiesC.remove);

// AI
r.post('/ai/stories/:id/process', auth('artisan'), limits.ai, storiesC.process);

// Review
r.get('/review/queue', auth('reviewer', 'admin'), reviewC.queue);
r.get('/review/:storyId', auth('reviewer', 'admin'), reviewC.getOne);
r.post('/review/:storyId/approve', auth('reviewer', 'admin'), v(schemas.approve), reviewC.approve);
r.post('/review/:storyId/reject', auth('reviewer', 'admin'), v(schemas.reject), reviewC.reject);

// Archive (public)
r.get('/archive', archiveC.list);
r.get('/archive/facets', archiveC.facets);
r.get('/archive/:id', archiveC.getOne);
r.post('/archive/:id/play', limits.play, archiveC.play);

// Apprenticeships
r.get('/apprenticeships', apprenticeshipsC.list);
r.get('/apprenticeships/mine', auth('artisan'), apprenticeshipsC.mine);
r.post('/apprenticeships', auth('artisan'), v(schemas.apprenticeship), apprenticeshipsC.create);
r.get('/apprenticeships/:id', apprenticeshipsC.getOne);
r.put(
  '/apprenticeships/:id',
  auth('artisan'),
  v(schemas.apprenticeshipUpdate, partial),
  apprenticeshipsC.update,
);
r.delete('/apprenticeships/:id', auth('artisan', 'admin'), apprenticeshipsC.remove);
r.get('/apprenticeships/:id/applications', auth('artisan', 'admin'), apprenticeshipsC.applications);

// Applications
r.post('/applications', auth('learner'), v(schemas.application), applicationsC.apply);
r.get('/applications/mine', auth('learner'), applicationsC.mine);
r.patch(
  '/applications/:id/status',
  auth('artisan'),
  v(schemas.applicationStatus),
  applicationsC.setStatus,
);
r.post('/applications/:id/complete', auth('artisan'), applicationsC.complete);
r.patch(
  '/applications/:id/roadmap/:stepId',
  auth('learner'),
  v(schemas.roadmap),
  applicationsC.setStep,
);
r.get('/applications/:id/progress', auth('learner', 'artisan'), applicationsC.progress);
r.post(
  '/applications/:id/progress',
  auth('learner'),
  v(schemas.progress),
  applicationsC.addProgress,
);
r.get('/certificates/:code', applicationsC.certificate);

// Impact
r.get('/impact', impactC.summary);
r.get('/impact/dashboard', auth('admin'), impactC.dashboard);

// Flags and admin
r.post('/flags', auth(), v(schemas.flag), adminC.report);
r.get('/admin/users', auth('admin'), adminC.users);
r.patch('/admin/users/:id/role', auth('admin'), v(schemas.role), adminC.setRole);
r.patch('/admin/users/:id/active', auth('admin'), v(schemas.active), adminC.setActive);
r.get('/admin/flags', auth('admin'), adminC.flags);
r.post('/admin/flags/:id/resolve', auth('admin'), v(schemas.resolveFlag), adminC.resolve);
r.get('/admin/audit', auth('admin'), adminC.audit);

// Uploads
r.post('/uploads/image', auth(), limits.uploads, imageUpload, validateImage, uploadsC.image);

// Demo helpers
r.get('/demo', demoC.status);
r.post('/demo/reset', limits.demo, demoC.reset);

export default r;

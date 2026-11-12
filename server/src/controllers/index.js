// Thin controllers: read the request, call one service function, send the envelope.
import { asyncHandler as h, ok } from '../utils/http.js';
import * as authS from '../services/authService.js';
import * as catalog from '../services/catalogService.js';
import * as enquiriesS from '../services/enquiryService.js';
import * as storiesS from '../services/storyService.js';
import * as learning from '../services/learningService.js';
import * as adminS from '../services/adminService.js';
import { saveImage } from '../services/storage.js';
import { config } from '../config/env.js';
import { seedWorld } from '../seed/seedWorld.js';
import { ROLES, demoEmail } from '../../../shared/constants.js';

export const authC = {
  login: h(async (req, res) => ok(res, await authS.login(req.body))),
  register: h(async (req, res) => ok(res, await authS.register(req.body), 201)),
  me: h(async (req, res) => ok(res, authS.me(req.user))),
  logout: h(async (req, res) => ok(res, await authS.logout(req.user))),
  updateMe: h(async (req, res) => ok(res, await authS.updateMe(req.user, req.body))),
};

export const artisansC = {
  list: h(async (req, res) => ok(res, await catalog.listArtisans(req.query))),
  featured: h(async (_req, res) => ok(res, await catalog.featuredArtisans())),
  mine: h(async (req, res) => ok(res, await catalog.myProfile(req.user))),
  updateMine: h(async (req, res) => ok(res, await catalog.updateMyProfile(req.user, req.body))),
  requestVerification: h(async (req, res) =>
    ok(res, await catalog.requestVerification(req.user, req.body)),
  ),
  getOne: h(async (req, res) => ok(res, await catalog.getArtisan(req.params.id))),
};

export const craftsC = {
  types: h(async (_req, res) => ok(res, catalog.craftTypes())),
  list: h(async (req, res) => ok(res, await catalog.listCrafts(req.query))),
  mine: h(async (req, res) => ok(res, await catalog.myCrafts(req.user))),
  create: h(async (req, res) => ok(res, await catalog.createCraft(req.user, req.body), 201)),
  getOne: h(async (req, res) => ok(res, await catalog.getCraft(req.params.id))),
  update: h(async (req, res) =>
    ok(res, await catalog.updateCraft(req.user, req.params.id, req.body)),
  ),
  remove: h(async (req, res) => ok(res, await catalog.deleteCraft(req.user, req.params.id))),
};

export const enquiriesC = {
  create: h(async (req, res) => ok(res, await enquiriesS.create(req.user, req.body), 201)),
  list: h(async (req, res) => ok(res, await enquiriesS.list(req.user, req.query))),
  getOne: h(async (req, res) => ok(res, await enquiriesS.getOne(req.user, req.params.id))),
  reply: h(async (req, res) =>
    ok(res, await enquiriesS.reply(req.user, req.params.id, req.body), 201),
  ),
  setStatus: h(async (req, res) =>
    ok(res, await enquiriesS.setStatus(req.user, req.params.id, req.body)),
  ),
};

export const storiesC = {
  mine: h(async (req, res) => ok(res, await storiesS.mine(req.user))),
  create: h(async (req, res) => ok(res, await storiesS.create(req.user, req.body), 201)),
  getOne: h(async (req, res) => ok(res, await storiesS.getOne(req.user, req.params.id))),
  update: h(async (req, res) => ok(res, await storiesS.update(req.user, req.params.id, req.body))),
  audio: h(async (req, res) =>
    ok(res, await storiesS.uploadAudio(req.user, req.params.id, req.file, req.body)),
  ),
  submit: h(async (req, res) => ok(res, await storiesS.submit(req.user, req.params.id))),
  remove: h(async (req, res) => ok(res, await storiesS.remove(req.user, req.params.id))),
  process: h(async (req, res) => ok(res, await storiesS.processWithAi(req.user, req.params.id))),
};

export const reviewC = {
  queue: h(async (req, res) => ok(res, await storiesS.queue(req.query))),
  getOne: h(async (req, res) => ok(res, await storiesS.reviewGet(req.params.storyId))),
  approve: h(async (req, res) =>
    ok(res, await storiesS.approve(req.user, req.params.storyId, req.body)),
  ),
  reject: h(async (req, res) =>
    ok(res, await storiesS.reject(req.user, req.params.storyId, req.body)),
  ),
};

export const archiveC = {
  list: h(async (req, res) => ok(res, await storiesS.archiveList(req.query))),
  facets: h(async (_req, res) => ok(res, await storiesS.facets())),
  getOne: h(async (req, res) => ok(res, await storiesS.archiveGet(req.params.id))),
  play: h(async (req, res) => ok(res, await storiesS.play(req.params.id))),
};

export const apprenticeshipsC = {
  list: h(async (req, res) => ok(res, await learning.list(req.query))),
  mine: h(async (req, res) => ok(res, await learning.mine(req.user))),
  create: h(async (req, res) => ok(res, await learning.create(req.user, req.body), 201)),
  getOne: h(async (req, res) => ok(res, await learning.getOne(req.params.id))),
  update: h(async (req, res) => ok(res, await learning.update(req.user, req.params.id, req.body))),
  remove: h(async (req, res) => ok(res, await learning.remove(req.user, req.params.id))),
  applications: h(async (req, res) =>
    ok(res, await learning.applicationsFor(req.user, req.params.id)),
  ),
};

export const applicationsC = {
  apply: h(async (req, res) => ok(res, await learning.apply(req.user, req.body), 201)),
  mine: h(async (req, res) => ok(res, await learning.mineAsLearner(req.user))),
  setStatus: h(async (req, res) =>
    ok(res, await learning.setStatus(req.user, req.params.id, req.body)),
  ),
  complete: h(async (req, res) => ok(res, await learning.complete(req.user, req.params.id))),
  setStep: h(async (req, res) =>
    ok(res, await learning.setStep(req.user, req.params.id, req.params.stepId, req.body)),
  ),
  progress: h(async (req, res) => ok(res, await learning.progress(req.user, req.params.id))),
  addProgress: h(async (req, res) =>
    ok(res, await learning.addProgress(req.user, req.params.id, req.body), 201),
  ),
  certificate: h(async (req, res) => ok(res, await learning.certificate(req.params.code))),
};

export const impactC = {
  summary: h(async (_req, res) => ok(res, await adminS.impact())),
  dashboard: h(async (_req, res) => ok(res, await adminS.dashboard())),
};

export const adminC = {
  report: h(async (req, res) => ok(res, await adminS.report(req.user, req.body), 201)),
  users: h(async (req, res) => ok(res, await adminS.users(req.query))),
  setRole: h(async (req, res) => ok(res, await adminS.setRole(req.user, req.params.id, req.body))),
  setActive: h(async (req, res) =>
    ok(res, await adminS.setActive(req.user, req.params.id, req.body)),
  ),
  flags: h(async (req, res) => ok(res, await adminS.flags(req.query))),
  resolve: h(async (req, res) =>
    ok(res, await adminS.resolveFlag(req.user, req.params.id, req.body)),
  ),
  audit: h(async (req, res) => ok(res, await adminS.auditLog(req.query))),
  verifications: h(async (req, res) => ok(res, await adminS.verifications(req.query))),
  decideVerification: h(async (req, res) =>
    ok(res, await adminS.decideVerification(req.user, req.params.artisanId, req.body)),
  ),
};

export const uploadsC = {
  image: h(async (req, res) => ok(res, { url: await saveImage(req.file.buffer) }, 201)),
};

export const demoC = {
  status: h(async (_req, res) =>
    ok(res, {
      enabled: config.demoMode,
      accounts: config.demoMode ? ROLES.map((role) => ({ role, email: demoEmail(role) })) : [],
    }),
  ),
  reset: h(async (_req, res) => {
    if (!config.demoMode)
      return res.status(404).json({ success: false, message: 'No such endpoint.' });
    await seedWorld({ demoAccounts: true });
    return ok(res, { ok: true });
  }),
};

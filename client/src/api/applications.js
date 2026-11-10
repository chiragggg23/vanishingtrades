import { get, patch, post } from './http.js';

export const apply = (apprenticeshipId, motivation) =>
  post('/applications', { apprenticeshipId, motivation });
export const mine = () => get('/applications/mine');
export const setStatus = (id, status) => patch(`/applications/${id}/status`, { status });
export const complete = (id) => post(`/applications/${id}/complete`);
export const setStep = (id, stepId, done) => patch(`/applications/${id}/roadmap/${stepId}`, { done });
export const progress = (id) => get(`/applications/${id}/progress`);
export const addProgress = (id, body) => post(`/applications/${id}/progress`, body);
export const certificate = (code) => get(`/certificates/${encodeURIComponent(code)}`);

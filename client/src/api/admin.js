import { get, patch, post } from './http.js';

export const users = (params) => get('/admin/users', params);
export const setRole = (id, role) => patch(`/admin/users/${id}/role`, { role });
export const setActive = (id, active) => patch(`/admin/users/${id}/active`, { active });
export const flags = (params) => get('/admin/flags', params);
export const resolveFlag = (id, action) => post(`/admin/flags/${id}/resolve`, { action });
export const audit = (params) => get('/admin/audit', params);
export const report = (body) => post('/flags', body);

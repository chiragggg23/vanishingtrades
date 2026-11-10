import { get, patch, post } from './http.js';

export const create = (body) => post('/enquiries', body);
export const list = (params) => get('/enquiries', params);
export const getOne = (id) => get(`/enquiries/${id}`);
export const reply = (id, message) => post(`/enquiries/${id}/replies`, { message });
export const setStatus = (id, status) => patch(`/enquiries/${id}/status`, { status });

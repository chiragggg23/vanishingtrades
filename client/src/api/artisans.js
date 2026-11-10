import { get, put } from './http.js';

export const list = (params) => get('/artisans', params);
export const featured = () => get('/artisans/featured');
export const mine = () => get('/artisans/me');
export const updateMine = (body) => put('/artisans/me', body);
export const getOne = (id) => get(`/artisans/${id}`);

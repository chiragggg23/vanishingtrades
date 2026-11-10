import { del, get, post, put } from './http.js';

export const list = (params) => get('/apprenticeships', params);
export const mine = () => get('/apprenticeships/mine');
export const create = (body) => post('/apprenticeships', body);
export const getOne = (id) => get(`/apprenticeships/${id}`);
export const update = (id, body) => put(`/apprenticeships/${id}`, body);
export const remove = (id) => del(`/apprenticeships/${id}`);
export const applications = (id) => get(`/apprenticeships/${id}/applications`);

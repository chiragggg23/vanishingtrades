import { del, get, post, put } from './http.js';

export const list = (params) => get('/crafts', params);
export const types = () => get('/craft-types');
export const mine = () => get('/crafts/mine');
export const create = (body) => post('/crafts', body);
export const getOne = (id) => get(`/crafts/${id}`);
export const update = (id, body) => put(`/crafts/${id}`, body);
export const remove = (id) => del(`/crafts/${id}`);

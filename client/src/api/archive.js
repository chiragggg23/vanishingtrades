import { get, post } from './http.js';

export const list = (params) => get('/archive', params);
export const facets = () => get('/archive/facets');
export const getOne = (id) => get(`/archive/${id}`);
export const play = (id) => post(`/archive/${id}/play`);

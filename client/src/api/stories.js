import { del, get, post, put, request } from './http.js';

export const mine = () => get('/stories/mine');
export const create = (body) => post('/stories', body);
export const getOne = (id) => get(`/stories/${id}`);
export const update = (id, body) => put(`/stories/${id}`, body);
export const uploadAudio = (id, file, durationSec) =>
  request('post', `/stories/${id}/audio`, {
    data: { durationSec: Math.max(1, Math.round(durationSec * 10) / 10) },
    files: { audio: file },
  });
export const submit = (id) => post(`/stories/${id}/submit`);
export const remove = (id) => del(`/stories/${id}`);

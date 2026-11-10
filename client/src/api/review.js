import { get, post } from './http.js';

export const queue = (params) => get('/review/queue', params);
export const getOne = (storyId) => get(`/review/${storyId}`);
export const approve = (storyId, body = {}) => post(`/review/${storyId}/approve`, body);
export const reject = (storyId, note) => post(`/review/${storyId}/reject`, { note });

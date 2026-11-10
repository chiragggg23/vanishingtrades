import { post } from './http.js';

export const processStory = (id) => post(`/ai/stories/${id}/process`);

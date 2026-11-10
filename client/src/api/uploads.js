import { request } from './http.js';

export const image = (file) => request('post', '/uploads/image', { files: { image: file } });

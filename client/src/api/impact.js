import { get } from './http.js';

export const summary = () => get('/impact');
export const dashboard = () => get('/impact/dashboard');

import { get, post, tokenStore } from './http.js';

export const status = () => get('/demo');
export async function reset() {
  await post('/demo/reset');
  tokenStore.clear();
}

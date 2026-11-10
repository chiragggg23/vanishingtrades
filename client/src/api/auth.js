import { get, patch, post, tokenStore } from './http.js';

export async function login(email, password) {
  const data = await post('/auth/login', { email, password });
  tokenStore.set(data.token);
  return data.user;
}
export async function register(body) {
  const data = await post('/auth/register', body);
  tokenStore.set(data.token);
  return data.user;
}
export const me = () => get('/auth/me');
export const updateMe = (body) => patch('/auth/me', body);
export async function logout() {
  try {
    await post('/auth/logout');
  } finally {
    tokenStore.clear();
  }
}
export const hasToken = () => Boolean(tokenStore.get());

import { vi } from 'vitest';

// Axios is mocked so the "real backend" branch can be observed without a server.
const axiosRequest = vi.fn();
// Failures are thrown from a plain wrapper, not from the spy, so Vitest does not report the
// rejected value as a test error before the API layer converts it.
let failWith = null;
const request = (config) => {
  axiosRequest(config);
  if (failWith) {
    const e = failWith;
    failWith = null;
    return Promise.reject(e);
  }
  return axiosRequest.mock.results.at(-1).value;
};
vi.mock('axios', () => ({
  default: {
    create: () => ({
      request,
      interceptors: { request: { use: (fn) => (globalThis.__vtInterceptor = fn) } },
    }),
  },
}));

const api = await import('../api/index.js');

describe('API layer mock switch', () => {
  beforeEach(() => axiosRequest.mockClear());

  it('answers from the in-browser mock when __VT_MOCK__ is true', async () => {
    const page = await api.crafts.list({ limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.pagination).toEqual({ page: 1, limit: 2, total: 24, totalPages: 12 });
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  it('calls the real API through Axios and unwraps the envelope when __VT_MOCK__ is false', async () => {
    vi.stubGlobal('__VT_MOCK__', false);
    axiosRequest.mockResolvedValue({
      status: 200,
      data: { success: true, data: [{ key: 'pottery' }] },
    });
    const out = await api.crafts.types();
    expect(out).toEqual([{ key: 'pottery' }]);
    expect(axiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'get', url: '/craft-types' }),
    );
  });

  it('turns API failures into one ApiError with status and field errors', async () => {
    vi.stubGlobal('__VT_MOCK__', false);
    failWith = {
      response: {
        status: 422,
        data: {
          success: false,
          message: 'Please check the highlighted fields.',
          errors: { title: 'Too short' },
        },
      },
    };
    const err = await api.stories.create({ title: 'x' }).catch((e) => e);
    expect(err).toBeInstanceOf(api.ApiError);
    expect(err).toMatchObject({ status: 422, errors: { title: 'Too short' } });
  });

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('__VT_MOCK__', false);
    failWith = new Error('Network Error');
    const err = await api.archive.list().catch((e) => e);
    expect(err).toBeInstanceOf(api.ApiError);
    expect(err.status).toBe(0);
  });

  it('adds the bearer token through the request interceptor', async () => {
    vi.stubGlobal('__VT_MOCK__', false);
    axiosRequest.mockResolvedValue({ status: 200, data: { success: true, data: {} } });
    await api.impact.summary(); // creates the Axios client and registers the interceptor
    api.tokenStore.set('abc');
    expect(typeof globalThis.__vtInterceptor).toBe('function');
    const config = globalThis.__vtInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc');
  });

  it('mock errors use the same envelope as the server (422 with field errors)', async () => {
    const err = await api.auth.login('nobody', '').catch((e) => e);
    expect(err.status).toBe(422);
    expect(Object.keys(err.errors)).toEqual(['email', 'password']);
  });
});

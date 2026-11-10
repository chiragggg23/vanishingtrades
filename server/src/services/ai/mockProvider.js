import { mockProcess } from '../../../../shared/mockAi.js';

/** Deterministic sample provider (always isSample: true). Same code as the browser mock. */
export const mockProvider = {
  name: 'mock',
  async process(story) {
    return mockProcess(story);
  },
};

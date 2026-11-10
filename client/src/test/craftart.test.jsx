import { render } from '@testing-library/react';
import CraftArt from '../components/art/CraftArt.jsx';

const LAMP_STAND = 'M86 128 L80 160 H120 L114 128Z';
// Each render gets its own React useId for the halftone pattern; ignore it when comparing.
const svgOf = (props) =>
  render(<CraftArt {...props} />).container.innerHTML.replace(/ht[^"')]+/g, 'ht-id');

describe('CraftArt', () => {
  it('draws what the piece is called, whatever the seed', () => {
    for (const seed of ['work-1', 'work-24', 'abc', 'zz9']) {
      expect(svgOf({ craftType: 'pottery', seed, hint: 'Festival lamp stand' })).toContain(
        LAMP_STAND,
      );
      expect(svgOf({ craftType: 'pottery', seed, hint: 'Curd pots, set of three' })).not.toContain(
        LAMP_STAND,
      );
    }
  });
  it('is stable for the same seed and decorative unless titled', () => {
    const a = svgOf({ craftType: 'kinhal', seed: 'x' });
    expect(svgOf({ craftType: 'kinhal', seed: 'x' })).toBe(a);
    expect(a).toContain('aria-hidden="true"');
    expect(svgOf({ craftType: 'kinhal', seed: 'x', title: 'A parrot' })).toContain('role="img"');
  });
});

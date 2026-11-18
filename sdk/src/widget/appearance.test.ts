import { afterEach, describe, expect, it, vi } from 'vitest';
import { appearanceStyles, luminanceOf, resolveAppearance } from './appearance';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveAppearance', () => {
  it('fills in the defaults', () => {
    expect(resolveAppearance()).toEqual({
      launcher: 'pill',
      launcherText: null,
      position: 'bottom-right',
      corners: 'soft',
      offsetX: 24,
      offsetY: 24,
      accentLight: null,
      accentDark: null,
    });
  });

  it('gives a light accent dark text and a dark accent white text', () => {
    const appearance = resolveAppearance({ accentColor: { light: '#1C1B18', dark: '#c8e66b' } });

    expect(appearance.accentLight).toEqual({ color: '#1c1b18', onColor: '#ffffff' });
    expect(appearance.accentDark).toEqual({ color: '#c8e66b', onColor: '#1c1b18' });
  });

  it('uses one accent for both themes and expands short hex colours', () => {
    const appearance = resolveAppearance({ accentColor: '#0a7' });

    expect(appearance.accentLight?.color).toBe('#00aa77');
    expect(appearance.accentDark?.color).toBe('#00aa77');
  });

  it('falls back to the defaults on wrong values instead of failing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const appearance = resolveAppearance({
      launcher: 'balloon' as never,
      corners: 'pointy' as never,
      accentColor: 'tomato',
      offset: { x: -5, y: 1000 },
      launcherText: '   ',
    });

    expect(appearance).toMatchObject({ launcher: 'pill', corners: 'soft', accentLight: null, offsetX: 24, offsetY: 24, launcherText: null });
    expect(warn).toHaveBeenCalledTimes(5);
  });
});

describe('appearanceStyles', () => {
  it('sets the radii and offsets, and the accent for both themes', () => {
    const css = appearanceStyles(resolveAppearance({ corners: 'round', offset: { x: 16 }, accentColor: '#4447c9' }));

    expect(css).toContain('--lab-radius-launcher:999px');
    expect(css).toContain('--lab-offset-x:16px');
    expect(css).toContain("--lab-primary:#4447c9");
    expect(css).toContain(":host([data-theme='dark'])");
    expect(css).toContain(":host([data-theme='system'])");
  });

  it('leaves the theme accents alone when the site sets none', () => {
    expect(appearanceStyles(resolveAppearance())).not.toContain('--lab-primary');
  });
});

describe('luminanceOf', () => {
  it('runs from black to white', () => {
    expect(luminanceOf('#000000')).toBe(0);
    expect(luminanceOf('#ffffff')).toBeCloseTo(1);
  });
});

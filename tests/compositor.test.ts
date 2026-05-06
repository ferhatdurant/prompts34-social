import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  composeInstagramPoster,
  fitTitleLayout,
  normalizeDisplayTitle,
} from '../src/compositor.js';

describe('instagram compositor', () => {
  it('wraps long titles into a bounded multi-line layout', () => {
    const layout = fitTitleLayout(
      'ATS Uyumlu CV İyileştirme ve LinkedIn Profil Güçlendirme İçin Profesyonel Başvuru Promptu',
    );

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.length).toBeLessThanOrEqual(4);
    expect(layout.fontSize).toBeGreaterThanOrEqual(38);
    expect(layout.fontSize).toBeLessThanOrEqual(64);
    expect(layout.lines.join(' ')).toContain('LinkedIn');
  });

  it('truncates extremely long titles cleanly when needed', () => {
    const layout = fitTitleLayout(
      'Bu oldukca uzun bir prompt basligi ve cok fazla detay icerdigi icin tek gorselde duzgun sekilde gosterilmesi gerekir ve tasarim alaninin disina kesinlikle tasmamasi gerekir',
    );

    expect(layout.lines.length).toBeLessThanOrEqual(4);
    expect(layout.lines[layout.lines.length - 1]?.length).toBeGreaterThan(0);
  });

  it('removes hyphen separators from the displayed title', () => {
    expect(
      normalizeDisplayTitle(
        'Yeni Özellik Uygulama Planı - Senior Backend Engineer Prompt',
      ),
    ).toBe('Yeni Özellik Uygulama Planı Senior Backend Engineer Prompt');
  });

  it('renders a full square poster without changing the output dimensions', async () => {
    const background = await sharp({
      create: {
        width: 1080,
        height: 1080,
        channels: 3,
        background: { r: 24, g: 36, b: 92 },
      },
    })
      .png()
      .toBuffer();

    const poster = await composeInstagramPoster(
      background,
      'ATS Uyumlu CV İyileştirme ve LinkedIn Profil Güçlendirme İçin Profesyonel Başvuru Promptu',
    );
    const metadata = await sharp(poster).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1080);
    expect(metadata.format).toBe('png');
  });
});

import sharp from 'sharp';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function splitTitle(title: string): string[] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 3) {
    return [title];
  }

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

export async function composeInstagramPoster(
  backgroundBytes: Buffer,
  title: string,
): Promise<Buffer> {
  const canvasWidth = 1080;
  const canvasHeight = 1080;
  const headline = 'Günün Promptu';
  const titleLines = splitTitle(title);
  const titleTspans = titleLines
    .map(
      (line, index) =>
        `<tspan x="540" dy="${index === 0 ? 0 : 74}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  const overlay = `
    <svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(5,16,44,0.18)" />
          <stop offset="35%" stop-color="rgba(7,20,58,0.34)" />
          <stop offset="100%" stop-color="rgba(6,18,54,0.70)" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#031126" flood-opacity="0.45" />
        </filter>
      </defs>
      <rect width="1080" height="1080" fill="url(#fade)" />
      <text x="540" y="340" text-anchor="middle" fill="#F5F7FB" font-size="82" font-weight="800" font-family="Inter, Arial, sans-serif" filter="url(#shadow)">
        ${escapeXml(headline)}
      </text>
      <text x="540" y="470" text-anchor="middle" fill="#49F3F6" font-size="64" font-weight="800" font-family="Inter, Arial, sans-serif" filter="url(#shadow)">
        ${titleTspans}
      </text>
      <text x="540" y="1010" text-anchor="middle" fill="#FFFFFF" font-size="34" font-weight="700" font-family="Inter, Arial, sans-serif">
        Prompts34
      </text>
    </svg>
  `;

  return sharp(backgroundBytes)
    .resize(canvasWidth, canvasHeight, { fit: 'cover' })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

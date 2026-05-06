import sharp from 'sharp';

const CANVAS_SIZE = 1080;
const TITLE_BOX_WIDTH = 820;
const TITLE_BOX_HEIGHT = 320;
const TITLE_BOX_CENTER_X = CANVAS_SIZE / 2;
const TITLE_BOX_CENTER_Y = 560;
const TITLE_MAX_LINES = 4;
const TITLE_MAX_FONT_SIZE = 64;
const TITLE_MIN_FONT_SIZE = 38;
const TITLE_LINE_HEIGHT_RATIO = 1.16;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function estimateCharacterWidth(character: string): number {
  if ('ilIıjtf'.includes(character)) return 0.38;
  if ('mwMW@%&QGÖÜŞÇ'.includes(character)) return 0.94;
  if (' -'.includes(character)) return 0.3;
  if ('.,:;!|'.includes(character)) return 0.24;
  if ('()[]{}"\'`'.includes(character)) return 0.34;
  if ('0123456789'.includes(character)) return 0.56;
  return 0.62;
}

function estimateLineWidth(line: string, fontSize: number): number {
  let width = 0;
  for (const character of line) {
    width += estimateCharacterWidth(character) * fontSize;
  }
  return width;
}

function wrapWords(words: string[], fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (
      currentLine &&
      estimateLineWidth(nextLine, fontSize) > maxWidth
    ) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }
    currentLine = nextLine;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function trimLineToWidth(line: string, fontSize: number, maxWidth: number): string {
  if (estimateLineWidth(line, fontSize) <= maxWidth) {
    return line;
  }

  const ellipsis = '…';
  let trimmed = line.trim();

  while (trimmed.length > 1) {
    trimmed = trimmed.slice(0, -1).trimEnd();
    const candidate = `${trimmed}${ellipsis}`;
    if (estimateLineWidth(candidate, fontSize) <= maxWidth) {
      return candidate;
    }
  }

  return ellipsis;
}

export interface TitleLayout {
  fontSize: number;
  lineHeight: number;
  lines: string[];
}

export function normalizeDisplayTitle(title: string): string {
  return title.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

export function fitTitleLayout(title: string): TitleLayout {
  const normalizedTitle = normalizeDisplayTitle(title);
  const words = normalizedTitle.split(' ').filter(Boolean);

  for (
    let fontSize = TITLE_MAX_FONT_SIZE;
    fontSize >= TITLE_MIN_FONT_SIZE;
    fontSize -= 2
  ) {
    const lineHeight = Math.round(fontSize * TITLE_LINE_HEIGHT_RATIO);
    const lines = wrapWords(words, fontSize, TITLE_BOX_WIDTH);
    const totalHeight = lines.length * lineHeight;
    const widestLine = Math.max(
      ...lines.map((line) => estimateLineWidth(line, fontSize)),
      0,
    );

    if (
      lines.length <= TITLE_MAX_LINES &&
      totalHeight <= TITLE_BOX_HEIGHT &&
      widestLine <= TITLE_BOX_WIDTH
    ) {
      return { fontSize, lineHeight, lines };
    }
  }

  const fontSize = TITLE_MIN_FONT_SIZE;
  const lineHeight = Math.round(fontSize * TITLE_LINE_HEIGHT_RATIO);
  const wrapped = wrapWords(words, fontSize, TITLE_BOX_WIDTH);
  const lines = wrapped.slice(0, TITLE_MAX_LINES);

  if (lines.length === 0) {
    return { fontSize, lineHeight, lines: [normalizedTitle] };
  }

  if (wrapped.length > TITLE_MAX_LINES) {
    lines[TITLE_MAX_LINES - 1] = trimLineToWidth(
      lines[TITLE_MAX_LINES - 1],
      fontSize,
      TITLE_BOX_WIDTH,
    );
  } else {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = trimLineToWidth(lines[lastIndex], fontSize, TITLE_BOX_WIDTH);
  }

  return { fontSize, lineHeight, lines };
}

function buildTitleTspans(lines: string[]): string {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${TITLE_BOX_CENTER_X}" dy="${index === 0 ? 0 : 1}em">${escapeXml(line)}</tspan>`,
    )
    .join('');
}

export async function composeInstagramPoster(
  backgroundBytes: Buffer,
  title: string,
): Promise<Buffer> {
  const headline = 'Günün Promptu';
  const layout = fitTitleLayout(title);
  const titleBlockHeight = layout.lines.length * layout.lineHeight;
  const firstBaselineY =
    TITLE_BOX_CENTER_Y - titleBlockHeight / 2 + layout.fontSize * 0.84;

  const overlay = `
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(5,16,44,0.18)" />
          <stop offset="35%" stop-color="rgba(7,20,58,0.34)" />
          <stop offset="100%" stop-color="rgba(6,18,54,0.70)" />
        </linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(4,12,30,0.48)" />
          <stop offset="100%" stop-color="rgba(6,18,54,0.58)" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#031126" flood-opacity="0.45" />
        </filter>
      </defs>
      <rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="url(#fade)" />
      <rect x="110" y="210" width="860" height="470" rx="42" fill="url(#panel)" />
      <text x="${TITLE_BOX_CENTER_X}" y="340" text-anchor="middle" fill="#F5F7FB" font-size="82" font-weight="800" font-family="Inter, Arial, sans-serif" filter="url(#shadow)">
        ${escapeXml(headline)}
      </text>
      <text
        x="${TITLE_BOX_CENTER_X}"
        y="${firstBaselineY}"
        text-anchor="middle"
        fill="#49F3F6"
        font-size="${layout.fontSize}"
        font-weight="800"
        font-family="Inter, Arial, sans-serif"
        filter="url(#shadow)"
      >
        ${buildTitleTspans(layout.lines)}
      </text>
      <text x="${TITLE_BOX_CENTER_X}" y="1010" text-anchor="middle" fill="#FFFFFF" font-size="34" font-weight="700" font-family="Inter, Arial, sans-serif">
        Prompts34
      </text>
    </svg>
  `;

  return sharp(backgroundBytes)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: 'cover', position: 'centre' })
    .png()
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

// Genera los PNG del ícono desde static/icon.svg. Uso: node scripts/icons.mjs
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const svg = await readFile('static/icon.svg', 'utf8');
await mkdir('static/icons', { recursive: true });

for (const size of [192, 512]) {
	await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`static/icons/icon-${size}.png`);
}

// Maskable: contenido al 75% centrado, fondo a sangre para la zona segura
const bg = '<rect width="512" height="512" fill="#000"/>';
const inner = svg.replace(bg, '').replace(/<svg[^>]*>/, '').replace('</svg>', '');
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}<g transform="translate(64 64) scale(.75)">${inner}</g></svg>`;
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile('static/icons/icon-maskable-512.png');

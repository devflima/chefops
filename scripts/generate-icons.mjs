import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgBuffer = readFileSync(join(__dirname, '../public/icons/icon.svg'))

await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(join(__dirname, '../public/icons/icon-192.png'))

await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(join(__dirname, '../public/icons/icon-512.png'))

console.log('✓ Ícones gerados: icon-192.png e icon-512.png')
import fs from 'node:fs/promises'
import path from 'node:path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const pdfPath =
  process.argv[2] ?? path.resolve('eye-academy-glaucoma-angle-closure-note.pdf')
const outPath = path.resolve('src/data/glaucoma-reference-pages.json')

const data = new Uint8Array(await fs.readFile(pdfPath))
const pdf = await pdfjsLib.getDocument({ data }).promise

const pages = []

for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  const page = await pdf.getPage(pageNum)
  const content = await page.getTextContent()

  const text = content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  pages.push({ page: pageNum, text })
}

await fs.mkdir(path.dirname(outPath), { recursive: true })
await fs.writeFile(outPath, JSON.stringify(pages, null, 2) + '\n', 'utf8')

console.log(`Extracted ${pages.length} pages -> ${outPath}`)

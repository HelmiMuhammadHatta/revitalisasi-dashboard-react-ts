import fs from 'fs'

const CONFIG = {
  nameFields: ['nama', 'NAME_1', 'Provinsi', 'PROVINSI', 'propinsi', 'province', 'name', 'provinsi']
}

function norm(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .trim()
}

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

function findName(props) {
  for (const k of CONFIG.nameFields) {
    if (props && props[k] != null && String(props[k]).length) return String(props[k])
  }
  return null
}

function main() {
  const [,, inPath, outPath] = process.argv
  if (!inPath || !outPath) {
    console.error('Usage: node augment-geojson.js input.geojson output.json')
    process.exit(1)
  }

  const src = loadJSON(inPath)
  const map = new Map()
  const codes = loadJSON('./province_codes.json')
  for (const r of codes) map.set(norm(r.nama), Number(r.kode_pro))

  const notFound = []
  const out = { type: 'FeatureCollection', features: [] }

  for (const f of src.features || []) {
    const originalName = findName(f.properties) || ''
    const key = norm(originalName)
    const kode = map.get(key)
    if (!kode) {
      notFound.push(originalName)
      continue
    }
    const namaStandar = codes.find(x => Number(x.kode_pro) === Number(kode))?.nama || originalName
    const props = { ...(f.properties || {}), kode_pro: kode, nama: namaStandar }
    out.features.push({ type: 'Feature', properties: props, geometry: f.geometry })
  }

  fs.writeFileSync(outPath, JSON.stringify(out))
  console.log(`DONE. Saved to ${outPath}. Matched features: ${out.features.length}`)
  if (notFound.length) {
    console.warn('Tidak cocok (perlu dicek manual):')
    for (const n of notFound) console.warn(' -', n)
  }
}

main()

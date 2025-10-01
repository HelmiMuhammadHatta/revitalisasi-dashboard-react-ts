import { Router } from 'express'
import { pool } from '../lib/db.js'
export const router = Router()

// Provinces list
router.get('/provinces', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT kode_pro, provinsi AS nama FROM v_provinces ORDER BY kode_pro')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// National summary (cards)
router.get('/summary/national', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v_summary_nasional')
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Province summary (cards)
router.get('/summary/province/:kode_pro', async (req, res) => {
  const { kode_pro } = req.params
  try {
    const [rows] = await pool.query('SELECT * FROM v_summary_provinsi WHERE kode_pro = ?', [kode_pro])
    if (!rows.length) return res.status(404).json({ error: 'Provinsi tidak ditemukan' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Donut data (anggaran per jenjang) -> array siap pakai
router.get('/chart/donut', async (req, res) => {
  const { kode_pro } = req.query
  try {
    if (kode_pro && kode_pro !== 'all') {
      const [rows] = await pool.query('SELECT paud, sd, smp, sma FROM v_donut_per_prov WHERE kode_pro = ?', [kode_pro])
      const r = rows[0] || { paud: 0, sd: 0, smp: 0, sma: 0 }
      return res.json([
        { name:'PAUD', value: Number(r.paud)||0 },
        { name:'SD',   value: Number(r.sd)||0 },
        { name:'SMP',  value: Number(r.smp)||0 },
        { name:'SMA',  value: Number(r.sma)||0 },
      ])
    }
    const [rows] = await pool.query('SELECT SUM(paud) AS paud, SUM(sd) AS sd, SUM(smp) AS smp, SUM(sma) AS sma FROM v_donut_per_prov')
    const n = rows[0] || { paud: 0, sd: 0, smp: 0, sma: 0 }
    res.json([
      { name:'PAUD', value: Number(n.paud)||0 },
      { name:'SD',   value: Number(n.sd)||0 },
      { name:'SMP',  value: Number(n.smp)||0 },
      { name:'SMA',  value: Number(n.sma)||0 },
    ])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Table data (rekap per provinsi, unpivot per jenjang)
router.get('/table/rekap', async (req, res) => {
  const { kode_pro } = req.query
  try {
    if (kode_pro && kode_pro !== 'all') {
      const [rows] = await pool.query(`
        SELECT provinsi, 'PAUD' AS jenjang, total_paud AS jumlah, total_anggaran_paud AS anggaran FROM v_summary_provinsi WHERE kode_pro = ?
        UNION ALL
        SELECT provinsi, 'SD', total_sd, total_anggaran_sd FROM v_summary_provinsi WHERE kode_pro = ?
        UNION ALL
        SELECT provinsi, 'SMP', total_smp, total_anggaran_smp FROM v_summary_provinsi WHERE kode_pro = ?
        UNION ALL
        SELECT provinsi, 'SMA', total_sma, total_anggaran_sma FROM v_summary_provinsi WHERE kode_pro = ?
      `, [kode_pro, kode_pro, kode_pro, kode_pro])
      return res.json(rows)
    }
    const [rows] = await pool.query(`
      SELECT provinsi, 'PAUD' AS jenjang, total_paud AS jumlah, total_anggaran_paud AS anggaran FROM v_summary_provinsi
      UNION ALL
      SELECT provinsi, 'SD', total_sd, total_anggaran_sd FROM v_summary_provinsi
      UNION ALL
      SELECT provinsi, 'SMP', total_smp, total_anggaran_smp FROM v_summary_provinsi
      UNION ALL
      SELECT provinsi, 'SMA', total_sma, total_anggaran_sma FROM v_summary_provinsi
      ORDER BY provinsi, FIELD(jenjang,'PAUD','SD','SMP','SMA')
    `)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Bar+Line per provinsi (nasional)
router.get('/chart/barline', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT provinsi, total_sekolah, total_anggaran
      FROM v_summary_provinsi
      ORDER BY total_sekolah DESC, provinsi ASC
    `)
    const data = rows.map(r => ({
      provinsi: r.provinsi,
      total_sekolah: Number(r.total_sekolah) || 0,
      total_anggaran: Number(r.total_anggaran) || 0,
    }))
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// District list by province
router.get('/districts', async (req, res) => {
  const { kode_pro } = req.query
  if (!kode_pro) return res.status(400).json({ error: 'kode_pro wajib' })
  try {
    const [rows] = await pool.query(`
      SELECT kode_kab, nama_wilayah AS nama, jenis
      FROM wilayah
      WHERE kode_pro = ?
      ORDER BY nama_wilayah
    `, [kode_pro])
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Jenjang data per district (Soal 3)
router.get('/district/:kode_kab/jenjang', async (req, res) => {
  const { kode_kab } = req.params
  try {
    const [rows] = await pool.query(`
      SELECT w.*, p.nama_provinsi AS provinsi
      FROM wilayah w
      JOIN provinsi p ON p.kode_pro = w.kode_pro
      WHERE w.kode_kab = ?
      LIMIT 1
    `, [kode_kab])
    if (!rows.length) return res.status(404).json({ error: 'Wilayah tidak ditemukan' })
    const r = rows[0]
    const counts = [
      { name:'PAUD', value: Number(r.jml_rev_paud)||0 },
      { name:'SD',   value: Number(r.jml_rev_sd)||0 },
      { name:'SMP',  value: Number(r.jml_rev_smp)||0 },
      { name:'SMA',  value: Number(r.jml_rev_sma)||0 },
    ]
    const budgets = [
      { name:'PAUD', value: Number(r.anggaran_rev_paud)||0 },
      { name:'SD',   value: Number(r.anggaran_rev_sd)||0 },
      { name:'SMP',  value: Number(r.anggaran_rev_smp)||0 },
      { name:'SMA',  value: Number(r.anggaran_rev_sma)||0 },
    ]
    const composed = [
      { jenjang:'PAUD', anggaran:Number(r.anggaran_rev_paud)||0, jumlah:Number(r.jml_rev_paud)||0 },
      { jenjang:'SD',   anggaran:Number(r.anggaran_rev_sd)||0,   jumlah:Number(r.jml_rev_sd)||0 },
      { jenjang:'SMP',  anggaran:Number(r.anggaran_rev_smp)||0,  jumlah:Number(r.jml_rev_smp)||0 },
      { jenjang:'SMA',  anggaran:Number(r.anggaran_rev_sma)||0,  jumlah:Number(r.jml_rev_sma)||0 },
    ]
    res.json({ meta:{ provinsi:r.provinsi, kabupaten:r.nama_wilayah, jenis:r.jenis }, counts, budgets, composed })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

# Backend v5 – Revitalisasi
Endpoint:
- /api/provinces
- /api/summary/national
- /api/summary/province/:kode_pro
- /api/chart/donut?kode_pro=all|31         (array siap pakai)
- /api/table/rekap?kode_pro=all|31
- /api/chart/barline                        (nasional per provinsi)
- /api/districts?kode_pro=<KODE_PRO>       (daftar kab/kota)
- /api/district/:kode_kab/jenjang          (Soal 3 — per kab/kota)

Jalankan:
npm install
cp .env.example .env
npm run dev

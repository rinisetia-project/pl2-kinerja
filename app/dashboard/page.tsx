import { supabasePublic } from '@/lib/supabase'

const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
const num = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0)
const pct = (n: number) => `${((n || 0) * 100).toFixed(1)}%`

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const db = supabasePublic()
  const [{ data: master = [] }, { data: kinerja = [] }, { data: formasi = [] }, { data: kanwil = [] }, { data: inactive = [] }] = await Promise.all([
    db.from('pl2_master').select('id,nama,kanwil,status,wilayah_jabatan').eq('status', 'Aktif').order('nama'),
    db.from('pl2_kinerja').select('pl2_id,nama,kanwil,pokok,pnbp,frekuensi,lot,produktif').eq('period', '2026-07').order('pokok', { ascending: false }),
    db.from('pl2_formasi').select('kanwil,formasi,aktif,period').eq('period', '2026-07').order('kanwil'),
    db.from('pl2_kinerja_kanwil_live').select('*').eq('period', '2026-07').order('capaian_pokok', { ascending: false }),
    db.from('pl2_kinerja_inactive').select('nama,kanwil,pokok,pnbp,frekuensi,lot,status,keterangan').eq('period', '2026-07').order('nama')
  ])

  const byId = new Map((kinerja as any[]).map(r => [r.pl2_id, r]))
  const individual = (master as any[]).map(m => byId.get(m.id) ? { ...m, ...byId.get(m.id), hasData: true } : { ...m, pokok: 0, pnbp: 0, frekuensi: 0, lot: 0, produktif: 0, hasData: false })
  const total = individual.reduce((a, r) => ({ pokok: a.pokok + (+r.pokok || 0), pnbp: a.pnbp + (+r.pnbp || 0), frekuensi: a.frekuensi + (+r.frekuensi || 0), lot: a.lot + (+r.lot || 0) }), { pokok: 0, pnbp: 0, frekuensi: 0, lot: 0 })
  const targetPokok = (kanwil as any[]).reduce((s, r) => s + (+r.target_pokok || 0), 0)
  const targetPnbp = (kanwil as any[]).reduce((s, r) => s + (+r.target_pnbp || 0), 0)

  return <main className="wrap">
    <section className="hero"><h1>Executive Dashboard — Pejabat Lelang Kelas II</h1><p>Data live Supabase · Kinerja Juli 2026 · Master aktif per 25 Agustus 2026</p></section>
    <nav className="nav"><a href="/">Beranda</a><a href="/admin">Admin / Update Data</a></nav>

    <section className="grid">
      <div className="card kpi"><span>PL-II Aktif</span><b>{num(master.length)}</b><small className="muted">per 25 Agustus 2026</small></div>
      <div className="card kpi"><span>Ada Capaian</span><b>{num(individual.filter(r => r.hasData).length)}</b><small className="muted">dari {num(master.length)} aktif</small></div>
      <div className="card kpi"><span>Nihil</span><b>{num(individual.filter(r => !r.hasData).length)}</b><small className="muted">tanpa data kinerja Juli</small></div>
      <div className="card kpi"><span>Total Pokok</span><b>{rupiah(total.pokok)}</b><small className="muted">Target {rupiah(targetPokok)}</small></div>
      <div className="card kpi"><span>Total PNBP</span><b>{rupiah(total.pnbp)}</b><small className="muted">Target {rupiah(targetPnbp)}</small></div>
    </section>

    <section className="card section"><h2>Kinerja Agregat per Kanwil</h2><p className="muted">Realisasi = SUM kinerja PL-II individual. Capaian = realisasi ÷ target Kanwil. Angka berubah otomatis saat data individual berubah.</p>
      <div className="table"><table><thead><tr><th>#</th><th>Kanwil</th><th>PL-II</th><th>Target Pokok</th><th>Realisasi Pokok</th><th>Capaian</th><th>PNBP</th><th>Frek.</th><th>Lot</th></tr></thead>
      <tbody>{(kanwil as any[]).map((r,i)=><tr key={r.kanwil}><td>{i+1}</td><td><b>{r.kanwil}</b></td><td>{num(+r.jumlah_pl2)}</td><td>{rupiah(+r.target_pokok)}</td><td>{rupiah(+r.realisasi_pokok)}</td><td>{pct(+r.capaian_pokok)}</td><td>{rupiah(+r.realisasi_pnbp)}</td><td>{num(+r.frekuensi)}</td><td>{num(+r.lot)}</td></tr>)}</tbody></table></div>
    </section>

    <section className="card section"><h2>Kinerja Individual PL-II — Juli 2026</h2><div className="table"><table><thead><tr><th>#</th><th>Pejabat</th><th>Kanwil</th><th>Wilayah Jabatan</th><th>Pokok</th><th>PNBP</th><th>Frek.</th><th>Lot</th><th>Status</th></tr></thead>
      <tbody>{individual.map((r,i)=><tr key={r.id}><td>{i+1}</td><td><b>{r.nama}</b></td><td>{r.kanwil || '-'}</td><td>{r.wilayah_jabatan || '-'}</td><td>{rupiah(+r.pokok)}</td><td>{rupiah(+r.pnbp)}</td><td>{num(+r.frekuensi)}</td><td>{num(+r.lot)}</td><td>{r.hasData ? 'Ada capaian' : 'Nihil'}</td></tr>)}</tbody></table></div>
    </section>

    {inactive.length > 0 && <section className="card section"><h2>Data Kinerja — Tidak Tercantum sebagai PL-II Aktif</h2><p className="muted">Data tetap ditampilkan dan tidak dibuang.</p><div className="table"><table><thead><tr><th>Pejabat</th><th>Kanwil</th><th>Pokok</th><th>PNBP</th><th>Frek.</th><th>Lot</th><th>Keterangan</th></tr></thead><tbody>{(inactive as any[]).map(r=><tr key={r.nama}><td>{r.nama}</td><td>{r.kanwil}</td><td>{rupiah(+r.pokok)}</td><td>{rupiah(+r.pnbp)}</td><td>{num(+r.frekuensi)}</td><td>{num(+r.lot)}</td><td>{r.keterangan}</td></tr>)}</tbody></table></div></section>}

    <section className="card section"><h2>Formasi PL-II</h2><div className="table"><table><thead><tr><th>Lokasi</th><th>Formasi</th><th>Aktif</th><th>Gap</th></tr></thead><tbody>{(formasi as any[]).map(r=><tr key={r.kanwil}><td>{r.kanwil}</td><td>{num(+r.formasi)}</td><td>{num(+r.aktif)}</td><td>{num((+r.aktif || 0)-(+r.formasi || 0))}</td></tr>)}</tbody></table></div></section>
  </main>
}

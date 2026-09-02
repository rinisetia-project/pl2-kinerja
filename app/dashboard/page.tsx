'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabasePublic } from '@/lib/supabase'
import seed from '@/data/dashboard_v8_seed.json'

const rupiah = (n:number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0)
const num = (n:number) => new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(n)||0)
const pct = (n:number) => `${((Number(n)||0)*100).toFixed(1)}%`
const shortRp = (n:number) => { const x=Number(n)||0; if(x>=1e12)return `Rp${(x/1e12).toFixed(2)} T`; if(x>=1e9)return `Rp${(x/1e9).toFixed(2)} M`; if(x>=1e6)return `Rp${(x/1e6).toFixed(1)} Jt`; return rupiah(x) }

type Row = any

type SortKey = 'pokok'|'pnbp'|'frekuensi'|'lot'

export default function Dashboard(){
  const [master,setMaster]=useState<Row[]>([])
  const [kinerja,setKinerja]=useState<Row[]>([])
  const [targets,setTargets]=useState<Row[]>([])
  const [inactive,setInactive]=useState<Row[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [kanwilFilter,setKanwilFilter]=useState('ALL')
  const [metric,setMetric]=useState<SortKey>('pokok')
  const [status,setStatus]=useState('Aktif')
  const [search,setSearch]=useState('')
  const [channelYear,setChannelYear]=useState<'2025'|'2024'>('2025')
  const [kanwilMetric,setKanwilMetric]=useState<'pokok'|'pnbp'|'produktif'>('pokok')
  const [histSort,setHistSort]=useState<'pokok2025'|'pnbp2025'|'frekuensi2025'|'lot2025'>('pokok2025')
  const [histDesc,setHistDesc]=useState(true)

  useEffect(()=>{
    let alive=true
    ;(async()=>{
      setLoading(true)
      const db=supabasePublic()
      const [m,k,t,i]=await Promise.all([
        db.from('pl2_master').select('id,nama,kanwil,status,wilayah_jabatan,deals').order('nama'),
        db.from('pl2_kinerja').select('pl2_id,nama,kanwil,pokok,pnbp,frekuensi,lot,produktif').eq('period','2026-07').order('pokok',{ascending:false}),
        db.from('pl2_target_kanwil').select('kanwil,period,target_pokok,target_pnbp').eq('period','2026-07').order('kanwil'),
        db.from('pl2_kinerja_inactive').select('nama,kanwil,pokok,pnbp,frekuensi,lot,status,keterangan').eq('period','2026-07').order('nama')
      ])
      if(!alive)return
      const errs=[m.error,k.error,t.error,i.error].filter(Boolean)
      if(errs.length) setError(errs.map((e:any)=>e.message).join(' | '))
      setMaster(m.data||[]); setKinerja(k.data||[]); setTargets(t.data||[]); setInactive(i.data||[]); setLoading(false)
    })()
    return()=>{alive=false}
  },[])

  const byId=useMemo(()=>new Map(kinerja.map(r=>[r.pl2_id,r])),[kinerja])
  const individual=useMemo(()=>master.map(m=>({ ...m, ...(byId.get(m.id)||{}), hasData:byId.has(m.id), pokok:Number(byId.get(m.id)?.pokok)||0, pnbp:Number(byId.get(m.id)?.pnbp)||0, frekuensi:Number(byId.get(m.id)?.frekuensi)||0, lot:Number(byId.get(m.id)?.lot)||0, produktif:Number(byId.get(m.id)?.produktif)||0 })),[master,byId])
  const filtered=useMemo(()=>individual.filter(r=>(status==='ALL'||r.status===status)&&(!search||String(r.nama).toLowerCase().includes(search.toLowerCase()))&&(!kanwilFilter||kanwilFilter==='ALL'||r.kanwil===kanwilFilter)).sort((a,b)=>Number(b[metric]||0)-Number(a[metric]||0)),[individual,status,search,kanwilFilter,metric])
  const total=useMemo(()=>individual.reduce((a,r)=>({pokok:a.pokok+r.pokok,pnbp:a.pnbp+r.pnbp,frekuensi:a.frekuensi+r.frekuensi,lot:a.lot+r.lot}),{pokok:0,pnbp:0,frekuensi:0,lot:0}),[individual])
  const targetTotal=useMemo(()=>targets.reduce((a,r)=>({pokok:a.pokok+(Number(r.target_pokok)||0),pnbp:a.pnbp+(Number(r.target_pnbp)||0)}),{pokok:0,pnbp:0}),[targets])

  const kanwilRows=useMemo(()=>targets.map(t=>{
    const rows=individual.filter(r=>r.kanwil===t.kanwil)
    const pokok=rows.reduce((s,r)=>s+r.pokok,0), pnbp=rows.reduce((s,r)=>s+r.pnbp,0), frek=rows.reduce((s,r)=>s+r.frekuensi,0), lot=rows.reduce((s,r)=>s+r.lot,0)
    return {...t,jumlah_pl2:rows.length,realisasi_pokok:pokok,realisasi_pnbp:pnbp,frekuensi:frek,lot, capaian_pokok:(Number(t.target_pokok)||0)?pokok/Number(t.target_pokok):0,capaian_pnbp:(Number(t.target_pnbp)||0)?pnbp/Number(t.target_pnbp):0,produktif:frek?lot/frek:0}
  }).sort((a,b)=>Number(b[kanwilMetric==='pokok'?'capaian_pokok':kanwilMetric==='pnbp'?'capaian_pnbp':'produktif'])-Number(a[kanwilMetric==='pokok'?'capaian_pokok':kanwilMetric==='pnbp'?'capaian_pnbp':'produktif'])),[targets,individual,kanwilMetric])

  const hist=useMemo(()=>{
    const prof=new Map((seed.profiles as any[]).map(x=>[x.nama,x]))
    return (seed.hist as any[]).map(x=>{ const p=prof.get(x.nama); const y25=p?.y2025||{}; return {...x,y25:{...(x.y2025||{}),...y25}} }).sort((a,b)=>{ const av=Number(a.y25?.[histSort.replace('2025','')])||0; const bv=Number(b.y25?.[histSort.replace('2025','')])||0; return histDesc?bv-av:av-bv })
  },[histSort,histDesc])

  const counts=(seed.counts as any)[channelYear]||{}
  const channelTotal=Object.values(counts as Record<string, number>).reduce<number>((a,b)=>a+Number(b),0)
  const top10=individual.filter(r=>r.hasData).slice().sort((a,b)=>b.pokok-a.pokok).slice(0,10)
  const maxTop=Math.max(...top10.map(r=>r.pokok),1)
  const maxKanwil=Math.max(...kanwilRows.map(r=>Number(r[kanwilMetric==='pokok'?'capaian_pokok':kanwilMetric==='pnbp'?'capaian_pnbp':'produktif'])||0),1)
  const formasi=seed.formasi as any[]

  return <main className="wrap">
    <section className="hero">
      <div><div className="eyebrow">EXECUTIVE MONITORING · DATA LIVE</div><h1>Executive Dashboard — Pejabat Lelang Kelas II</h1><p>Realisasi kinerja s.d. Juli 2026 · profil penyelenggaraan 2024–2025 · formasi 2026 · histori 2023–2025</p></div>
      <div className="hero-badge">UPDATED<br/><b>31 AGUSTUS 2026</b></div>
    </section>
    <nav className="nav"><a className="active" href="#top">Dashboard</a><a href="/admin">Admin / Update Data</a></nav>

    {error&&<div className="notice danger">Gagal membaca sebagian data: {error}</div>}
    {loading&&<div className="loading">Memuat data live dari Supabase…</div>}

    <section className="kpis" id="top">
      <div className="card kpi"><span>PL-II Aktif</span><b>{num(master.filter(r=>r.status==='Aktif').length)}</b><small>per 25 Agustus 2026</small></div>
      <div className="card kpi"><span>Ada Capaian</span><b>{num(individual.filter(r=>r.hasData).length)}</b><small>dari {num(master.length)} PL-II aktif</small></div>
      <div className="card kpi"><span>Nihil</span><b>{num(individual.filter(r=>!r.hasData).length)}</b><small>tanpa data kinerja Juli</small></div>
      <div className="card kpi"><span>Total Pokok</span><b>{shortRp(total.pokok)}</b><small>Target {shortRp(targetTotal.pokok)} · {pct(targetTotal.pokok?total.pokok/targetTotal.pokok:0)}</small></div>
      <div className="card kpi"><span>Total PNBP</span><b>{shortRp(total.pnbp)}</b><small>Target {shortRp(targetTotal.pnbp)} · {pct(targetTotal.pnbp?total.pnbp/targetTotal.pnbp:0)}</small></div>
      <div className="card kpi"><span>Frekuensi Lelang</span><b>{num(total.frekuensi)}</b><small>{num(total.lot)} lot</small></div>
    </section>

    <section className="grid two">
      <div className="card"><div className="section-head"><div><h2>Profil Penyelenggaraan Lelang — 2024 vs 2025</h2><p>Komposisi aktivitas melalui Kantor PL-II dan Balai Lelang.</p></div><div className="tabs"><button className={channelYear==='2025'?'selected':''} onClick={()=>setChannelYear('2025')}>2025</button><button className={channelYear==='2024'?'selected':''} onClick={()=>setChannelYear('2024')}>2024</button></div></div>
        <div className="pie-grid"><Pie title="Frekuensi" kantor={Number((seed.overall as any)[channelYear]?.kantor_frek)||0} balai={Number((seed.overall as any)[channelYear]?.balai_frek)||0}/><Pie title="Nilai Pokok" kantor={Number((seed.overall as any)[channelYear]?.kantor_pokok)||0} balai={Number((seed.overall as any)[channelYear]?.balai_pokok)||0} money/></div>
      </div>
      <div className="card"><div className="section-head"><div><h2>Profil PL-II berdasarkan Kanal</h2><p>Kategori bersifat eksklusif.</p></div><span className="pill">{channelYear}</span></div><div className="channel-wrap"><div className="donut" style={{background:`conic-gradient(#1f6e9e 0 ${(Number(counts['Kantor PL-II'])||0)/channelTotal*100}%, #4e9b73 ${(Number(counts['Kantor PL-II'])||0)/channelTotal*100}% ${(Number(counts['Kantor PL-II'])+Number(counts['Balai Lelang']))/channelTotal*100}%, #c88b35 ${(Number(counts['Kantor PL-II'])+Number(counts['Balai Lelang']))/channelTotal*100}% ${(Number(counts['Kantor PL-II'])+Number(counts['Balai Lelang'])+Number(counts['Keduanya']))/channelTotal*100}%, #b65b62 ${(Number(counts['Kantor PL-II'])+Number(counts['Balai Lelang'])+Number(counts['Keduanya']))/channelTotal*100}% 100%)`}}><div><b>{num(channelTotal)}</b><small>PL-II</small></div></div><div className="legend-list">{[['Kantor PL-II','#1f6e9e'],['Balai Lelang','#4e9b73'],['Keduanya','#c88b35'],['Nihil','#b65b62']].map(([n,c])=><div key={n as string}><i style={{background:c as string}}/><span>{n}</span><b>{num(Number(counts[n as string])||0)}</b></div>)}</div></div></div>
    </section>

    <section className="grid two">
      <div className="card"><div className="section-head"><div><h2>Kinerja Agregat per Kanwil</h2><p>Realisasi = SUM kinerja individual · capaian = realisasi ÷ target Kanwil.</p></div><div className="tabs"><button className={kanwilMetric==='pokok'?'selected':''} onClick={()=>setKanwilMetric('pokok')}>Pokok</button><button className={kanwilMetric==='pnbp'?'selected':''} onClick={()=>setKanwilMetric('pnbp')}>PNBP</button><button className={kanwilMetric==='produktif'?'selected':''} onClick={()=>setKanwilMetric('produktif')}>Prod.</button></div></div>
        <div className="bars">{kanwilRows.map((r,i)=>{const v=Number(r[kanwilMetric==='pokok'?'capaian_pokok':kanwilMetric==='pnbp'?'capaian_pnbp':'produktif'])||0; return <div className="barrow" key={r.kanwil}><div className="barlabel"><span>{i+1}. {r.kanwil}</span><small>{num(r.jumlah_pl2)} PL-II</small></div><div className="bartrack"><div className="barfill" style={{width:`${Math.min(v/maxKanwil*100,100)}%`}}/></div><b>{kanwilMetric==='produktif'?v.toFixed(1):pct(v)}</b></div>})}</div>
      </div>
      <div className="card"><div className="section-head"><div><h2>Top 10 PL-II</h2><p>Berdasarkan realisasi Pokok Juli 2026.</p></div><span className="pill">Pokok</span></div><div className="bars">{top10.map((r,i)=><div className="barrow" key={r.id}><div className="barlabel"><span>{i+1}. {r.nama}</span><small>{r.kanwil}</small></div><div className="bartrack"><div className="barfill" style={{width:`${r.pokok/maxTop*100}%`}}/></div><b>{shortRp(r.pokok)}</b></div>)}</div></div>
    </section>

    <section className="card section"><div className="section-head"><div><h2>Kinerja Individual PL-II — Juli 2026</h2><p>Seluruh PL-II aktif tetap ditampilkan. PL-II tanpa capaian diberi status Nihil.</p></div><div className="filters"><select value={kanwilFilter} onChange={e=>setKanwilFilter(e.target.value)}><option value="ALL">Semua Kanwil</option>{Array.from(new Set(master.map(r=>r.kanwil))).sort().map(k=><option key={k}>{k}</option>)}</select><select value={metric} onChange={e=>setMetric(e.target.value as SortKey)}><option value="pokok">Ranking Pokok</option><option value="pnbp">Ranking PNBP</option><option value="frekuensi">Ranking Frekuensi</option><option value="lot">Ranking Lot</option></select><select value={status} onChange={e=>setStatus(e.target.value)}><option>Aktif</option><option>ALL</option></select><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama PL-II"/></div></div>
      <div className="table"><table><thead><tr><th>#</th><th>Pejabat</th><th>Kanwil</th><th>Wilayah Jabatan</th><th>Pokok</th><th>PNBP</th><th>Frek.</th><th>Lot</th><th>Prod.</th><th>Status</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={r.id} className={!r.hasData?'nihil':''}><td>{i+1}</td><td><b>{r.nama}</b></td><td>{r.kanwil}</td><td>{r.wilayah_jabatan||'-'}</td><td>{rupiah(r.pokok)}</td><td>{rupiah(r.pnbp)}</td><td>{num(r.frekuensi)}</td><td>{num(r.lot)}</td><td>{r.frekuensi?(r.lot/r.frekuensi).toFixed(1):'0.0'}</td><td><span className={`status ${r.hasData?'ok':'zero'}`}>{r.hasData?'Ada capaian':'Nihil'}</span></td></tr>)}</tbody></table></div><div className="foot">Menampilkan {num(filtered.length)} dari {num(master.length)} PL-II aktif.</div>
    </section>

    {inactive.length>0&&<section className="card section"><div className="section-head"><div><h2>Data Kinerja — Tidak Tercantum sebagai PL-II Aktif</h2><p>Data tidak dibuang; ditampilkan terpisah dan ditandai sebagai tidak aktif.</p></div></div><div className="table"><table><thead><tr><th>Pejabat</th><th>Kanwil</th><th>Pokok</th><th>PNBP</th><th>Frek.</th><th>Lot</th><th>Keterangan</th></tr></thead><tbody>{inactive.map(r=><tr className="inactive" key={r.nama}><td><b>{r.nama}</b></td><td>{r.kanwil}</td><td>{rupiah(r.pokok)}</td><td>{rupiah(r.pnbp)}</td><td>{num(r.frekuensi)}</td><td>{num(r.lot)}</td><td>{r.keterangan}</td></tr>)}</tbody></table></div></section>}

    <section className="card section"><div className="section-head"><div><h2>Perbandingan Formasi PL-II — KMK 85 vs Kondisi Aktif 25 Agustus 2026</h2><p>Formasi 299 · aktif 186 · gap 113 kekurangan.</p></div><div className="summary-chips"><span>Formasi <b>{num((seed.formasi_summary as any).formasi)}</b></span><span>Aktif <b>{num((seed.formasi_summary as any).aktif)}</b></span><span>Gap <b>{num(Math.abs((seed.formasi_summary as any).gap))}</b></span></div></div><div className="formasi-grid"><div><div className="mini-title">Current Aktif vs Formasi per Lokasi</div><div className="bars">{formasi.map(r=><div className="barrow" key={r.kanwil}><div className="barlabel"><span>{r.kanwil}</span><small>{r.formasi} formasi · {r.aktif} aktif</small></div><div className="bartrack"><div className="barfill" style={{width:`${Math.min((Number(r.aktif)||0)/(Number(r.formasi)||1)*100,100)}%`}}/></div><b className={r.status==='Kekurangan'?'red':'green'}>{r.status==='Kekurangan'?`-${Math.abs(r.selisih)}`:r.selisih}</b></div>)}</div></div><div className="card-soft"><h3>Lokasi tanpa PL-II aktif</h3><div className="zero-grid">{formasi.filter(r=>Number(r.aktif)===0).map(r=><span key={r.kanwil}>{r.kanwil}</span>)}</div><p className="muted">{num((seed.formasi_summary as any).kekurangan)} lokasi mengalami kekurangan formasi; {num((seed.formasi_summary as any).sesuai)} lokasi sesuai.</p></div></div></section>

    <section className="card section"><div className="section-head"><div><h2>Capaian 3 Tahun Terakhir per PL-II</h2><p>Histori 2023–2025 dari sumber histori. Sorting 2025 tersedia sesuai permintaan.</p></div><div className="sort-group"><button className={histSort==='pokok2025'?'selected':''} onClick={()=>{setHistSort('pokok2025');setHistDesc(!histDesc)}}>Pokok 2025 {histSort==='pokok2025'?(histDesc?'↓':'↑'):''}</button><button className={histSort==='pnbp2025'?'selected':''} onClick={()=>{setHistSort('pnbp2025');setHistDesc(!histDesc)}}>PNBP 2025 {histSort==='pnbp2025'?(histDesc?'↓':'↑'):''}</button><button className={histSort==='frekuensi2025'?'selected':''} onClick={()=>{setHistSort('frekuensi2025');setHistDesc(!histDesc)}}>Frek. 2025 {histSort==='frekuensi2025'?(histDesc?'↓':'↑'):''}</button><button className={histSort==='lot2025'?'selected':''} onClick={()=>{setHistSort('lot2025');setHistDesc(!histDesc)}}>Lot 2025 {histSort==='lot2025'?(histDesc?'↓':'↑'):''}</button></div></div><div className="table"><table><thead><tr><th>#</th><th>Pejabat</th><th>Kanwil</th><th>2023 Pokok</th><th>2023 PNBP</th><th>2023 Frek.</th><th>2024 Pokok</th><th>2024 PNBP</th><th>2024 Frek.</th><th>2025 Pokok</th><th>2025 PNBP</th><th>2025 Frek.</th></tr></thead><tbody>{hist.map((r,i)=><tr key={`${r.nama}-${i}`}><td>{i+1}</td><td><b>{r.nama}</b></td><td>{r.kanwil}</td><td>{rupiah(r.y2023?.pokok||0)}</td><td>{rupiah(r.y2023?.pnbp||0)}</td><td>{num(r.y2023?.frekuensi||0)}</td><td>{rupiah(r.y2024?.pokok||0)}</td><td>{rupiah(r.y2024?.pnbp||0)}</td><td>{num(r.y2024?.frekuensi||0)}</td><td>{rupiah(r.y25?.pokok||0)}</td><td>{rupiah(r.y25?.pnbp||0)}</td><td>{num(r.y25?.frekuensi||0)}</td></tr>)}</tbody></table></div></section>

    <footer className="foot footer">Basis data aktif dan kinerja 2026 dibaca langsung dari Supabase. Histori 2023–2025, kanal 2024–2025, dan formasi 2026 menggunakan baseline sumber yang telah dikunci. Perubahan satu PL-II akan mengubah agregat Kanwil secara otomatis.</footer>
  </main>
}

function Pie({title,kantor,balai,money=false}:{title:string,kantor:number,balai:number,money?:boolean}){const total=kantor+balai; const p=total?kantor/total*100:0; return <div className="pie-box"><b>{title}</b><div className="donut small" style={{background:`conic-gradient(#1f6e9e 0 ${p}%, #4e9b73 ${p}% 100%)`}}><div><b>{money?shortRp(total):num(total)}</b></div></div><div className="mini-legend"><span><i className="blue"/>Kantor PL-II <b>{money?shortRp(kantor):num(kantor)}</b></span><span><i className="green"/>Balai Lelang <b>{money?shortRp(balai):num(balai)}</b></span></div></div>}

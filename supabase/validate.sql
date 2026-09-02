select
 (select count(*) from public.pl2_master where status='Aktif') as active_master,
 (select count(*) from public.pl2_kinerja where period='2026-07') as kinerja_rows,
 (select count(*) from public.pl2_formasi where period='2026-07') as formasi_rows,
 (select count(*) from public.pl2_master m where m.status='Aktif'
  and not exists(select 1 from public.pl2_kinerja k where k.period='2026-07' and k.pl2_id=m.id)) as nihil;

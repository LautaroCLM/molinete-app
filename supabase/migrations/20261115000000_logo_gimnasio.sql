-- Logo del gimnasio: bucket público de lectura; solo el dueño sube/cambia/borra el de su gimnasio.
-- Los archivos viven en `<gym_id>/logo.webp` (el primer segmento de la ruta es el gimnasio).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists logos_select on storage.objects;
drop policy if exists logos_insert on storage.objects;
drop policy if exists logos_update on storage.objects;
drop policy if exists logos_delete on storage.objects;

create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_gym()::text);
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_gym()::text and public.es_dueno());
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_gym()::text and public.es_dueno())
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_gym()::text and public.es_dueno());
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_gym()::text and public.es_dueno());

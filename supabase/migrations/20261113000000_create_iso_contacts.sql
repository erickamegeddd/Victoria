create table if not exists public.iso_contacts (
  id uuid primary key default gen_random_uuid(),
  iso_id uuid not null references public.isos(id) on delete cascade,
  name text,
  email text,
  phone text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists iso_contacts_iso_id_idx on public.iso_contacts(iso_id);

alter table public.iso_contacts enable row level security;
drop policy if exists "iso_contacts read" on public.iso_contacts;
create policy "iso_contacts read" on public.iso_contacts
  for select to authenticated using (true);

grant select on public.iso_contacts to authenticated;
grant select, insert, update, delete on public.iso_contacts to service_role;

-- Run this in the Supabase SQL editor to initialize the schema.
-- gen_random_uuid() is built into PostgreSQL 13+ (which Supabase uses) -- no extension needed.

-- listings table
create table if not exists listings (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  company             text not null,
  location            text,
  role_type           text check (role_type in ('swe', 'quant', 'cs_research', 'other')),
  source              text check (source in ('simplify', 'handshake', 'github', 'manual')),
  url                 text unique,
  description_snippet text,
  deadline            date,
  posted_at           timestamptz,
  created_at          timestamptz not null default now(),
  is_active           boolean not null default true
);

create index if not exists listings_role_type_idx  on listings (role_type);
create index if not exists listings_source_idx     on listings (source);
create index if not exists listings_created_at_idx on listings (created_at desc);
create index if not exists listings_deadline_idx   on listings (deadline);

-- applications table
create table if not exists applications (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid references listings (id) on delete set null,
  company          text not null,
  role             text not null,
  status           text not null default 'saved' check (status in (
                     'saved', 'applied', 'oa_received', 'oa_submitted',
                     'interview_scheduled', 'interview_done',
                     'offer', 'rejected', 'withdrawn'
                   )),
  applied_at       date,
  deadline         date,
  notes            text,
  oa_date          date,
  interview_date   date,
  offer_deadline   date,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists applications_status_idx     on applications (status);
create index if not exists applications_listing_id_idx on applications (listing_id);

-- auto-update updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on applications;

create trigger applications_set_updated_at
  before update on applications
  for each row execute function set_updated_at();

-- Row-level security (permissive -- personal tool with no auth)
alter table listings     enable row level security;
alter table applications enable row level security;

create policy "allow_all_listings"
  on listings for all
  using (true)
  with check (true);

create policy "allow_all_applications"
  on applications for all
  using (true)
  with check (true);

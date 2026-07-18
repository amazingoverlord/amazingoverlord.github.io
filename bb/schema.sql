-- =====================================================
-- RSVP Management System — Database Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)
-- =====================================================

-- Extension for UUID generation
create extension if not exists "pgcrypto";

-- ---------------------------------------------------
-- Table: master_guests
-- A canonical guest record. Lets you link multiple
-- event_guests entries (different spellings, nicknames)
-- back to one real person.
-- ---------------------------------------------------
create table if not exists master_guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_master_guests_name on master_guests using gin (to_tsvector('simple', name));

-- ---------------------------------------------------
-- Table: events
-- ---------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  date date,
  time text,
  venue text,
  venue_address text,
  additional_info text,
  is_active boolean not null default true,
  invitation_sent_date date,
  rsvp_deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_slug on events(slug);
create index if not exists idx_events_is_active on events(is_active);

-- ---------------------------------------------------
-- Table: event_guests
-- The join between an event and a guest, with per-event
-- attributes (max plus ones, invited flag, notes).
-- ---------------------------------------------------
create table if not exists event_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_name text not null,
  master_guest_id uuid references master_guests(id) on delete set null,
  max_plus_ones integer not null default 0,
  is_invited boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, guest_name)
);

create index if not exists idx_event_guests_event_id on event_guests(event_id);
create index if not exists idx_event_guests_master_guest_id on event_guests(master_guest_id);
create index if not exists idx_event_guests_name on event_guests using gin (to_tsvector('simple', guest_name));

-- ---------------------------------------------------
-- Table: rsvps
-- One RSVP per event_guest.
-- ---------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rsvp_response') then
    create type rsvp_response as enum ('yes', 'no', 'pending');
  end if;
end$$;

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  event_guest_id uuid not null references event_guests(id) on delete cascade,
  response rsvp_response not null default 'pending',
  plus_ones_count integer not null default 0,
  plus_one_names text[] not null default '{}',
  dietary_notes text,
  updated_at timestamptz not null default now(),
  unique (event_guest_id)
);

create index if not exists idx_rsvps_event_guest_id on rsvps(event_guest_id);
create index if not exists idx_rsvps_response on rsvps(response);

-- ---------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_events_updated_at on events;
create trigger trg_events_updated_at before update on events
  for each row execute function set_updated_at();

drop trigger if exists trg_event_guests_updated_at on event_guests;
create trigger trg_event_guests_updated_at before update on event_guests
  for each row execute function set_updated_at();

drop trigger if exists trg_rsvps_updated_at on rsvps;
create trigger trg_rsvps_updated_at before update on rsvps
  for each row execute function set_updated_at();

-- =====================================================
-- Row Level Security
--
-- This is a private, single-tenant system. The anon key
-- is used by the public RSVP page AND the admin panel
-- (admin auth is enforced by the /api/admin-login serverless
-- function, not by Supabase auth). Because of that, RLS here
-- is deliberately permissive at the data layer — the real
-- gate is that nobody outside your guest list knows a guest
-- name to search for, and the admin panel is cookie-gated.
--
-- If you want stronger guarantees, swap this for Supabase Auth
-- and scope policies to authenticated admin users only, and
-- restrict guest-facing operations to specific RPC functions.
-- =====================================================

alter table master_guests enable row level security;
alter table events enable row level security;
alter table event_guests enable row level security;
alter table rsvps enable row level security;

-- Guests (via anon key) need to be able to:
--  - read events, event_guests, rsvps (to find themselves & see their invites)
--  - insert/update their own rsvp row
-- Admin (via anon key, but gated by the login cookie in the UI) needs full CRUD.
-- Since both use the same anon key, we grant broad access here and rely on
-- the app-layer gating described above.

create policy "public read master_guests" on master_guests for select using (true);
create policy "public write master_guests" on master_guests for insert with check (true);
create policy "public update master_guests" on master_guests for update using (true);
create policy "public delete master_guests" on master_guests for delete using (true);

create policy "public read events" on events for select using (true);
create policy "public write events" on events for insert with check (true);
create policy "public update events" on events for update using (true);
create policy "public delete events" on events for delete using (true);

create policy "public read event_guests" on event_guests for select using (true);
create policy "public write event_guests" on event_guests for insert with check (true);
create policy "public update event_guests" on event_guests for update using (true);
create policy "public delete event_guests" on event_guests for delete using (true);

create policy "public read rsvps" on rsvps for select using (true);
create policy "public write rsvps" on rsvps for insert with check (true);
create policy "public update rsvps" on rsvps for update using (true);
create policy "public delete rsvps" on rsvps for delete using (true);

-- =====================================================
-- Seed data
-- =====================================================

insert into master_guests (id, name, email, phone) values
  ('11111111-1111-1111-1111-111111111101', 'Jamie Rivera', 'jamie.rivera@example.com', '212-555-0101'),
  ('11111111-1111-1111-1111-111111111102', 'Morgan Lee', 'morgan.lee@example.com', '212-555-0102'),
  ('11111111-1111-1111-1111-111111111103', 'Chris Patel', 'chris.patel@example.com', '212-555-0103'),
  ('11111111-1111-1111-1111-111111111104', 'Sam Okafor', 'sam.okafor@example.com', '212-555-0104'),
  ('11111111-1111-1111-1111-111111111105', 'Taylor Kim', 'taylor.kim@example.com', '212-555-0105'),
  ('11111111-1111-1111-1111-111111111106', 'Alex Nguyen', 'alex.nguyen@example.com', '212-555-0106'),
  ('11111111-1111-1111-1111-111111111107', 'Jordan Diaz', 'jordan.diaz@example.com', '212-555-0107'),
  ('11111111-1111-1111-1111-111111111108', 'Casey Brooks', 'casey.brooks@example.com', '212-555-0108'),
  ('11111111-1111-1111-1111-111111111109', 'Riley Chen', 'riley.chen@example.com', '212-555-0109'),
  ('11111111-1111-1111-1111-111111111110', 'Drew Foster', 'drew.foster@example.com', '212-555-0110')
on conflict (id) do nothing;

insert into events (id, name, slug, date, time, venue, venue_address, additional_info, is_active, rsvp_deadline) values
  ('22222222-2222-2222-2222-222222222201', 'Birthday Party', 'birthday-party', current_date + interval '30 days', '7:00 PM', 'The Garden Room', '123 Main St, New York, NY', 'Cocktail attire, please. Street parking available.', true, current_date + interval '20 days'),
  ('22222222-2222-2222-2222-222222222202', 'Engagement Party', 'engagement-party', current_date + interval '45 days', '6:30 PM', 'Rooftop at 8th Ave', '456 8th Ave, New York, NY', 'Rooftop is open-air, dress for the weather.', true, current_date + interval '30 days'),
  ('22222222-2222-2222-2222-222222222203', 'Wedding', 'wedding', current_date + interval '90 days', '4:00 PM', 'Riverside Hall', '789 River Rd, Hudson Valley, NY', 'Ceremony at 4pm, reception to follow. Shuttle from the hotel provided.', true, current_date + interval '60 days')
on conflict (id) do nothing;

-- Event guests for Birthday Party
insert into event_guests (id, event_id, guest_name, master_guest_id, max_plus_ones) values
  ('33333333-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222201', 'Jamie Rivera', '11111111-1111-1111-1111-111111111101', 1),
  ('33333333-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222201', 'Morgan Lee', '11111111-1111-1111-1111-111111111102', 0),
  ('33333333-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222201', 'Chris Patel', '11111111-1111-1111-1111-111111111103', 2),
  ('33333333-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222201', 'Sam Okafor', '11111111-1111-1111-1111-111111111104', 1)
on conflict (id) do nothing;

-- Event guests for Engagement Party
insert into event_guests (id, event_id, guest_name, master_guest_id, max_plus_ones) values
  ('33333333-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222202', 'Jamie Rivera', '11111111-1111-1111-1111-111111111101', 1),
  ('33333333-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222202', 'Taylor Kim', '11111111-1111-1111-1111-111111111105', 1),
  ('33333333-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222202', 'Alex Nguyen', '11111111-1111-1111-1111-111111111106', 0),
  ('33333333-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222202', 'Jordan Diaz', '11111111-1111-1111-1111-111111111107', 2)
on conflict (id) do nothing;

-- Event guests for Wedding
insert into event_guests (id, event_id, guest_name, master_guest_id, max_plus_ones) values
  ('33333333-0000-0000-0000-000000000009', '22222222-2222-2222-2222-222222222203', 'Jamie Rivera', '11111111-1111-1111-1111-111111111101', 2),
  ('33333333-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222203', 'Casey Brooks', '11111111-1111-1111-1111-111111111108', 1),
  ('33333333-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222203', 'Riley Chen', '11111111-1111-1111-1111-111111111109', 1),
  ('33333333-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222203', 'Drew Foster', '11111111-1111-1111-1111-111111111110', 0),
  ('33333333-0000-0000-0000-00000000000d', '22222222-2222-2222-2222-222222222203', 'Morgan Lee', '11111111-1111-1111-1111-111111111102', 1)
on conflict (id) do nothing;

-- Some RSVPs already in (mix of yes/no/pending)
insert into rsvps (event_guest_id, response, plus_ones_count, plus_one_names, dietary_notes) values
  ('33333333-0000-0000-0000-000000000001', 'yes', 1, array['Devon Rivera'], 'Vegetarian'),
  ('33333333-0000-0000-0000-000000000002', 'no', 0, array[]::text[], null),
  ('33333333-0000-0000-0000-000000000005', 'yes', 0, array[]::text[], null),
  ('33333333-0000-0000-0000-000000000006', 'yes', 1, array['Reese Kim'], 'No nuts please'),
  ('33333333-0000-0000-0000-000000000009', 'yes', 2, array['Devon Rivera', 'Sky Rivera'], null),
  ('33333333-0000-0000-0000-00000000000a', 'no', 0, array[]::text[], null)
on conflict (event_guest_id) do nothing;

-- Guests without an insert into rsvps default to 'pending' via the app
-- (the app creates a pending row on first load, or you can pre-seed one):
insert into rsvps (event_guest_id, response) values
  ('33333333-0000-0000-0000-000000000003', 'pending'),
  ('33333333-0000-0000-0000-000000000004', 'pending'),
  ('33333333-0000-0000-0000-000000000007', 'pending'),
  ('33333333-0000-0000-0000-000000000008', 'pending'),
  ('33333333-0000-0000-0000-00000000000b', 'pending'),
  ('33333333-0000-0000-0000-00000000000c', 'pending'),
  ('33333333-0000-0000-0000-00000000000d', 'pending')
on conflict (event_guest_id) do nothing;

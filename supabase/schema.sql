-- mrinalsave.com — Supabase schema
-- Run this in the Supabase SQL Editor to create all tables.

-- Nintendo Switch games.
CREATE TABLE IF NOT EXISTS nintendo_games (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order  integer,
  title       text    NOT NULL,
  cover_path  text,           -- filename only, e.g. "13-sentinels.webp"
  store_url   text
);

-- Pokemon card collection.
CREATE TABLE IF NOT EXISTS pokemon_cards (
  id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filename text NOT NULL,
  type     text NOT NULL CHECK (type IN ('card', 'gif'))
);

-- Oreo flavor catalog.
CREATE TABLE IF NOT EXISTS oreo_flavors (
  id         uuid     DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text     NOT NULL,
  image_path text,
  wafers     text[],
  type       text     NOT NULL DEFAULT 'original',
  tags       text[],
  created_at timestamptz DEFAULT now(),
  CONSTRAINT oreo_flavors_name_type_key UNIQUE (name, type)
);

-- Individual Oreo reviews (+ computed averages).
CREATE TABLE IF NOT EXISTS oreo_reviews (
  id            uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  flavor_id     uuid         NOT NULL REFERENCES oreo_flavors(id) ON DELETE CASCADE,
  reviewer_name text         NOT NULL,
  rating        numeric(4,2) NOT NULL,
  comment       text,
  is_average    boolean      DEFAULT false,
  created_at    timestamptz  DEFAULT now()
);

-- Reviewers.
CREATE TABLE IF NOT EXISTS oreo_reviewers (
  id   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- Indexes for common queries.
CREATE INDEX IF NOT EXISTS idx_oreo_reviews_flavor_id ON oreo_reviews(flavor_id);
CREATE INDEX IF NOT EXISTS idx_oreo_reviews_reviewer  ON oreo_reviews(reviewer_name);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_type     ON pokemon_cards(type);

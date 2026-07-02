import { supabase } from './supabase'
import type {
  NintendoGame,
  PokemonCard,
  OreoFlavorWithReviews,
  OreoReviewer,
} from './types'

export async function getNintendoGames(): Promise<NintendoGame[]> {
  const { data, error } = await supabase
    .from('nintendo_games')
    .select('*')
    .order('title', { ascending: true })
  if (error) { console.error('getNintendoGames:', error.message); return [] }
  return data
}

export async function getPokemonCards(): Promise<PokemonCard[]> {
  const { data, error } = await supabase
    .from('pokemon_cards')
    .select('*')
    .order('filename')
  if (error) { console.error('getPokemonCards:', error.message); return [] }
  return data
}

export async function getOreoFlavors(): Promise<OreoFlavorWithReviews[]> {
  const { data, error } = await supabase
    .from('oreo_flavors')
    .select('*, oreo_reviews(*)')
    .order('created_at', { ascending: true })
  if (error) { console.error('getOreoFlavors:', error.message); return [] }
  return data
}

export async function getOreoReviewers(): Promise<OreoReviewer[]> {
  const { data, error } = await supabase
    .from('oreo_reviewers')
    .select('*')
    .order('name')
  if (error) { console.error('getOreoReviewers:', error.message); return [] }
  return data
}

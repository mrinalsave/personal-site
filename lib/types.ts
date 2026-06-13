export type NintendoGame = {
  id: string
  sort_order: number | null
  title: string
  cover_path: string | null
  store_url: string | null
}

export type PokemonCard = {
  id: string
  filename: string
  type: 'card' | 'gif'
}

export type OreoFlavor = {
  id: string
  name: string
  image_path: string | null
  wafers: string[] | null
  type: string | null
  tags: string[] | null
  created_at: string
}

export type OreoReview = {
  id: string
  flavor_id: string
  reviewer_name: string
  rating: number
  comment: string | null
  is_average: boolean
  created_at: string
}

export type OreoReviewer = {
  id: string
  name: string
}

export type OreoFlavorWithReviews = OreoFlavor & {
  oreo_reviews: OreoReview[]
}

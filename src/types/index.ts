export interface User {
  id: string // Firebase UID
  name: string
  email: string
  avatar_url: string | null
  couple_code: string
  couple_id: string | null
  created_at: string
}

export interface Couple {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  anniversary_date?: string | null
  photo_url?: string | null
  user1?: User
  user2?: User
}

export interface Plan {
  id: string
  title: string
  description: string | null
  couple_id: string
  created_by: string
  created_at: string
  updated_at: string
  task_count?: number
  completed_count?: number
  archived?: boolean
  cover_image?: string | null
  due_date?: string | null
  tags?: string[]
}

export interface Task {
  id: string
  plan_id: string
  title: string
  icon: string
  completed: boolean
  completed_by: string | null
  completed_by_name?: string | null
  completed_at: string | null
  sort_order: number
  notes?: string | null
  due_date?: string | null
  reminder_at?: string | null
  assigned_to?: string | null
  task_photos?: string[]
  created_by: string
  created_at: string
}

export interface Place {
  id: string
  couple_id: string
  name: string
  country: string
  lat: number
  lng: number
  status: "visited" | "wishlist"
  note: string | null
  date: string | null
  photos: string[]
  created_by: string
  created_at: string
}

export interface JournalEntry {
  id: string
  couple_id: string
  date: string
  content: string
  mood: string | null
  photos: string[]
  audio_url: string | null
  tags?: string[]
  location?: string | null
  reactions?: Record<string, string>
  is_private?: boolean
  is_pinned?: boolean
  created_by: string
  created_at: string
}

export interface Letter {
  id: string
  couple_id: string
  from_user_id: string
  to_user_id: string
  content: string
  subject: string | null
  is_read: boolean
  created_at: string
  send_at?: string | null
  photo_url?: string | null
  reactions?: Record<string, string>
}

export type CapsuleType =
  | "memory"
  | "dream"
  | "love"
  | "achievement"
  | "mystery"
  | "reflection"

export interface TimeCapsule {
  id: string
  couple_id: string
  message: string
  type: CapsuleType
  unlock_date: string
  unlock_at: string | null
  is_opened: boolean
  attachments: string[]
  created_by: string
  created_at: string
  photo_url?: string | null
}

export interface SavingsGoal {
  id: string
  couple_id: string
  name: string
  target_amount: number
  emoji?: string
  deadline?: string | null
  created_by: string
  created_at: string
  contributions?: GoalContribution[]
  total_saved?: number
}

export interface GoalContribution {
  id: string
  goal_id: string
  amount: number
  contributed_by: string
  created_at: string
  note?: string | null
}

export type FavorDifficulty = "easy" | "medium" | "hard"
export type FavorCategory = "romantic" | "fun" | "help" | "surprise"

export interface Favor {
  id: string
  couple_id: string
  title: string
  description: string | null
  difficulty: FavorDifficulty
  points: number
  category: FavorCategory
  is_completed: boolean
  completed_by: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  assigned_to?: string | null
  completion_note?: string | null
}

export type ChallengeCategory = "all" | "romantic" | "adventure" | "chill" | "creative"

export interface DailyChallengeHistory {
  id: string
  couple_id: string
  challenge_text: string
  category: string
  is_completed: boolean
  accepted_by: string
  accepted_at: string
  completed_at: string | null
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  created_at: string
}

// Challenge data type (static list, not from DB)
export interface ChallengeData {
  emoji: string
  text: string
  category: ChallengeCategory
  categoryLabel: string
  difficulty: "easy" | "medium" | "hard"
  difficultyLabel: string
}

export interface Photo {
  id: string
  image_url: string
  medium_url?: string | null
  thumb_url: string | null
  delete_url: string | null
  file_name: string | null
  caption: string | null
  source: string   // 'thingstodo' | '14feb'
  created_at: string
  uploaded_by?: string | null
  uploaded_by_name?: string | null
  uploaded_by_avatar?: string | null
  group_id?: string | null
}

export const KAWAII_ICONS: Record<string, string> = {
  clipboard: "Lista",
  heart: "Corazón",
  gift: "Regalo",
  skewers: "Comida",
  cup: "Café",
  brush: "Arte",
  notepad: "Nota",
  tv: "TV",
  guitar: "Música",
  phone: "Teléfono",
  gift_box: "Caja",
  gamepad: "Juego",
  laptop: "Laptop",
  envelope: "Carta",
  flower: "Flor",
  pizza: "Pizza",
  movie: "Película",
  travel: "Viaje",
  book: "Libro",
  music: "Notas",
  camera: "Cámara",
  bath: "Spa",
  game: "Dados",
  money: "Dinero",
  house: "Casa",
  car: "Auto",
  star: "Estrella",
  ring: "Anillo",
  balloon: "Globo",
  cat: "Gato",
  dog: "Perro",
  bear: "Oso",
  bunny: "Conejo",
  cloud: "Nube",
  sun: "Sol",
  rainbow: "Arcoíris",
  ice_cream: "Helado",
  sushi: "Sushi",
  cactus: "Cactus",
  estrellas: "Destellos",
}

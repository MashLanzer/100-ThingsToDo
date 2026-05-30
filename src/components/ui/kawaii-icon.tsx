"use client"
import {
  ClipboardList, Heart, Gift, UtensilsCrossed, Coffee, Scissors, FileText,
  Tv, Music, Smartphone, Package, Gamepad2, Laptop, Mail, Flower2, Film,
  Plane, BookOpen, Music2, Camera, Waves, Dice5, Banknote, Home, Car,
  Star, Gem, Cat, Dog, PawPrint, Rabbit, Cloud, Sun,
  Sunset, IceCream2, Fish, TreePine, Sparkles, type LucideProps
} from "lucide-react"

export const KAWAII_ICON_REGISTRY: Record<string, React.FC<LucideProps>> = {
  clipboard: ClipboardList,
  heart: Heart,
  gift: Gift,
  skewers: UtensilsCrossed,
  cup: Coffee,
  brush: Scissors,
  notepad: FileText,
  tv: Tv,
  guitar: Music,
  phone: Smartphone,
  gift_box: Package,
  gamepad: Gamepad2,
  laptop: Laptop,
  envelope: Mail,
  flower: Flower2,
  pizza: UtensilsCrossed,
  movie: Film,
  travel: Plane,
  book: BookOpen,
  music: Music2,
  camera: Camera,
  bath: Waves,
  game: Dice5,
  money: Banknote,
  house: Home,
  car: Car,
  star: Star,
  ring: Gem,
  balloon: Gift,
  cat: Cat,
  dog: Dog,
  bear: PawPrint,
  bunny: Rabbit,
  cloud: Cloud,
  sun: Sun,
  rainbow: Sunset,
  ice_cream: IceCream2,
  sushi: Fish,
  cactus: TreePine,
  estrellas: Sparkles,
}

interface KawaiiIconProps extends LucideProps {
  name: string
}

export function KawaiiIcon({ name, size = 20, ...props }: KawaiiIconProps) {
  const IconComponent = KAWAII_ICON_REGISTRY[name] ?? Sparkles
  return <IconComponent size={size} {...props} />
}

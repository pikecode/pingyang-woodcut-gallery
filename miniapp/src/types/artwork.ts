export interface ArtworkImage {
  role: string; path: string; width: number; height: number; format: string
}
export interface Artwork {
  id: number; slug: string; catalogNo: number; title: string; aliases: string[]
  theme: { code: string; name: string }
  form: { name: string } | null
  material: { name: string } | null
  period: { code: string; label: string; raw: string }
  dimensions: { sourceText: string; widthCm: number | null; heightCm: number | null }
  collection: string; description: string; images: ArtworkImage[]
}
export interface GalleryData { artworks: Artwork[] }

import { useEffect, useState } from 'react'
import { GalleryData } from '../types/artwork'
import artworksJson from '../assets/data/artworks.json'

export function useGalleryData() {
  const [data, setData] = useState<GalleryData | null>(null)
  useEffect(() => {
    setData(artworksJson as GalleryData)
  }, [])
  return { data, error: null }
}

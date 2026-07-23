import { View, Image, Text } from '@tarojs/components'
import { Artwork } from '../../types/artwork'
import './index.scss'

interface Props {
  artwork: Artwork; mode?: 'grid' | 'list'
  onOpen: (a: Artwork) => void; featured?: boolean
}

export default function ArtworkCard({ artwork, mode = 'grid', onOpen, featured = false }: Props) {
  const kind = artwork.form?.name || artwork.material?.name || '木版年画'
  return (
    <View className={`artwork-card ${mode === 'list' ? 'is-list' : ''} ${featured ? 'is-featured' : ''}`} onClick={() => onOpen(artwork)}>
      <View className='artwork-image-wrap'>
        <Image className='artwork-img' src={artwork.images[0].path} mode='aspectFit' lazyLoad />
        <Text className='artwork-index'>{String(artwork.catalogNo).padStart(3, '0')}</Text>
      </View>
      <View className='artwork-copy'>
        <Text className='artwork-kicker'>{artwork.theme.name} · {kind}</Text>
        <Text className='artwork-title'>{artwork.title}</Text>
        {mode === 'list' && <Text className='artwork-desc'>{artwork.description}</Text>}
        <Text className='artwork-meta'>{artwork.period.label}</Text>
      </View>
    </View>
  )
}

import { View, Image, Text, ScrollView } from '@tarojs/components'
import { Artwork } from '../../types/artwork'
import './index.scss'

interface Props {
  artwork: Artwork | null; artworks: Artwork[]
  onClose: () => void; onChange: (offset: number) => void
}

export default function ArtworkDetail({ artwork, artworks, onClose, onChange }: Props) {
  if (!artwork) return null
  const kind = artwork.form?.name || artwork.material?.name || '木版年画'
  return (
    <View className='detail-mask' onClick={onClose}>
      <View className='detail-panel' onClick={e => e.stopPropagation()}>
        <View className='detail-toolbar'>
          <Text className='detail-no'>{String(artwork.catalogNo).padStart(3, '0')} / {artworks.length}</Text>
          <View className='detail-actions'>
            <View className='detail-btn' onClick={() => onChange(-1)}><Text>‹</Text></View>
            <View className='detail-btn' onClick={() => onChange(1)}><Text>›</Text></View>
            <View className='detail-btn detail-close' onClick={onClose}><Text>✕</Text></View>
          </View>
        </View>
        <ScrollView scrollY className='detail-scroll'>
          <View className='detail-images'>
            {artwork.images.map(img => (
              <Image key={img.role} className='detail-img' src={img.path} mode='widthFix' />
            ))}
          </View>
          <View className='detail-body'>
            <Text className='detail-kicker'>{artwork.theme.name} · {kind} · {artwork.period.label}</Text>
            <Text className='detail-title'>{artwork.title}</Text>
            {artwork.aliases.length > 0 && <Text className='detail-alias'>又名：{artwork.aliases.join('、')}</Text>}
            <Text className='detail-desc'>{artwork.description}</Text>
            <View className='detail-meta'>
              <View className='meta-item'><Text className='meta-label'>分类</Text><Text className='meta-value'>{artwork.theme.name}</Text></View>
              <View className='meta-item'><Text className='meta-label'>形制</Text><Text className='meta-value'>{kind}</Text></View>
              <View className='meta-item'><Text className='meta-label'>年代</Text><Text className='meta-value'>{artwork.period.label}</Text></View>
              <View className='meta-item meta-full'><Text className='meta-label'>规格</Text><Text className='meta-value'>{artwork.dimensions.sourceText}</Text></View>
              <View className='meta-item meta-full'><Text className='meta-label'>馆藏</Text><Text className='meta-value'>{artwork.collection}</Text></View>
            </View>
            <View className='audio-player'>
              <View className='audio-btn audio-disabled'><Text>▶</Text></View>
              <View className='audio-info'>
                <Text className='audio-label'>导览音频</Text>
                <Text className='audio-status'>音频文件准备中</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

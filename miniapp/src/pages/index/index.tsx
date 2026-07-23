import { useState, useMemo } from 'react'
import { View, Image, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGalleryData } from '../../hooks/useGalleryData'
import { useCountUp } from '../../hooks/useCountUp'
import { Artwork } from '../../types/artwork'
import ArtworkCard from '../../components/ArtworkCard'
import ArtworkDetail from '../../components/ArtworkDetail'
import OpeningIntro from '../../components/OpeningIntro'
import './index.scss'

const THEME_ORDER = ['戏曲', '神祇', '吉祥', '故事']
const CURATED = ['py-001', 'py-014', 'py-025', 'py-030', 'py-089', 'py-098']

function StatItem({ value, label, delay }: { value: number; label: string; delay: number }) {
  const [active, setActive] = useState(false)
  const count = useCountUp(value, active)
  useMemo(() => { setTimeout(() => setActive(true), delay + 200) }, [])
  return (
    <View className='stat-item'>
      <Text className='stat-num'>{count}</Text>
      <Text className='stat-label'>{label}</Text>
    </View>
  )
}

export default function IndexPage() {
  const { data } = useGalleryData()
  const [selected, setSelected] = useState<Artwork | null>(null)
  const artworks = data?.artworks || []
  const hero = artworks.find(a => a.slug === 'py-087') || artworks[0]
  const curated = useMemo(() => CURATED.map(s => artworks.find(a => a.slug === s)).filter(Boolean) as Artwork[], [artworks])
  const counts = useMemo(() => Object.fromEntries(THEME_ORDER.map(t => [t, artworks.filter(a => a.theme.name === t).length])), [artworks])

  const changeSelected = (offset: number) => {
    setSelected(cur => {
      if (!cur) return cur
      const idx = artworks.findIndex(a => a.slug === cur.slug)
      return artworks[(idx + offset + artworks.length) % artworks.length]
    })
  }

  if (!artworks.length) return <View className='loading'><Text>正在整理馆藏…</Text></View>

  return (
    <ScrollView scrollY className='home-page'>
      <OpeningIntro />
      {hero && (
        <View className='home-hero' onClick={() => setSelected(hero)}>
          <Image className='hero-img' src={hero.images[0].path} mode='aspectFill' />
          <View className='hero-overlay'>
            <Text className='hero-eyebrow'>山西临汾 · 国家级非遗</Text>
            <Text className='hero-title'>平阳木版年画</Text>
            <Text className='hero-sub'>以刀代笔，以色寄愿</Text>
          </View>
          <View className='hero-caption'>
            <Text className='caption-no'>{String(hero.catalogNo).padStart(3,'0')}</Text>
            <Text className='caption-title'>{hero.title}</Text>
          </View>
        </View>
      )}
      <View className='theme-nav'>
        {THEME_ORDER.map(t => (
          <View key={t} className='theme-nav-item' onClick={() => Taro.navigateTo({ url: `/pages/categories/index?theme=${t}` })}>
            <Text className='theme-name'>{t}</Text>
            <Text className='theme-count'>{String(counts[t] || 0).padStart(2,'0')}</Text>
          </View>
        ))}
      </View>
      <View className='section'>
        <View className='section-head'>
          <Text className='section-label'>Selected</Text>
          <Text className='section-h2'>精选藏品</Text>
        </View>
        <View className='card-grid'>
          {curated.map((a, i) => (
            <ArtworkCard key={a.slug} artwork={a} onOpen={setSelected} featured={i === 0} />
          ))}
        </View>
      </View>
      <View className='facts-section'>
        <Text className='section-label gold'>Archive</Text>
        <Text className='section-h2 white'>馆藏概览</Text>
        <View className='stats-row'>
          <StatItem value={55} label='件藏品' delay={0} />
          <StatItem value={65} label='幅图像' delay={150} />
          <StatItem value={4} label='类主题' delay={300} />
          <StatItem value={54} label='件清代' delay={450} />
        </View>
      </View>
      <ArtworkDetail artwork={selected} artworks={artworks} onClose={() => setSelected(null)} onChange={changeSelected} />
    </ScrollView>
  )
}

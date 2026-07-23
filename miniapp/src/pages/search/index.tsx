import { useState, useMemo, useEffect } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useGalleryData } from '../../hooks/useGalleryData'
import { Artwork } from '../../types/artwork'
import ArtworkCard from '../../components/ArtworkCard'
import ArtworkDetail from '../../components/ArtworkDetail'
import './index.scss'

const HOT_TAGS = ['白素贞', '门神', '关羽', '牛郎织女', '财神', '戏曲']

export default function SearchPage() {
  const { data } = useGalleryData()
  const [selected, setSelected] = useState<Artwork | null>(null)
  const [query, setQuery] = useState('')
  const artworks = data?.artworks || []

  const results = useMemo(() => {
    const kw = query.trim().toLowerCase()
    if (!kw) return []
    return artworks.filter(a =>
      [a.title, a.description, ...a.aliases].join(' ').toLowerCase().includes(kw)
    ).slice(0, 30)
  }, [artworks, query])

  const changeSelected = (offset: number) => {
    setSelected(cur => {
      if (!cur) return cur
      const idx = artworks.findIndex(a => a.slug === cur.slug)
      return artworks[(idx + offset + artworks.length) % artworks.length]
    })
  }

  return (
    <View className='search-page'>
      <View className='search-topbar'>
        <View className='search-field-hero'>
          <Text className='search-icon'>🔍</Text>
          <Input className='search-input-hero' value={query} onInput={e => setQuery(e.detail.value)}
            placeholder='搜索题名、别名或画面内容' placeholderClass='search-ph' focus />
          {!!query && <Text className='search-clear' onClick={() => setQuery('')}>✕</Text>}
        </View>
      </View>
      <ScrollView scrollY className='search-content'>
        {!query && (
          <View className='search-hints'>
            <Text className='hints-label'>热门主题</Text>
            <View className='hints-tags'>
              {HOT_TAGS.map(tag => (
                <View key={tag} className='hint-tag' onClick={() => setQuery(tag)}><Text>{tag}</Text></View>
              ))}
            </View>
          </View>
        )}
        {query && results.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-title'>无结果</Text>
            <Text className='empty-desc'>换个关键词试试</Text>
          </View>
        )}
        {results.length > 0 && (
          <View className='search-results'>
            <Text className='results-count'><Text className='results-num'>{results.length}</Text> 件结果</Text>
            <View className='card-grid'>
              {results.map(a => <ArtworkCard key={a.slug} artwork={a} onOpen={setSelected} />)}
            </View>
          </View>
        )}
      </ScrollView>
      <ArtworkDetail artwork={selected} artworks={artworks} onClose={() => setSelected(null)} onChange={changeSelected} />
    </View>
  )
}

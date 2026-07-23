import { useState, useMemo } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { useGalleryData } from '../../hooks/useGalleryData'
import { Artwork } from '../../types/artwork'
import ArtworkCard from '../../components/ArtworkCard'
import ArtworkDetail from '../../components/ArtworkDetail'
import './index.scss'

const THEMES = ['全部', '戏曲', '神祇', '吉祥', '故事']

export default function CategoriesPage() {
  const router = useRouter()
  const { data } = useGalleryData()
  const [selected, setSelected] = useState<Artwork | null>(null)
  const [theme, setTheme] = useState((router.params as any).theme || '全部')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'grid' | 'list'>('grid')
  const artworks = data?.artworks || []

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase()
    return artworks.filter(a =>
      (theme === '全部' || a.theme.name === theme) &&
      (!kw || [a.title, a.description, ...a.aliases].join(' ').toLowerCase().includes(kw))
    )
  }, [artworks, theme, query])

  const changeSelected = (offset: number) => {
    setSelected(cur => {
      if (!cur) return cur
      const idx = artworks.findIndex(a => a.slug === cur.slug)
      return artworks[(idx + offset + artworks.length) % artworks.length]
    })
  }

  return (
    <View className='cat-page'>
      <View className='cat-topbar'>
        <Text className='cat-title'>藏品</Text>
        <View className='cat-search-row'>
          <View className='search-field'>
            <Input className='search-input' value={query} onInput={e => setQuery(e.detail.value)} placeholder='搜索题名…' placeholderClass='search-ph' />
            {!!query && <Text className='search-clear' onClick={() => setQuery('')}>✕</Text>}
          </View>
          <View className={`view-btn${mode === 'grid' ? ' active' : ''}`} onClick={() => setMode('grid')}><Text>⊞</Text></View>
          <View className={`view-btn${mode === 'list' ? ' active' : ''}`} onClick={() => setMode('list')}><Text>☰</Text></View>
        </View>
      </View>
      <ScrollView scrollX className='theme-tabs-wrap'>
        <View className='theme-tabs'>
          {THEMES.map(t => (
            <View key={t} className={`theme-tab${theme === t ? ' active' : ''}`} onClick={() => setTheme(t)}>
              <Text>{t}</Text>
              <Text className='theme-count'>{t === '全部' ? artworks.length : artworks.filter(a => a.theme.name === t).length}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <ScrollView scrollY className='cat-content'>
        <View className='results-bar'>
          <Text className='results-count'><Text className='results-num'>{filtered.length}</Text> 件</Text>
          {(theme !== '全部' || query) && <Text className='results-reset' onClick={() => { setTheme('全部'); setQuery('') }}>重置</Text>}
        </View>
        <View className={`card-grid${mode === 'list' ? ' is-list' : ''}`}>
          {filtered.map(a => <ArtworkCard key={a.slug} artwork={a} mode={mode} onOpen={setSelected} />)}
        </View>
        {!filtered.length && (
          <View className='empty-state'>
            <Text className='empty-title'>没有找到藏品</Text>
            <Text className='empty-desc'>尝试重置筛选条件</Text>
          </View>
        )}
      </ScrollView>
      <ArtworkDetail artwork={selected} artworks={artworks} onClose={() => setSelected(null)} onChange={changeSelected} />
    </View>
  )
}

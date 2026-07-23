import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Image, Text } from '@tarojs/components'
import './index.scss'

const INTRO_KEY = 'pingyang-intro-seen'
const TITLE_CHARS = '平阳木版年画'.split('')

function shouldShow() {
  try { return Taro.getStorageSync(INTRO_KEY) !== '1' } catch { return true }
}

type Phase = 'doors' | 'seal' | 'text' | 'pause' | 'textFade' | 'doorsOpen' | 'bgReveal' | 'done'

export default function OpeningIntro({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(shouldShow)
  const [phase, setPhase] = useState<Phase>('doors')

  useEffect(() => {
    if (!visible) return
    const seq: [number, Phase][] = [
      [300, 'seal'], [700, 'text'], [3400, 'textFade'],
      [4600, 'doorsOpen'], [5200, 'bgReveal'], [8000, 'done'],
    ]
    const ids = seq.map(([d, p]) => setTimeout(() => setPhase(p), d))
    const doneId = setTimeout(() => {
      try { Taro.setStorageSync(INTRO_KEY, '1') } catch { /**/ }
      setVisible(false); onDone?.()
    }, 8800)
    return () => { ids.forEach(clearTimeout); clearTimeout(doneId) }
  }, [visible])

  const skip = () => {
    try { Taro.setStorageSync(INTRO_KEY, '1') } catch { /**/ }
    setVisible(false); onDone?.()
  }

  if (!visible) return null

  const doorsOpen = ['doorsOpen', 'bgReveal', 'done'].includes(phase)
  const bgVisible = ['bgReveal', 'done'].includes(phase)
  const textOn = ['seal', 'text', 'pause'].includes(phase)
  const textFading = ['textFade', 'doorsOpen', 'bgReveal', 'done'].includes(phase)

  return (
    <View className={`intro-wrap${phase === 'done' ? ' is-done' : ''}`}>
      <View className='intro-skip' onClick={skip}><Text>SKIP</Text></View>
      <Image className={`intro-bg${bgVisible ? ' is-visible' : ''}`} src='/images/py-087/primary.webp' mode='aspectFill' />
      <View className={`intro-glow${bgVisible ? ' is-visible' : ''}`} />
      <View className='intro-door-frame'>
        <View className={`intro-door is-left${doorsOpen ? ' is-open' : ''}`}>
          <View className='door-studs' />
          <View className='door-ring' />
          <View className={`door-seal${phase !== 'doors' ? ' is-visible' : ''}`}><Text>平</Text></View>
        </View>
        <View className={`intro-door is-right${doorsOpen ? ' is-open' : ''}`}>
          <View className='door-studs' />
          <View className='door-ring' />
        </View>
      </View>
      <View className={`intro-crack${doorsOpen ? ' is-hidden' : phase !== 'doors' ? ' is-visible' : ''}`} />
      <View className={`intro-title${textFading ? ' is-fading' : ''}`}>
        <Text className={`intro-eyebrow${textOn ? ' is-visible' : ''}`}>山西临汾 · 国家级非物质文化遗产</Text>
        <View className='intro-chars'>
          {TITLE_CHARS.map((c, i) => (
            <Text key={i} className={`intro-char${textOn ? ' is-visible' : ''}`} style={{ transitionDelay: `${i * 90}ms` }}>{c}</Text>
          ))}
        </View>
        <Text className={`intro-sub${textOn ? ' is-visible' : ''}`} style={{ transitionDelay: '600ms' }}>数字馆藏</Text>
      </View>
    </View>
  )
}

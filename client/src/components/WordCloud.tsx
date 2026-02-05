import type { WordFrequency } from '../types'
import './WordCloud.css'

interface WordCloudProps {
  words: WordFrequency[]
  maxWords?: number
}

export default function WordCloud({ words, maxWords = 30 }: WordCloudProps) {
  if (words.length === 0) {
    return (
      <div className="wordcloud-empty">
        <p>עדיין אין ניחושים</p>
        <p className="wordcloud-empty-hint">היה הראשון לנחש!</p>
      </div>
    )
  }

  // Take top N words
  const topWords = words.slice(0, maxWords)
  
  // Find max value for scaling
  const maxValue = Math.max(...topWords.map(w => w.value))
  const minValue = Math.min(...topWords.map(w => w.value))
  
  // Calculate font size based on frequency (range: 0.8rem to 2.5rem)
  const getFontSize = (value: number): number => {
    if (maxValue === minValue) return 1.5 // All same frequency
    const normalized = (value - minValue) / (maxValue - minValue)
    return 0.8 + normalized * 1.7 // Range: 0.8rem to 2.5rem
  }
  
  // Get opacity based on frequency (range: 0.6 to 1)
  const getOpacity = (value: number): number => {
    if (maxValue === minValue) return 1
    const normalized = (value - minValue) / (maxValue - minValue)
    return 0.6 + normalized * 0.4
  }

  // Shuffle words for visual variety (but keep relative sizing)
  const shuffledWords = [...topWords].sort(() => Math.random() - 0.5)

  return (
    <div className="wordcloud">
      {shuffledWords.map((word, index) => (
        <span
          key={`${word.text}-${index}`}
          className="wordcloud-word"
          style={{
            fontSize: `${getFontSize(word.value)}rem`,
            opacity: getOpacity(word.value),
          }}
          title={`${word.text}: ${word.value} ${word.value === 1 ? 'ניחוש' : 'ניחושים'}`}
        >
          {word.text}
        </span>
      ))}
    </div>
  )
}

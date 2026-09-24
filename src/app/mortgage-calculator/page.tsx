import TopicPage, { topicMetadata } from '@/components/marketing/TopicPage'
import MortgageCalculator from '@/components/marketing/MortgageCalculator'
import { getTopic } from '@/content/topics'
import { logger } from '@/lib/logger'
import { getCachedRates } from '@/lib/mortgage/rates'

// Picks up the weekly Freddie Mac average for the default rate
export const revalidate = 86400

const topic = getTopic('/mortgage-calculator')

export const metadata = topicMetadata(topic)

const FALLBACK_RATE = 6.5

async function latestAverageRate() {
  try {
    const [latest] = await getCachedRates()
    if (latest?.rate30yr) {
      const week = new Date(latest.weekOf + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return { rate: latest.rate30yr, note: `Freddie Mac 30-year average, week of ${week}` }
    }
  } catch (error) {
    logger.error('mortgage-calculator', 'Failed to load Freddie Mac rates', error)
  }
  return { rate: FALLBACK_RATE, note: 'Example rate; enter the rate you were quoted' }
}

export default async function Page() {
  const { rate, note } = await latestAverageRate()
  return (
    <TopicPage topic={topic}>
      <MortgageCalculator defaultRate={rate} rateNote={note} />
    </TopicPage>
  )
}

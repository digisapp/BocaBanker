import TopicPage, { topicMetadata } from '@/components/marketing/TopicPage'
import { getTopic } from '@/content/topics'

const topic = getTopic('/refinance')

export const metadata = topicMetadata(topic)

export default function Page() {
  return <TopicPage topic={topic} />
}

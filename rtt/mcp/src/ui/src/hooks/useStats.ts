import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/services/api'

export function useStats(refreshInterval = 2000) {
  return useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getStats,
    refetchInterval: refreshInterval,
  })
}

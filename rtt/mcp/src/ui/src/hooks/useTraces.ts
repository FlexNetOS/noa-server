import { useQuery } from '@tanstack/react-query'
import { tracesApi } from '@/services/api'

export function useTraces(limit = 100, refreshInterval = 2000) {
  return useQuery({
    queryKey: ['traces', limit],
    queryFn: () => tracesApi.getTraces(limit),
    refetchInterval: refreshInterval,
  })
}

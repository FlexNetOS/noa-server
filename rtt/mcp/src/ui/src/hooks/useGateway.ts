import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gatewayApi } from '@/services/api'
import type { GatewayConfig } from '@/types'

export function useGatewayConfig() {
  return useQuery({
    queryKey: ['gateway-config'],
    queryFn: gatewayApi.getConfig,
  })
}

export function useUpdateGatewayConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: Partial<GatewayConfig>) => gatewayApi.updateConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-config'] })
    },
  })
}

export function useTestUpstream() {
  return useMutation({
    mutationFn: (upstreamId: string) => gatewayApi.testUpstream(upstreamId),
  })
}

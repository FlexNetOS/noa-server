import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantsApi } from '@/services/api'
import type { Tenant } from '@/types'

export function useTenants(refreshInterval = 2000) {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.getTenants,
    refetchInterval: refreshInterval,
  })
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.getTenant(id),
    enabled: !!id,
  })
}

export function useTenantRecords(id: string, limit = 100) {
  return useQuery({
    queryKey: ['tenant-records', id, limit],
    queryFn: () => tenantsApi.getTenantRecords(id, limit),
    enabled: !!id,
    refetchInterval: 2000,
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tenantsApi.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tenant> }) =>
      tenantsApi.updateTenant(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.id] })
    },
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tenantsApi.deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

import { TenantConfig } from '@/config/types'

export const amazonTenant: TenantConfig = {
    url: process.env.AMAZON_URL ?? '',
    name: 'Amazon India',
}

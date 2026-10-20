export const RANDOM_DOMAIN = 'random'
export const DOMAIN_CHOICE_KEY = 'findDomainChoice'

export function validDomainChoice(value, domains) {
  return value === RANDOM_DOMAIN || domains.includes(value) ? value : domains[0] || ''
}

export function addressAtDomain(address, domain, domains) {
  const parts = String(address || '').split('@')
  if (parts.length !== 2 || !/^[a-z0-9._%+-]{1,64}$/i.test(parts[0]) || !domains.includes(domain)) return ''
  return `${parts[0].toLowerCase()}@${domain}`
}

// Domain registration via Namecheap Reseller API
// Called after Stripe payment is confirmed
// Requires env vars: NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP

const NAMECHEAP_API = 'https://api.namecheap.com/xml.response'

export async function registerDomain(domain, contactInfo) {
  const apiUser = process.env.NAMECHEAP_API_USER
  const apiKey = process.env.NAMECHEAP_API_KEY
  const clientIp = process.env.NAMECHEAP_CLIENT_IP || '127.0.0.1'

  if (!apiUser || !apiKey) {
    throw new Error('Namecheap API credentials not configured')
  }

  const [sld, ...tldParts] = domain.split('.')
  const tld = tldParts.join('.')

  // Default contact info for domain registration
  const contact = {
    FirstName: contactInfo?.firstName || 'ToGoGo',
    LastName: contactInfo?.lastName || 'Customer',
    Address1: contactInfo?.address || '123 Main St',
    City: contactInfo?.city || 'Sydney',
    StateProvince: contactInfo?.state || 'NSW',
    PostalCode: contactInfo?.postalCode || '2000',
    Country: contactInfo?.country || 'AU',
    Phone: contactInfo?.phone || '+61.400000000',
    EmailAddress: contactInfo?.email || 'domains@togogo.me',
    ...contactInfo,
  }

  const params = new URLSearchParams({
    ApiUser: apiUser,
    ApiKey: apiKey,
    UserName: apiUser,
    ClientIp: clientIp,
    Command: 'namecheap.domains.create',
    DomainName: domain,
    Years: '1',
    // Registrant contact
    RegistrantFirstName: contact.FirstName,
    RegistrantLastName: contact.LastName,
    RegistrantAddress1: contact.Address1,
    RegistrantCity: contact.City,
    RegistrantStateProvince: contact.StateProvince,
    RegistrantPostalCode: contact.PostalCode,
    RegistrantCountry: contact.Country,
    RegistrantPhone: contact.Phone,
    RegistrantEmailAddress: contact.EmailAddress,
    // Tech contact (same)
    TechFirstName: contact.FirstName,
    TechLastName: contact.LastName,
    TechAddress1: contact.Address1,
    TechCity: contact.City,
    TechStateProvince: contact.StateProvince,
    TechPostalCode: contact.PostalCode,
    TechCountry: contact.Country,
    TechPhone: contact.Phone,
    TechEmailAddress: contact.EmailAddress,
    // Admin contact (same)
    AdminFirstName: contact.FirstName,
    AdminLastName: contact.LastName,
    AdminAddress1: contact.Address1,
    AdminCity: contact.City,
    AdminStateProvince: contact.StateProvince,
    AdminPostalCode: contact.PostalCode,
    AdminCountry: contact.Country,
    AdminPhone: contact.Phone,
    AdminEmailAddress: contact.EmailAddress,
    // Billing contact (same)
    AuxBillingFirstName: contact.FirstName,
    AuxBillingLastName: contact.LastName,
    AuxBillingAddress1: contact.Address1,
    AuxBillingCity: contact.City,
    AuxBillingStateProvince: contact.StateProvince,
    AuxBillingPostalCode: contact.PostalCode,
    AuxBillingCountry: contact.Country,
    AuxBillingPhone: contact.Phone,
    AuxBillingEmailAddress: contact.EmailAddress,
    // Nameservers — point to Cloudflare by default (free DNS)
    Nameservers: 'ns1.togogo.me,ns2.togogo.me',
    AddFreeWhoisguard: 'yes',
    WGEnabled: 'yes',
  })

  const res = await fetch(`${NAMECHEAP_API}?${params.toString()}`)
  const text = await res.text()

  // Parse XML response
  const success = text.includes('Status="OK"') || text.includes('Registered="true"')
  const errorMatch = text.match(/<Error[^>]*>(.*?)<\/Error>/s)

  if (!success) {
    throw new Error(errorMatch ? errorMatch[1].trim() : 'Domain registration failed')
  }

  return {
    domain,
    registered: true,
    whoisGuard: true,
    years: 1,
  }
}

// Check domain availability via Namecheap (more accurate than DNS)
export async function checkAvailability(domain) {
  const apiUser = process.env.NAMECHEAP_API_USER
  const apiKey = process.env.NAMECHEAP_API_KEY
  const clientIp = process.env.NAMECHEAP_CLIENT_IP || '127.0.0.1'

  if (!apiUser || !apiKey) return null // Fall back to DNS check

  const params = new URLSearchParams({
    ApiUser: apiUser,
    ApiKey: apiKey,
    UserName: apiUser,
    ClientIp: clientIp,
    Command: 'namecheap.domains.check',
    DomainList: domain,
  })

  const res = await fetch(`${NAMECHEAP_API}?${params.toString()}`)
  const text = await res.text()
  const available = text.includes('Available="true"')
  return available
}

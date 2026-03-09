import { useState, useEffect } from 'react'
import {
  Settings, Save, Key, Shield, Gift,
  Eye, EyeOff, Check, AlertCircle, Loader2, Plus, Trash2,
  Megaphone, CreditCard, Database
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

// All configurable sections
const SECTIONS = [
  {
    id: 'referral_links',
    label: 'Referral Links',
    icon: Gift,
    color: '#FFD23F',
    desc: 'Affiliate/referral URLs for each selling platform. Users who sign up through these earn you commission.',
    fields: [
      { key: 'referral_shopify', label: 'Shopify', placeholder: 'https://shopify.pxf.io/your-id' },
      { key: 'referral_woocommerce', label: 'WooCommerce', placeholder: 'https://woocommerce.com/?aff=your-id' },
      { key: 'referral_squarespace', label: 'Squarespace', placeholder: 'https://squarespace.syuh.net/your-id' },
      { key: 'referral_bigcommerce', label: 'BigCommerce', placeholder: 'https://bigcommerce.pxf.io/your-id' },
      { key: 'referral_wix', label: 'Wix', placeholder: 'https://wix.pxf.io/your-id' },
      { key: 'referral_prestashop', label: 'PrestaShop', placeholder: 'https://prestashop.com/?ref=your-id' },
      { key: 'referral_bigcartel', label: 'Big Cartel', placeholder: 'https://bigcartel.com/?ref=your-id' },
      { key: 'referral_amazon', label: 'Amazon', placeholder: 'https://sell.amazon.com/?ref=your-id' },
      { key: 'referral_ebay', label: 'eBay', placeholder: 'https://ebay.pxf.io/your-id' },
      { key: 'referral_etsy', label: 'Etsy', placeholder: 'https://etsy.me/your-id' },
      { key: 'referral_tiktok', label: 'TikTok Shop', placeholder: 'https://seller.tiktok.com/?ref=your-id' },
      { key: 'referral_facebook', label: 'Facebook Marketplace', placeholder: '' },
      { key: 'referral_depop', label: 'Depop', placeholder: 'https://depop.com/?ref=your-id' },
    ],
  },
  {
    id: 'platform_api_keys',
    label: 'Platform API Keys',
    icon: Key,
    color: '#FF6B35',
    desc: 'OAuth app credentials for connecting to selling platforms on behalf of users.',
    fields: [
      { key: 'shopify_api_key', label: 'Shopify API Key', placeholder: 'Your Shopify app API key', secret: true },
      { key: 'shopify_api_secret', label: 'Shopify API Secret', placeholder: 'Your Shopify app secret', secret: true },
      { key: 'etsy_api_key', label: 'Etsy API Key (Keystring)', placeholder: 'Your Etsy app keystring', secret: true },
      { key: 'ebay_client_id', label: 'eBay Client ID', placeholder: 'Your eBay app ID', secret: true },
      { key: 'ebay_client_secret', label: 'eBay Client Secret', placeholder: 'Your eBay cert ID', secret: true },
      { key: 'amazon_app_id', label: 'Amazon App ID', placeholder: 'Your SP-API app ID', secret: true },
      { key: 'tiktok_app_key', label: 'TikTok App Key', placeholder: 'Your TikTok Shop app key', secret: true },
      { key: 'bigcommerce_client_id', label: 'BigCommerce Client ID', placeholder: 'Your BigCommerce app client ID', secret: true },
      { key: 'squarespace_client_id', label: 'Squarespace Client ID', placeholder: 'Your Squarespace client ID', secret: true },
      { key: 'wix_app_id', label: 'Wix App ID', placeholder: 'Your Wix app ID', secret: true },
      { key: 'bigcartel_client_id', label: 'Big Cartel Client ID', placeholder: 'Your Big Cartel client ID', secret: true },
      { key: 'facebook_app_id', label: 'Facebook App ID', placeholder: 'Your Meta app ID', secret: true },
    ],
  },
  {
    id: 'supplier_api_keys',
    label: 'Supplier API Keys',
    icon: Database,
    color: '#06D6A0',
    desc: 'API keys for dropshipping suppliers. These are used server-side to search and fulfil products.',
    fields: [
      { key: 'cj_api_key', label: 'CJ Dropshipping API Key', placeholder: 'Your CJ API key', secret: true },
      { key: 'printful_api_key', label: 'Printful API Key', placeholder: 'Your Printful API key', secret: true },
      { key: 'printify_api_key', label: 'Printify API Key', placeholder: 'Your Printify API key', secret: true },
      { key: 'gooten_api_key', label: 'Gooten API Key', placeholder: 'Your Gooten recipe ID', secret: true },
    ],
  },
  {
    id: 'payments',
    label: 'Payment Config',
    icon: CreditCard,
    color: '#a78bfa',
    desc: 'Stripe and payment processing configuration.',
    fields: [
      { key: 'stripe_secret_key', label: 'Stripe Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'stripe_publishable_key', label: 'Stripe Publishable Key', placeholder: 'pk_live_...' },
      { key: 'stripe_webhook_secret', label: 'Stripe Webhook Secret', placeholder: 'whsec_...', secret: true },
      { key: 'platform_fee_percent', label: 'ToGoGo Commission (%)', placeholder: '5' },
    ],
  },
  {
    id: 'social_api_keys',
    label: 'Social Media APIs',
    icon: Megaphone,
    color: '#E1306C',
    desc: 'API keys for auto-promotion across social media (for the Promotions feature).',
    fields: [
      { key: 'instagram_access_token', label: 'Instagram Access Token', placeholder: 'Your Instagram Graph API token', secret: true },
      { key: 'facebook_page_token', label: 'Facebook Page Token', placeholder: 'Your Facebook page access token', secret: true },
      { key: 'tiktok_creator_token', label: 'TikTok Creator Token', placeholder: 'Your TikTok creator API token', secret: true },
      { key: 'twitter_api_key', label: 'X (Twitter) API Key', placeholder: 'Your Twitter API key', secret: true },
      { key: 'twitter_api_secret', label: 'X (Twitter) API Secret', placeholder: 'Your Twitter API secret', secret: true },
      { key: 'pinterest_access_token', label: 'Pinterest Access Token', placeholder: 'Your Pinterest API token', secret: true },
      { key: 'youtube_api_key', label: 'YouTube API Key', placeholder: 'Your YouTube Data API key', secret: true },
    ],
  },
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    color: '#9CA3AF',
    desc: 'General platform settings.',
    fields: [
      { key: 'site_name', label: 'Site Name', placeholder: 'ToGoGo' },
      { key: 'support_email', label: 'Support Email', placeholder: 'support@togogo.me' },
      { key: 'frontend_url', label: 'Frontend URL', placeholder: 'https://togogo.me' },
      { key: 'api_base_url', label: 'API Base URL', placeholder: 'https://api.togogo.me' },
    ],
  },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState({})
  const [activeSection, setActiveSection] = useState('referral_links')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [visibleSecrets, setVisibleSecrets] = useState({})
  const [customFields, setCustomFields] = useState([])

  // Build auth headers — use token if logged in, otherwise try setup secret
  const getAuthHeaders = () => {
    const token = localStorage.getItem('togogo-token')
    if (token) return { Authorization: `Bearer ${token}` }
    const secret = sessionStorage.getItem('togogo-setup-secret')
    if (secret) return { 'x-setup-secret': secret }
    return {}
  }

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/admin/settings`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) throw new Error('Failed to load settings')
        const data = await res.json()

        const map = {}
        for (const row of data) {
          map[row.key] = row.value
        }
        setSettings(map)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const section = SECTIONS.find((s) => s.id === activeSection)
      const allFields = [...(section?.fields || []), ...customFields.filter((f) => f.category === activeSection)]

      const rows = allFields.map((f) => ({
        key: f.key,
        value: settings[f.key] || '',
        category: activeSection,
        label: f.label,
        is_secret: f.secret || false,
      }))

      const res = await fetch(`${API_BASE}/api/admin/settings/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ settings: rows }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || `Failed to save settings (${res.status})`)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleSecret = (key) => {
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const addCustomField = () => {
    const key = `custom_${activeSection}_${Date.now()}`
    setCustomFields((prev) => [
      ...prev,
      { key, label: '', placeholder: 'Value', category: activeSection, secret: false, custom: true },
    ])
  }

  const removeCustomField = (key) => {
    setCustomFields((prev) => prev.filter((f) => f.key !== key))
    setSettings((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const updateCustomFieldLabel = (key, label) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, label } : f))
    )
  }

  const currentSection = SECTIONS.find((s) => s.id === activeSection)
  const sectionCustomFields = customFields.filter((f) => f.category === activeSection)

  return (
    <div>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/10">
                <Shield className="h-5 w-5 text-[#FF6B35]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
                <p className="text-sm text-zinc-500">Manage referral links, API keys, and platform configuration</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-400 text-sm">
              Dismiss
            </button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0">
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    activeSection === s.id
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <s.icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: activeSection === s.id ? s.color : undefined }}
                  />
                  {s.label}
                  {/* Show count of filled fields */}
                  {(() => {
                    const filled = s.fields.filter((f) => settings[f.key]).length
                    if (filled === 0) return null
                    return (
                      <span className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-[#06D6A0]/10 text-[#06D6A0]">
                        {filled}
                      </span>
                    )
                  })()}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-zinc-700 animate-spin" />
              </div>
            ) : (
              <div className="rounded-2xl bg-[#111] p-6">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-2">
                  {currentSection && (
                    <currentSection.icon className="h-5 w-5" style={{ color: currentSection.color }} />
                  )}
                  <h2 className="text-lg font-semibold text-white">{currentSection?.label}</h2>
                </div>
                <p className="text-sm text-zinc-500 mb-6">{currentSection?.desc}</p>

                {/* Fields */}
                <div className="space-y-4">
                  {currentSection?.fields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-300">
                        {field.label}
                        {field.secret && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase">
                            Secret
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={field.secret && !visibleSecrets[field.key] ? 'password' : 'text'}
                          value={settings[field.key] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 pr-10"
                        />
                        {field.secret && (
                          <button
                            onClick={() => toggleSecret(field.key)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                          >
                            {visibleSecrets[field.key] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                      {settings[field.key] && (
                        <p className="mt-1 text-[11px] text-[#06D6A0] font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" /> Configured
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Custom fields added by admin */}
                  {sectionCustomFields.map((field) => (
                    <div key={field.key} className="relative rounded-xl border border-dashed border-white/[0.1] p-4">
                      <button
                        onClick={() => removeCustomField(field.key)}
                        className="absolute top-3 right-3 text-zinc-600 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="mb-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateCustomFieldLabel(field.key, e.target.value)}
                          placeholder="Field name..."
                          className="w-2/3 rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-1.5 text-sm font-medium text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={settings[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder="Value..."
                        className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
                      />
                    </div>
                  ))}

                  {/* Add custom field */}
                  <button
                    onClick={addCustomField}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-white/[0.1] px-4 py-3 text-sm font-medium text-zinc-500 hover:text-[#FF6B35] hover:border-[#FF6B35]/30 transition-colors w-full justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    Add Custom Field
                  </button>
                </div>

                {/* Save button (bottom) */}
                <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between">
                  <p className="text-xs text-zinc-600">
                    {currentSection?.fields.filter((f) => settings[f.key]).length} of {currentSection?.fields.length} fields configured
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

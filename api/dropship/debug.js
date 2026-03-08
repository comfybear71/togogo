// Temporary diagnostic endpoint — test each supplier API individually
import { searchCJ, searchAliExpress, searchPrintful, searchPrintify, searchGooten } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = req.query.q || 'phone case'
  const results = {}

  // Check which env vars are set
  results.envVars = {
    CJ_DROPSHIPPING_API_KEY: !!process.env.CJ_DROPSHIPPING_API_KEY,
    ALIEXPRESS_APP_KEY: !!process.env.ALIEXPRESS_APP_KEY,
    ALIEXPRESS_APP_SECRET: !!process.env.ALIEXPRESS_APP_SECRET,
    PRINTFUL_API_KEY: !!process.env.PRINTFUL_API_KEY,
    PRINTIFY_API_KEY: !!process.env.PRINTIFY_API_KEY,
    GOOTEN_RECIPE_ID: !!process.env.GOOTEN_RECIPE_ID,
    GOOTEN_PARTNER_BILLING_KEY: !!process.env.GOOTEN_PARTNER_BILLING_KEY,
  }

  // Raw API test for CJ
  try {
    const cjKey = process.env.CJ_DROPSHIPPING_API_KEY
    const cjAuth = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cjKey }),
    })
    const cjAuthData = await cjAuth.json()
    results.cjAuth = {
      status: cjAuth.status,
      hasToken: !!cjAuthData.data?.accessToken,
      code: cjAuthData.code,
      message: cjAuthData.message,
      result: cjAuthData.result,
    }

    if (cjAuthData.data?.accessToken) {
      const cjParams = new URLSearchParams({ productNameEn: query, pageNum: '1', pageSize: '5' })
      const cjSearch = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/list?${cjParams}`, {
        method: 'GET',
        headers: { 'CJ-Access-Token': cjAuthData.data.accessToken },
      })
      const cjSearchData = await cjSearch.json()
      results.cjSearch = {
        status: cjSearch.status,
        code: cjSearchData.code,
        message: cjSearchData.message,
        total: cjSearchData.data?.total || cjSearchData.data?.list?.length || 0,
        firstTitle: cjSearchData.data?.list?.[0]?.productNameEn,
      }
    }
  } catch (e) {
    results.cjAuth = { error: e.message }
  }

  // Raw API test for AliExpress
  try {
    const aeKey = process.env.ALIEXPRESS_APP_KEY
    const aeSecret = process.env.ALIEXPRESS_APP_SECRET
    const { default: crypto } = await import('crypto')
    const params = {
      app_key: aeKey,
      method: 'aliexpress.ds.feedname.get',
      sign_method: 'hmac-sha256',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      format: 'json',
      v: '2.0',
    }
    const sorted = Object.keys(params).filter(k => k !== 'sign').sort().map(k => `${k}${params[k]}`).join('')
    params.sign = crypto.createHmac('sha256', aeSecret).update(sorted).digest('hex').toUpperCase()

    const aeRes = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(params)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const aeData = await aeRes.json()
    const respResult = aeData?.aliexpress_ds_feedname_get_response?.resp_result?.result
    const promos = respResult?.promos?.promo || []
    const feedName = promos[0]?.promo_name || 'DS bestselling products'
    results.aliexpressRaw = {
      status: aeRes.status,
      feeds: promos.length,
      firstFeed: feedName,
      error: aeData?.error_response?.msg,
      code: aeData?.error_response?.code,
      raw: JSON.stringify(aeData).slice(0, 500),
    }

    // Also test feed product fetch
    if (promos.length > 0) {
      try {
        const feedParams = {
          app_key: aeKey,
          method: 'aliexpress.ds.recommend.feed.get',
          sign_method: 'hmac-sha256',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          format: 'json',
          v: '2.0',
          feed_name: feedName,
          target_currency: 'USD',
          target_language: 'EN',
          page_no: '1',
          page_size: '5',
          sort: 'volumeDesc',
        }
        const feedSorted = Object.keys(feedParams).filter(k => k !== 'sign').sort().map(k => `${k}${feedParams[k]}`).join('')
        feedParams.sign = crypto.createHmac('sha256', aeSecret).update(feedSorted).digest('hex').toUpperCase()
        const feedRes = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(feedParams)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        const feedData = await feedRes.json()
        const feedResp = feedData?.aliexpress_ds_recommend_feed_get_response
        const feedResult = feedResp?.resp_result?.result || feedResp?.result
        results.aliexpressFeed = {
          status: feedRes.status,
          productCount: feedResult?.products?.product?.length || 0,
          firstTitle: feedResult?.products?.product?.[0]?.product_title?.slice(0, 60),
          error: feedData?.error_response?.msg,
          raw: JSON.stringify(feedData).slice(0, 500),
        }
      } catch (e2) {
        results.aliexpressFeed = { error: e2.message }
      }
    }
  } catch (e) {
    results.aliexpressRaw = { error: e.message }
  }

  // Test each supplier individually
  const suppliers = [
    { name: 'CJ Dropshipping', fn: () => searchCJ(query) },
    { name: 'AliExpress', fn: () => searchAliExpress(query) },
    { name: 'Printful', fn: () => searchPrintful(query) },
    { name: 'Printify', fn: () => searchPrintify(query) },
    { name: 'Gooten', fn: () => searchGooten(query) },
  ]

  for (const { name, fn } of suppliers) {
    const start = Date.now()
    try {
      const products = await fn()
      const liveCount = products.filter(p => p._live).length
      const sampleCount = products.filter(p => !p._live).length
      const withImages = products.filter(p => p.image && p.image.length > 0).length
      results[name] = {
        total: products.length,
        live: liveCount,
        sample: sampleCount,
        withImages,
        ms: Date.now() - start,
        firstProduct: products[0] ? {
          title: products[0].title?.slice(0, 60),
          image: products[0].image ? 'yes' : 'no',
          _live: products[0]._live,
        } : null,
      }
    } catch (error) {
      results[name] = { error: error.message, ms: Date.now() - start }
    }
  }

  return res.status(200).json(results)
}

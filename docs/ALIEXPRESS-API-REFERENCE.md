# AliExpress DS (Dropshipping) API Reference

> **Last Updated:** 2026-04-08  
> **API Endpoint:** `https://api-sg.aliexpress.com/sync` (POST)  
> **App Console:** https://openservice.aliexpress.com  
> **API Docs:** https://openservice.aliexpress.com/doc/api.htm#/api?cid=21038  
> **DS Center:** https://inbusiness.aliexpress.com  

---

## Table of Contents

1. [Authentication](#authentication)
2. [Currently Implemented APIs](#currently-implemented-apis)
3. [Available But Not Yet Implemented](#available-but-not-yet-implemented)
4. [Active Feeds](#active-feeds)
5. [Known Issues & Workarounds](#known-issues--workarounds)
6. [Files Using AliExpress APIs](#files-using-aliexpress-apis)

---

## Authentication

### Base Parameters (ALL API calls)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `app_key` | `ALIEXPRESS_APP_KEY` env var | App identification |
| `method` | API method name | e.g. `aliexpress.ds.order.create` |
| `sign_method` | `hmac-sha256` | Signature algorithm |
| `timestamp` | `YYYY-MM-DD HH:MM:SS` | ISO 8601 format |
| `format` | `json` | Response format |
| `v` | `2.0` | API version |
| `sign` | HMAC-SHA256 hash | Calculated signature (see below) |

### HMAC-SHA256 Signature

1. Sort all parameters alphabetically (excluding `sign`)
2. Concatenate as: `key1value1key2value2...`
3. Generate: `HMAC-SHA256(concatenated, ALIEXPRESS_APP_SECRET)` → UPPERCASE HEX
4. Include as `sign` parameter

### OAuth Token (for authenticated APIs)

- Stored in database: `admin_settings` table, key `aliexpress_access_token`
- JSON format: `{ access_token, expires_at, seller_id, account }`
- Added as `access_token` parameter to authenticated API calls
- Some APIs work WITHOUT OAuth (public/app-level auth only)

### Error Response Format

```json
{
  "error_response": {
    "code": "ErrorCode",
    "msg": "Error message"
  }
}
```

---

## Currently Implemented APIs

### 1. `aliexpress.ds.order.create`

> **"AE DS Order Create and Pay API"** — Place order in DS business with auto-pay

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `submitOrder()` |
| **Auth** | OAuth access_token required |
| **Auto-Pay** | YES — triggers DS Center auto-pay (PayPal/card) |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `param_place_order_request4_open_api_d_t_o` | Object (JSON string) | Yes | Order details (see below) |
| `ds_extend_request` | Object (JSON string) | No | DS ExtendParam (may contain auto-pay flags) |

**`param_place_order_request4_open_api_d_t_o` structure:**

```json
{
  "logistics_address": {
    "address": "123 Main St",
    "city": "Sydney",
    "country": "AU",
    "contact_person": "John Smith",
    "full_name": "John Smith",
    "mobile_no": "0412345678",
    "phone_country": "+61",
    "province": "New South Wales",
    "zip": "2000"
  },
  "product_items": [{
    "product_id": 1005001234567,
    "product_count": 1,
    "sku_attr": "14:771#Blue;5:100014065",
    "logistics_service_name": "CAINIAO_STANDARD",
    "order_memo": "ToGoGo dropship order"
  }],
  "promotion": {
    "promotion_code": "OPTIONAL_COUPON"
  }
}
```

**`ds_extend_request` structure:** (NOT YET DOCUMENTED — needs expansion from API docs)
- May contain auto-pay configuration flags
- TODO: Click `>` arrow on API docs page to see fields

**Response:**

```json
{
  "result": {
    "error_msg": "",
    "error_code": "",
    "is_success": "true",
    "order_list": [1000000000],
    "code": "0",
    "request_id": "0ba288731517817801722101"
  }
}
```

**Error Codes:**

| Code | Message | Solution |
|------|---------|----------|
| B_DROPSHIPPER_DELIVERY_ADDRESS_VALIDATE_FAIL | Address validation failed | Check the shipping address |
| B_DROPSHIPPER_DELIVERY_ADDRESS_CPF_CN_INVALID | CPF error | Check CPF (Brazil only) |
| PARM_ILLEGL | Parameter illegal | Check param format |

**Our Response Parsing:**
```javascript
const result = data?.aliexpress_ds_order_create_response?.result
  || data?.aliexpress_trade_buy_placeorder_response?.result  // fallback
  || data?.result
```

---

### 2. `aliexpress.ds.product.get`

> **Product info query for DS** — Full product details with variants, shipping, images

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `getProductDetails()` |
| **Auth** | OAuth access_token required |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `product_id` | String | Yes | AliExpress product ID |
| `target_currency` | String | No | Currency code (NOTE: API ignores this, always returns USD) |
| `target_language` | String | No | Language code (e.g. 'EN') |
| `ship_to_country` | String | No | Destination country ISO code (e.g. 'AU') |

**Response Structure:**
```
aliexpress_ds_product_get_response.result
├── ae_item_base_info_dto
│   ├── product_id
│   ├── subject (title)
│   ├── product_price (original price, USD)
│   ├── sale_price (discounted price, USD)
│   ├── category_id
│   ├── sales_count
│   └── avg_evaluation_rating
├── ae_multimedia_info_dto
│   ├── image_urls (comma-separated)
│   └── ae_video_dtos (video list)
├── ae_item_sku_info_dtos
│   └── ae_item_sku_info_d_t_o[] (variants)
│       ├── sku_attr
│       ├── sku_price
│       ├── sku_stock
│       └── ae_sku_property_dtos (size, color, etc.)
├── logistics_info_dto
│   └── logistics_info_list[] (shipping options)
│       ├── logistics_company
│       ├── freight (cost object)
│       ├── estimated_delivery_time
│       └── tracking_available
└── ae_store_info
    ├── store_name
    └── store_rating
```

---

### 3. `aliexpress.ds.feedname.get`

> **Fetch feed names** — Returns all available product feeds (135+ feeds)

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `getFeedNames()` |
| **Auth** | NO OAuth required (app-level auth) |
| **Cache** | 1 hour TTL |

**Parameters:** None

**Response:**
```
aliexpress_ds_feedname_get_response.resp_result.result
└── promos
    └── promo[]
        ├── promo_name / feed_name
        └── product_num (count of products)
```

---

### 4. `aliexpress.ds.recommend.feed.get`

> **Fetch products from a feed** — Main product import source (50 per page)

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `fetchFeedProducts()` |
| **Auth** | NO OAuth required (app-level auth) |
| **Cache** | 10 minutes (product pool) |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `feed_name` | String | Yes | Feed name from feedname.get |
| `country` | String | No | Target country (e.g. 'AU') |
| `target_currency` | String | No | Currency (ignored, returns USD) |
| `target_language` | String | No | Language (e.g. 'EN') |
| `page_no` | String | No | Page number (1-indexed) |
| `page_size` | String | No | Items per page (max 50) |
| `sort` | String | No | Sort order (e.g. 'volumeDesc') |

**Response:**
```
aliexpress_ds_recommend_feed_get_response.result
├── products
│   └── traffic_product_d_t_o[] / product[]
│       ├── product_id
│       ├── product_title
│       ├── product_main_image_url
│       ├── product_small_image_urls
│       ├── target_sale_price (USD despite param)
│       ├── target_original_price (USD)
│       ├── evaluate_rate (rating)
│       ├── lastest_volume (sales count)
│       ├── first_level_category_name
│       ├── second_level_category_id
│       ├── promotion_link
│       ├── ship_to_days
│       └── logistics_type
├── total_record_count
└── is_finished (boolean)
```

---

### 5. `aliexpress.ds.member.order.get`

> **DS member order query** — Order status and tracking info

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `getOrderTracking()` |
| **Auth** | OAuth access_token required |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `order_id` | String | Yes | AliExpress order ID |

**Response:**
```
aliexpress_ds_member_order_get_response.result
├── order_id
├── order_status
├── logistics_status
├── logistics_info
│   ├── tracking_number
│   ├── tracking_url
│   ├── logistics_company
│   └── estimated_delivery_time
├── send_goods_date
└── (other order details)
```

**Order Statuses:** `PLACE_ORDER_SUCCESS`, `IN_CANCEL`, `WAIT_SELLER_SEND_GOODS`, `SELLER_PART_SEND_GOODS`, `WAIT_BUYER_ACCEPT_GOODS`, `FUND_PROCESSING`, `FINISH`, `IN_ISSUE`, `IN_FROZEN`, `WAIT_SELLER_EXAMINE_MONEY`, `RISK_CONTROL`

---

### 6. `aliexpress.logistics.buyer.freight.calculate`

> **Freight calculation** — Calculate exact shipping costs

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `calculateFreight()` |
| **Auth** | NO OAuth required (app-level auth) |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `param_aeop_freight_calculate_for_buyer_d_t_o` | Object (JSON string) | Yes | Freight calculation request |

**Request structure:**
```json
{
  "product_id": 1005001234567,
  "product_num": 1,
  "country_code": "AU",
  "send_goods_country_code": "CN",
  "sku_id": "optional"
}
```

**Response:**
```
aliexpress_logistics_buyer_freight_calculate_response.result
├── success (boolean)
└── aeop_freight_calculate_result_for_buyer_d_t_o_list
    └── aeop_freight_calculate_result_for_buyer_dto[]
        ├── service_name (e.g. "CAINIAO_STANDARD")
        ├── freight
        │   ├── amount (e.g. "3.50")
        │   ├── cent (e.g. 350)
        │   └── currency_code (e.g. "USD")
        ├── estimated_delivery_time (days)
        └── tracking_available (boolean)
```

---

### 7. `aliexpress.ds.member.orderdata.submit`

> **Report order for DS level** — Builds dropshipping membership level for discounts

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `reportOrderForDSLevel()` |
| **Auth** | OAuth access_token required |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ae_product_id` | String | Yes | AliExpress product ID |
| `ae_orderid` | String | Yes | AliExpress order ID |
| `product_amount` | String | Yes | Product amount (2 decimals) |
| `order_amount` | String | Yes | Total order amount (2 decimals) |
| `ae_sku_info` | String | No | SKU info string |
| `product_url` | String | No | Full product URL |
| `paytime` | String | No | Payment time `YYYYMMDD:HHMMSS` |

**DS Membership Levels & Discounts:**
- Level C: ~2% discount
- Level B: ~3-4% discount
- Level A: ~5%+ discount

---

### 8. `aliexpress.logistics.ds.trackinginfo.query`

> **Detailed tracking info** — Full logistics event history

| Detail | Value |
|--------|-------|
| **File** | `api/_lib/suppliers.js` → `getDetailedTracking()` |
| **Auth** | NO OAuth required (app-level auth) |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `logistics_no` | String | Yes | Tracking number |
| `origin` | String | Yes | 'ESCROW' |
| `out_ref` | String | Yes | Order ID |
| `service_name` | String | No | e.g. 'CAINIAO_STANDARD' |
| `to_area` | String | No | Destination country (e.g. 'AU') |

**Response:**
```
aliexpress_logistics_ds_trackinginfo_query_response
├── result_success (boolean)
├── details
│   └── details[]
│       ├── event_desc (e.g. "Departed from facility")
│       ├── signed_date (timestamp)
│       ├── status
│       └── address (location)
└── official_website (tracking URL)
```

---

## Available But Not Yet Implemented

These APIs appear in the AliExpress DS API documentation sidebar and are available for our app to use:

### 9. `aliexpress.ds.text.search`

> **Text search for DS** — Search products by keyword

**Potential Use:** Allow store owners to search for specific products to add to their store instead of relying only on feeds.

**Expected Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `keyword` | String | Search term |
| `target_currency` | String | Currency code |
| `target_language` | String | Language code |
| `ship_to_country` | String | Destination country |
| `page_no` | Number | Page number |
| `page_size` | Number | Results per page |
| `sort` | String | Sort order |
| `category_id` | Number | Filter by category |
| `min_price` | Number | Minimum price filter |
| `max_price` | Number | Maximum price filter |

---

### 10. `aliexpress.ds.image.searchV2`

> **Image search V2** — Search products by image

**Potential Use:** Store owners upload a product photo → find matching AliExpress products. Great for finding specific items customers request.

---

### 11. `aliexpress.ds.category.get`

> **Fetch AE Category's list** — Category hierarchy

**Potential Use:** Build category browser for admin/store owners. Map products to proper categories for better storefront organisation.

---

### 12. `aliexpress.ds.order.tracking.get`

> **DS Order Tracking** — Alternative tracking endpoint

**Potential Use:** May provide different/additional tracking data compared to `logistics.ds.trackinginfo.query`. Worth testing.

---

### 13. `aliexpress.ds.freight.query`

> **Delivery/Freight API** — Alternative freight calculation

**Potential Use:** May be the newer/preferred freight calculation API vs `logistics.buyer.freight.calculate`.

---

### 14. `aliexpress.ds.feed.itemids.get`

> **Fetch items with feed name** — Get product IDs from a specific feed

**Potential Use:** Get just the IDs from a feed, then batch-fetch details. May be more efficient than recommend.feed.get for large imports.

---

### 15. `aliexpress.trade.ds.order.get`

> **Buyer query order details** — Query order details (trade API variant)

**Potential Use:** Alternative to `ds.member.order.get`. May return different/additional order fields.

---

### 16. `aliexpress.ds.member.benefit.get`

> **DS member benefit get** — Check DS membership benefits and level

**Potential Use:** Display current DS level and available discounts in admin panel. Show how many more orders needed for next level.

---

### 17. `aliexpress.ds.product.specialinfo.get`

> **Get products' special info** — Special product information (restrictions, certifications)

**Potential Use:** Check if products have import restrictions, age limits, or special certifications before adding to stores.

---

### 18. `aliexpress.ds.product.wholesale.get`

> **Product info for wholesale** — Wholesale/bulk pricing

**Potential Use:** Get bulk pricing tiers. Could enable volume discounts for high-quantity orders.

---

### 19. `aliexpress.ds.search.event.report`

> **Search event report** — Report search analytics to AliExpress

**Potential Use:** Required by AliExpress to maintain API access. Reports which products were viewed/clicked from search results.

---

## Active Feeds

Priority feeds used for product import (in `api/_lib/suppliers.js`):

| # | Feed Name | Category |
|---|-----------|----------|
| 1 | DS_Global_topsellers | Global top sellers |
| 2 | DS_ConsumerElectronics_bestsellers | Electronics |
| 3 | DS_Home&Kitchen_bestsellers | Home & Kitchen |
| 4 | DS_Beauty_bestsellers | Beauty |
| 5 | DS_Sports&Outdoors_bestsellers | Sports & Outdoors |
| 6 | DS_Automobile&Accessories_bestsellers | Auto & Accessories |
| 7 | DS_NewArrivals | New products |
| 8 | AEB_Topseller_PriceRange0_20 | Budget items ($0-20) |
| 9 | AEB_AU_HomeImprovement&Furniture&Lights&Tools&Luggage | AU Home goods |
| 10 | AEB_Fetch_Garden&Tool&Pet&AutoParts_TopSellers | Garden/Pet/Auto |
| 11 | AEB_i69_FullCategory_TopSellers | Full category top sellers |
| 12 | AEB_CETagItems | CE tagged items |
| 13 | AEB_EAN Items | EAN coded items |
| 14 | DS_ElectronicComponents_bestsellers | Electronic components |
| 15 | DS_BoxingDayEssentials | Seasonal essentials |

---

## Known Issues & Workarounds

### 1. USD vs AUD Currency
- **Problem:** API ignores `target_currency: 'AUD'` — always returns USD
- **Workaround:** Convert all prices with configurable rate (default 1.45)
- **Config:** `admin_settings` table → `usd_to_aud_rate`

### 2. "Free Shipping" Is Fake
- **Problem:** API reports FREE shipping but AliExpress charges ~US$1.99 at checkout
- **Workaround:** Minimum A$3.00 shipping enforced for all products

### 3. Auto-Pay Requires DS API
- **Problem:** Orders via `trade.buy.placeorder` don't trigger auto-pay
- **Fix:** Switched to `aliexpress.ds.order.create` (Session 6, April 2026)
- **Auto-pay:** Via PayPal (sfrench71@me.com) in DS Center
- **Cards:** ****7080 (Wise) and ****2988 (ANZ) as backup

### 4. OAuth Token Expiry
- **Problem:** OAuth tokens expire and need refresh
- **Location:** `admin_settings` table → `aliexpress_access_token`
- **Check:** Token has `expires_at` field

### 5. `aliexpress.ds.product.get` Requires OAuth
- Listed as "InsufficientPermission" without OAuth
- Works fine WITH OAuth access_token

### 6. `aliexpress.affiliate.*` Not Available
- Our app doesn't have affiliate permissions
- All affiliate APIs return permission errors
- Use DS APIs exclusively

---

## Files Using AliExpress APIs

| File | Purpose | APIs Used |
|------|---------|-----------|
| `api/_lib/suppliers.js` | Main SDK/library | All 8 production APIs |
| `api/test-ds-apis.js` | OAuth testing | product.get, order.get, order.create |
| `api/dropship/counts.js` | Catalog size tracking | feedname.get |
| `api/admin/enrich-prices.js` | Price enrichment | product.get (via suppliers.js) |
| `api/cron/import-products.js` | Automated import | feedname.get, recommend.feed.get |
| `api/cron/sync-orders.js` | Order sync | member.order.get, trackinginfo.query |
| `api/webhooks/stripe.js` | Order placement | ds.order.create (via submitOrder) |

---

## Pricing Pipeline

```
AliExpress API (USD)
    │
    ├── Product price: US$2.42
    │   └── × 1.45 (USD→AUD rate) = A$3.51
    │
    ├── Shipping: US$1.99
    │   └── × 1.45 = A$2.89 → min A$3.00
    │
    ├── Tax: A$3.51 × 18% = A$0.63
    │
    ├── Wholesale: A$3.51 + A$3.00 + A$0.63 = A$7.14
    │
    ├── Sale price: A$7.14 × 1.5 = A$10.71
    │
    ├── Customer pays: A$10.71 + A$6.00 (flat shipping) = A$16.71
    │
    ├── AE real cost: ~A$7.04
    │
    ├── Profit: A$16.71 - A$7.04 = A$9.67
    │   ├── Platform (30%): A$2.90
    │   └── Store owner (70%): A$6.77
    │
    └── Flat shipping A$6: 100% to platform
```

---

## Quick Reference

```javascript
// Import these from suppliers.js
import {
  getProductDetails,      // aliexpress.ds.product.get
  submitOrder,            // aliexpress.ds.order.create
  getOrderTracking,       // aliexpress.ds.member.order.get
  calculateFreight,       // aliexpress.logistics.buyer.freight.calculate
  reportOrderForDSLevel,  // aliexpress.ds.member.orderdata.submit
  getDetailedTracking,    // aliexpress.logistics.ds.trackinginfo.query
  getFeedNames,           // aliexpress.ds.feedname.get (internal)
  fetchFeedProducts,      // aliexpress.ds.recommend.feed.get (internal)
} from './_lib/suppliers.js'
```

---

## Complete API Catalog (All Categories)

> Full list of every API available at openservice.aliexpress.com for our app.  
> Documented from API docs screenshots on 2026-04-08.

### System Tool (OAuth)
| API | Description |
|-----|-------------|
| `system.oauth2.generateSecurityToken` | Generate security token |
| `system.oauth2.generateToken` | Generate OAuth access token |
| `system.oauth2.refreshSecurityToken` | Refresh security token |
| `system.oauth2.refreshToken` | Refresh OAuth access token |

### AE-Affiliate (NOT AVAILABLE — no affiliate permissions)
| API | Description |
|-----|-------------|
| `aliexpress.affiliate.product.shipping.get` | Get product shipping info |
| `aliexpress.affiliate.promotion.info.get` | Get promotion info |
| `aliexpress.affiliate.sku.detail.get` | Get SKU product detail info |
| `/aliexpress/xinghe/merchant/license/get` | Inquire business license |
| `aliexpress.affiliate.link.generate` | Generate affiliate links |
| `aliexpress.affiliate.category.get` | Get category list |
| `aliexpress.affiliate.featuredpromo.get` | Get featured promo info |
| `aliexpress.affiliate.featuredpromo.products.get` | Get featured promo products |
| `aliexpress.affiliate.hotproduct.download` | Hot product download |
| `aliexpress.affiliate.hotproduct.query` | Hot products query |
| `aliexpress.affiliate.order.get` | Get order info |
| `aliexpress.affiliate.order.list` | Get order list |
| `aliexpress.affiliate.order.listbyindex` | Get order list by index |
| `aliexpress.affiliate.productdetail.get` | Get product detail |
| `aliexpress.affiliate.product.query` | Product search/query |
| `aliexpress.affiliate.product.smartmatch` | Smart match products |

### AE-Logistics
| API | Description |
|-----|-------------|
| `aliexpress.asf.local2local.sub.declareship` | DBS packaging and ship (supports split sub-order) |
| `aliexpress.asf.dbs.declareship` | DBS declare Ship |
| `aliexpress.asf.local2local.self.pickup.declareship` | Local self pick up declare ship |
| `aliexpress.asf.dbs.declare.ship.modify` | Modify DBS declare Ship |
| `aliexpress.asf.shipment.pack` | Online packaging and shipment |
| `aliexpress.asf.order.shipping.service.get` | Order Shipping Service Query |
| `aliexpress.asf.package.shipping.service.get` | Package available shipping service query |
| `aliexpress.asf.local2local.split.quantity.rts.pack` | Package for orders (supports split quantity) |
| `aliexpress.asf.platform.logistics.document.query` | Platform logistics order document query |
| `aliexpress.asf.platform.logistics.rts` | Platform logistics ready to ship |
| `aliexpress.asf.platform.logistics.repack` | Platform logistics repack |
| `aliexpress.asf.local.unreachable.preference.query` | Query Unreachable Preference |
| `aliexpress.asf.seller.address.get` | Seller address query |
| `aliexpress.asf.local.unreachable.preference.update` | Unreachable Preference Update |
| `aliexpress.asf.local2local.transfer.to.offline` | Platform logistics transfer offline ship |
| `aliexpress.asf.fulfillment.package.query` | Query fulfillment package details |

### AE-Aliexpress-Direct-Product
| API | Description |
|-----|-------------|
| (expand to see full list) | Direct product management |

### AE-Settlement
| API | Description |
|-----|-------------|
| `aliexpress.trade.invoice.sellerInvoicingApplyInfo.get` | AE Tax: Invoice Request Query (Seller to Buyer) |
| `aliexpress.fund.merchant.orderdetail` | AE Fund Order Detail |
| `aliexpress.trade.tax.invoice.queryBrazilInvoiceInfo` | Brazil Seller Invoice Query |
| `aliexpress.trade.tax.invoice.UploadBrazilInvoice` | Brazil seller invoice upload |
| `aliexpress.trade.invoice.sellerInvoicingResult.push` | Settlement Tax: Merchant Returns Invoicing Results |
| `aliexpress.trade.tax.hscode.queryRegulatoryAttributesInfoWithHsCode` | Query regulatory attributes with HS Code |
| `aliexpress.trade.tax.hscode.selectRegulatoryAttributesOptions` | Select regulatory attributes options |
| `aliexpress.fund.merchant.recipet.flowdetail.query` | Fund account income/expense flow detail query |
| `aliexpress.fund.merchant.recipet.config.query` | Fund account income/expense config query |
| `aliexpress.fund.merchant.recipet.debt.query` | Fund account debt query |

### AE-Custmize
| API | Description |
|-----|-------------|
| `aliexpress.customize.product.info.query` | Customize product info query |
| `aliexpress.customize.product.template.query` | Customize product template query |
| `aliexpress.customize.product.info.audit.result.query` | Query customize info audit result |
| `aliexpress.customize.product.info.create` | Save product customize info |

### AE-KoreanCrossborder-Product
| API | Description |
|-----|-------------|
| `aliexpress.offer.local.cb.product.prices.edit` | Local CrossBorder - Product Price Edit |
| `aliexpress.offer.local.cb.product.status.update` | Local CrossBorder - Product Status Update |
| `aliexpress.offer.local.cb.product.edit` | Local CrossBorder - Product Edit |
| `aliexpress.offer.local.cb.products.list` | Local CrossBorder - Product list query |
| `aliexpress.offer.local.cb.product.post` | Local CrossBorder - Product post |
| `aliexpress.offer.local.cb.products.stock.edit` | Local CrossBorder - Edit Stock |
| `aliexpress.offer.local.cb.product.query` | Local CrossBorder - Product detail query |

### AE-Dropshipper (OUR MAIN APIS)
| API | Description | Status |
|-----|-------------|--------|
| `aliexpress.ds.order.create` | AE DS Order Create and Pay API | **IMPLEMENTED** |
| `aliexpress.ds.category.get` | Fetch AE category list | Available |
| `aliexpress.ds.freight.query` | Delivery/Freight API | Available |
| `aliexpress.ds.order.tracking.get` | DS Order Tracking | Available |
| `aliexpress.ds.feed.itemids.get` | Fetch items with feedname | Available |
| `aliexpress.logistics.buyer.freight.calculate` | Freight calculation interface | **IMPLEMENTED** |
| `aliexpress.ds.image.searchV2` | Dropshipper image search v2 | Available |
| `aliexpress.trade.ds.order.get` | Buyer query order details | Available |
| `aliexpress.ds.member.benefit.get` | DS member benefit get | Available |
| `aliexpress.ds.product.specialinfo.get` | Get products' special info | Available |
| `aliexpress.ds.product.wholesale.get` | Product info for wholesale | Available |
| `aliexpress.ds.product.get` | Product info query for DS | **IMPLEMENTED** |
| `aliexpress.ds.search.event.report` | Search event report | Available |
| `aliexpress.ds.text.search` | Text search for DS | Available |
| `aliexpress.ds.feedname.get` | Get feed names | **IMPLEMENTED** |
| `aliexpress.ds.recommend.feed.get` | Recommend feed get | **IMPLEMENTED** |

### AE-Image
| API | Description |
|-----|-------------|
| `aliexpress.photobank.redefining.listimagepagination` | Paged query images in photobank |
| `aliexpress.photobank.redefining.uploadimageforsdk` | Upload images to photo bank |
| `aliexpress.photobank.redefining.delunusephot` | Delete unreferenced images |

### AE-Seller
| API | Description |
|-----|-------------|
| `aliexpress.merchant.product.post.limit` | Query product posting limit (CN seller only) |
| `global.seller.channel.info.get` | Seller basic info and channel list query |
| `aliexpress.merchant.manufacture.detail` | Manufacture detail |
| `aliexpress.merchant.manufacture.list` | Manufacture list |
| `aliexpress.merchant.Address.list` | Query address list |
| `aliexpress.merchant.agreement.sign.list` | Query merchant agreement sign list |
| `aliexpress.merchant.msr.detail` | Query MSR detail |
| `aliexpress.merchant.msr.list` | Query MSR list |
| `ae.merchant.assortment.seller.plan.chance.download.all` | Download all business opportunities |
| `ae.merchant.assortment.seller.plan.chance.list` | Paginated opportunity info for a plan |
| `ae.merchant.assortment.seller.arrangement.plan.list` | Business opportunity plan list |
| `ae.merchant.assortment.seller.apply.all` | Batch supply application |
| `ae.merchant.assortment.seller.plan.chance.download` | Download specific opportunity |
| `ae.merchant.assortment.seller.plan.products.query` | Query plan enrollment status |
| `aliexpress.merchant.private.file.get` | Query AE merchant private file |
| `aliexpress.merchant.profile.get` | Query seller profile |
| `aliexpress.merchant.diagnosis.query` | Query store diagnosis issue list |
| `ae.merchant.assortment.seller.plan.dashboard` | Statistics data read (dashboard) |

### AE-Category&Attributes
| API | Description |
|-----|-------------|
| `aliexpress.category.redefining.getchildattributesresultbypostcateidandpath` | Get child attributes of a post category |
| `aliexpress.category.tree.list` | Obtain sub category info under a specific category |
| `aliexpress.category.itemQualification.list` | Product qualification information |
| `aliexpress.category.redefining.queryCascadeProperties` | Query cascade properties under category |
| `aliexpress.solution.sku.attribute.query` | Query SKU attribute info for a category |
| `aliexpress.solution.seller.category.tree.query` | Seller category tree query |
| `aliexpress.category.qualifications.list` | Query qualifications by category |

### AE-Refund&return
| API | Description |
|-----|-------------|
| `aliexpress.issue.detail.get` | Retrieve Dispute Details |
| `aliexpress.issue.issuelist.get` | Retrieve Dispute List |
| `aliexpress.issue.image.upload` | Seller upload dispute evidence image |
| `aliexpress.issue.solution.agree` | Seller agree to dispute solution |
| `aliexpress.issue.solution.save` | Seller add/reject/modify dispute solution |

### AE-Freight (Shipment)
| API | Description |
|-----|-------------|
| `aliexpress.freight.redefining.querySellerIntention` | AI freight template seller preference query |
| `aliexpress.freight.redefining.queryInIsvGray` | AI freight template grayscale query |
| `aliexpress.freight.redefining.recommendFreightTemplate` | AI freight template recommendation |
| `aliexpress.freight.redefining.createFreightTemplate` | AI freight template adoption/create |
| `aliexpress.freight.redefining.listfreighttemplate` | List all freight/shipping templates |

### AE-Order & Transaction
| API | Description |
|-----|-------------|
| `aliexpress.trade.seller.order.decrypt` | Decryption of order details |
| `aliexpress.solution.order.receiptinfo.get` | Get Order Receipt Info |
| `aliexpress.solution.order.get` | Get order list |
| `aliexpress.trade.seller.orderlist.get` | Order list query |
| `aliexpress.trade.new.redefining.findorder` | Trade order details query |
| `aliexpress.trade.redefining.verifycode` | Seller verify code |
| `aliexpress.trade.redefining.confirmshipment` | semiChoice switch shipping method |
| `aliexpress.trade.redefining.sendcode` | Send code |

### AliExpress Direct Logistic
| API | Description |
|-----|-------------|
| `aliexpress.asf.local.supply.shipping.service.get` | Local supply available shipping service query |
| `aliexpress.asf.local.supply.batch.declareship` | Local supply batch declareship |
| `aliexpress.asf.local.supply.declareship.modify` | Local supply modify declareship info |
| `aliexpress.asf.local.supply.sub.declareship` | Local supply subDeclareship |
| `aliexpress.asf.local.supply.split.quantity.rts.pack` | Packaging - support sub-order selection quantity |
| `aliexpress.asf.local.supply.platform.logistics.document.query` | Platform logistics order document query |
| `aliexpress.asf.local.supply.platform.logistics.rts` | Platform logistics ready to ship |
| `aliexpress.asf.local.supply.platform.logistics.repack` | Platform logistics repack |
| `aliexpress.asf.local.supply.seller.address.get` | Seller address query |

### AE-Product Management
| API | Description |
|-----|-------------|
| `aliexpress.solution.batch.product.price.update` | Batch product price update |
| `aliexpress.product.ladder.price.calculate` | Calculate wholesale discount SKU prices |
| `aliexpress.postproduct.redefining.createproductgroup` | Create product group |
| `aliexpress.product.customize.font.query` | Custom product font/color query |
| `aliexpress.distribution.product.post` | DistributionPublishForAEChannel |
| `aliexpress.offer.redefining.supportwigupgrade` | Does it support wig size upgrade |
| `aliexpress.solution.product.edit` | Edit Product API |
| `aliexpress.solution.product.info.get` | Get Single Product Info |
| `aliexpress.solution.product.list.get` | Get product list |
| `aliexpress.product.productgroups.get` | Get current member's product grouping |
| `aliexpress.postproduct.redefining.offlineaeproduct` | Goods off the shelf (delist) |
| `aliexpress.product.customize.image.generate` | Graph/image generation interface |
| `aliexpress.product.wholesale.supplySigned` | Merchants sign wholesale supply contracts |
| `aliexpress.offer.redefining.supportsizeprop` | New/old size attributes support query |
| `aliexpress.postproduct.redefining.onlineaeproduct` | Online AE product (list product) |
| `aliexpress.solution.product.post` | Product posting API |
| `aliexpress.product.customize.design.template.list` | Query custom design template list |
| `aliexpress.product.ladder.price.update` | Set ladder prices for wholesale goods |
| `aliexpress.postproduct.redefining.setgroups` | Set product group |
| `aliexpress.customize.template.product.submit` | Submit new product customization info |
| `aliexpress.solution.schema.product.instance.post` | Upload product based on JSON schema |
| `aliexpress.customize.product.detail` | Customize product detail |
| `aliexpress.customize.product.query` | Customize product query |
| `aliexpress.customize.product.submit` | Customize product submit |
| `aliexpress.solution.batch.product.delete` | Batch product delete |
| `aliexpress.solution.batch.product.inventory.update` | Batch product inventory update |
| `aliexpress.solution.feed.query` | Solution feed query |
| `aliexpress.solution.feed.submit` | Solution feed submit |
| `aliexpress.solution.hscode.query` | HS code query |
| `aliexpress.solution.merchant.profile.get` | Merchant profile get |
| `aliexpress.solution.schema.product.full.update` | Schema product full update |
| `aliexpress.product.customize.template.delete` | Delete customize template |
| `aliexpress.solution.product.schema.get` | Get product schema |
| `aliexpress.sale.prop.sequence.list` | Get sale prop sequence |
| `aliexpress.postproduct.redefining.getsizechartinfobytype` | Get size chart template by type |
| `aliexpress.offer.redefining.supportnewsizechartlist` | Support new size chart template list |
| `aliexpress.solution.product.multi.stock.update` | Local seller edit multi warehouse stock |
| `aliexpress.product.bind.brandmanufacturer` | Product bind brand manufacturer/MSR EU ID |
| `aliexpress.product.customize.data.query` | Query customization data in orders |
| `aliexpress.product.customize.template.config` | Query customize template config |
| `aliexpress.product.customize.template.detail` | Query customize template detail |
| `aliexpress.product.customize.template.list` | Query customize template list |
| `aliexpress.product.customize.design.template.detail` | Query design template content |
| `aliexpress.solution.product.inventory.query` | Query product inventory (multi warehouse) |
| `aliexpress.product.wholesale.query` | Query wholesale products |
| `aliexpress.product.customize.template.save` | Save customize template |

### AE_DSA
| API | Description |
|-----|-------------|
| `global.dsa.ads.query` | DSA Ads Data Query |
| `global.dsa.item.query` | DSA Item Data Query |
| `global.dsa.pc.query` | DSA Punish Data Query |

### AE-UIC-IPAY
| API | Description |
|-----|-------------|
| (none) | **EMPTY — no APIs available** |

### CSP-Seller
| API | Description |
|-----|-------------|
| `global.seller.relation.query` | Obtain seller account list |

---

## Auto-Pay Summary

**There is NO separate payment API.** AE-UIC-IPAY is empty. Auto-pay is triggered by:

1. **Using `aliexpress.ds.order.create`** (not `trade.buy.placeorder`)
2. **Having auto-pay activated** in DS Center (inbusiness.aliexpress.com/web/autoPay)
3. **Payment method bound:** PayPal (sfrench71@me.com) or Visa cards
4. The `ds_extend_request` optional parameter may contain additional auto-pay flags
5. The API name literally says "Order Create **and Pay**" — payment is built into the create call

**If auto-pay still doesn't trigger after switching to ds.order.create:**
- Check `ds_extend_request` parameter fields (click `>` arrow on API docs page)
- Ensure PayPal authorization hasn't expired in DS Center
- Contact AliExpress Business Support with: "Orders placed via aliexpress.ds.order.create API still go to Awaiting Payment"

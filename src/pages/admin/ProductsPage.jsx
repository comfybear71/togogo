import { useState, useEffect, useCallback } from 'react';
import {
  Search, MoreVertical, AlertTriangle, Trash2, Package, Image, Loader2,
  ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import { authFetch } from '../../stores/authStore';

const statusColors = {
  active: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  inactive: 'bg-white/[0.06] text-zinc-400',
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stores, setStores] = useState([]);
  const [actionMenuProduct, setActionMenuProduct] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalProducts: 0, totalPages: 0 });
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [megaImporting, setMegaImporting] = useState(false);
  const [megaProgress, setMegaProgress] = useState('');
  const [enriching, setEnriching] = useState(false);
  const ITEMS_PER_PAGE = 50;

  const fetchProducts = useCallback(async (pg = page, search = searchQuery, cat = categoryFilter, store = storeFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: ITEMS_PER_PAGE });
      if (search) params.set('search', search);
      if (cat) params.set('category', cat);
      if (store) params.set('store', store);
      if (!store) params.set('unique', 'true');

      const data = await authFetch(`/api/admin/products?${params}`);
      setProducts(data.products || []);
      setCategories(data.categories || []);
      if (data.stores) setStores(data.stores);
      setPagination(data.pagination || { totalProducts: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, storeFilter]);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => { fetchProducts(page, searchQuery, categoryFilter, storeFilter); }, [page, searchQuery, categoryFilter, storeFilter]);

  async function handleImport(term = '') {
    if (cooldown > 0 || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('togogo-token');
      const url = term
        ? `/api/cron/import-products?secret=${token}&term=${encodeURIComponent(term)}`
        : `/api/cron/import-products?secret=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        fetchProducts(1, '', '');
      }
      // Start 30 second cooldown
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  }

  const [enrichResult, setEnrichResult] = useState(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState(null);

  async function handleRebuildPrices() {
    if (rebuilding) return;
    setRebuilding(true);
    setRebuildResult(null);
    let totalRebuilt = 0;
    let totalDeactivated = 0;
    let totalSkipped = 0;
    let lastError = null;
    let lastProgress = null;
    // Burn through several batches on one click (each batch = 10 products,
    // limited by Vercel 60s). 10 passes = up to 100 products per click.
    for (let pass = 0; pass < 10; pass++) {
      try {
        const token = localStorage.getItem('togogo-token');
        const res = await fetch(`/api/cron/rebuild-product-variants?secret=${token}`);
        const data = await res.json();
        if (!res.ok) { lastError = data.error || `HTTP ${res.status}`; break; }
        if (data.status === 'idle') break;
        totalRebuilt += data.rebuilt || 0;
        totalDeactivated += data.deactivated || 0;
        totalSkipped += data.skipped || 0;
        lastProgress = data.progress || lastProgress;
        if (!data.rebuilt && !data.deactivated && !data.skipped) break;
      } catch (err) { lastError = err.message; break; }
      await new Promise(r => setTimeout(r, 800));
    }
    setRebuilding(false);
    setRebuildResult({
      success: !lastError,
      error: lastError,
      rebuilt: totalRebuilt,
      deactivated: totalDeactivated,
      skipped: totalSkipped,
      progress: lastProgress,
    });
    if (totalRebuilt > 0 || totalDeactivated > 0) {
      fetchProducts(page, searchQuery, categoryFilter, storeFilter);
    }
  }

  async function handleEnrichProducts() {
    if (enriching) return;
    setEnriching(true);
    setEnrichResult(null);
    setImportResult(null);
    let totalEnriched = 0;
    let totalSkipped = 0;
    let totalPasses = 0;
    let lastError = null;
    // Run multiple passes to chew through the backlog
    for (let pass = 0; pass < 5; pass++) {
      try {
        const token = localStorage.getItem('togogo-token');
        const res = await fetch(`/api/cron/enrich-products?secret=${token}`);
        const data = await res.json();
        totalPasses++;
        if (!res.ok) { lastError = data.error || `HTTP ${res.status}`; break; }
        if (data.status === 'idle') break;
        totalEnriched += data.enriched || 0;
        totalSkipped += data.skipped || 0;
        if (!data.enriched && !data.skipped) break;
      } catch (err) { lastError = err.message; break; }
      await new Promise(r => setTimeout(r, 1500));
    }
    setEnriching(false);
    setEnrichResult({
      success: !lastError,
      error: lastError,
      enriched: totalEnriched,
      skipped: totalSkipped,
      passes: totalPasses,
    });
    if (totalEnriched > 0) fetchProducts(page, searchQuery, categoryFilter, storeFilter);
  }

  async function handleMegaImport() {
    if (megaImporting || importing) return;
    setMegaImporting(true);
    setImportResult(null);
    let totalNew = 0;
    const categories = IMPORT_CATEGORIES.filter(c => c.term); // skip Random Mix
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      setMegaProgress(`${cat.emoji} ${cat.label} (${i + 1}/${categories.length}) — ${totalNew} new products so far`);
      try {
        const token = localStorage.getItem('togogo-token');
        const url = `/api/cron/import-products?secret=${token}&term=${encodeURIComponent(cat.term)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) totalNew += (data.newProducts || 0);
      } catch {}
      // 5 second pause between categories to avoid rate limiting
      if (i < categories.length - 1) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    setMegaProgress('');
    setMegaImporting(false);
    setImportResult({ success: true, newProducts: totalNew, stores: 4, catalogSize: totalNew });
    fetchProducts(1, '', '');
    // Start cooldown
    setCooldown(30);
    const timer = setInterval(() => {
      setCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
  }

  const IMPORT_CATEGORIES = [
    { term: '', label: 'Random Mix', emoji: '🎲' },
    // Ladies Fashion
    { term: 'dress', label: "Women's Dresses", emoji: '👗' },
    { term: 'womens tops', label: 'Tops & Blouses', emoji: '👚' },
    { term: 'womens jeans', label: 'Jeans', emoji: '👖' },
    { term: 'skirt', label: 'Skirts', emoji: '🩱' },
    { term: 'womens pants', label: "Women's Pants", emoji: '👖' },
    { term: 'knitwear women', label: 'Knitwear', emoji: '🧶' },
    { term: 'womens jacket', label: "Women's Jackets", emoji: '🧥' },
    { term: 'lingerie', label: 'Lingerie', emoji: '🩱' },
    { term: 'bikini', label: 'Swimwear', emoji: '👙' },
    { term: 'leggings', label: 'Leggings', emoji: '🩳' },
    { term: 'handbag', label: 'Handbags', emoji: '👜' },
    { term: 'womens shoes', label: "Women's Shoes", emoji: '👠' },
    // General
    { term: 'jewelry', label: 'Jewelry', emoji: '💍' },
    { term: 'beauty', label: 'Beauty', emoji: '💄' },
    { term: 'makeup brush', label: 'Makeup', emoji: '💅' },
    { term: 'toys', label: 'Toys', emoji: '🧸' },
    { term: 'home garden', label: 'Home & Garden', emoji: '🏡' },
    { term: 'computer', label: 'Computer', emoji: '💻' },
    { term: 'sports', label: 'Sports', emoji: '⚽' },
    { term: 'consumer electronics', label: 'Electronics', emoji: '📱' },
    { term: 'shoes', label: 'Shoes', emoji: '👟' },
    { term: 'lights', label: 'Lights', emoji: '💡' },
    { term: 'mother kids', label: 'Mother & Kids', emoji: '👶' },
    { term: 'mens clothing', label: "Men's Clothing", emoji: '👔' },
    { term: 'kitchen gadget', label: 'Kitchen', emoji: '🍳' },
    { term: 'pet', label: 'Pets', emoji: '🐕' },
    { term: 'car accessories', label: 'Car', emoji: '🚗' },
    { term: 'headphones', label: 'Audio', emoji: '🎧' },
    { term: 'phone case', label: 'Phone Cases', emoji: '📱' },
    { term: 'tablet stand', label: 'Tablet', emoji: '📲' },
    { term: 'led light', label: 'LED Lights', emoji: '🔦' },
  ];

  async function handleAction(id, action) {
    try {
      await authFetch('/api/admin/products', {
        method: 'PATCH',
        body: JSON.stringify({ id, action }),
      });
      setActionMenuProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Product action failed:', err);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  }

  // Client-side status filter (since status isn't paginated server-side)
  const filteredProducts = statusFilter
    ? products.filter(p => statusFilter === 'active' ? p.is_active : !p.is_active)
    : products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Product Management</h1>
          <p className="text-zinc-500">
            {pagination.totalProducts > 0
              ? `${pagination.totalProducts.toLocaleString()} products across all stores`
              : 'Import products from AliExpress to get started'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchProducts()}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={handleRebuildPrices}
            disabled={rebuilding || enriching || megaImporting || importing}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Re-fetch variants + real USD pricing from ds.product.get for every product. 100 products per click, or let the cron chew through it in the background."
          >
            {rebuilding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {rebuilding ? 'Rebuilding...' : 'Rebuild Prices'}
          </button>
          <button
            onClick={handleEnrichProducts}
            disabled={enriching || rebuilding || megaImporting || importing}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm font-medium text-white hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Fetch real rating, sales count, discount and shipping for products still missing that data"
          >
            {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {enriching ? 'Enriching...' : 'Enrich Data'}
          </button>
          <button
            onClick={() => setShowImportPanel(!showImportPanel)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors ${showImportPanel ? 'bg-zinc-700' : 'bg-[#FF6B35] hover:bg-[#e85d2c]'}`}
          >
            <Package className="h-4 w-4" />
            {showImportPanel ? 'Close Import' : 'Import from AliExpress'}
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {showImportPanel && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Import Products by Category</h3>
              <p className="text-xs text-zinc-500 mt-1">Each click imports ~20 products with accurate freight pricing. 30 second cooldown between imports.</p>
            </div>
            <button
              onClick={handleMegaImport}
              disabled={megaImporting || importing || cooldown > 0}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {megaImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {megaImporting ? 'Importing...' : 'Import ALL Categories'}
            </button>
          </div>
          {megaProgress && (
            <div className="rounded-xl p-3 text-sm bg-purple-500/10 text-purple-400 mb-3">
              {megaProgress}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            {IMPORT_CATEGORIES.map(({ term, label, emoji }) => (
              <button
                key={term || 'random'}
                onClick={() => handleImport(term)}
                disabled={importing || cooldown > 0}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
          {cooldown > 0 && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 mb-3">
              <Loader2 className="h-3 w-3 animate-spin" /> Cooldown: {cooldown}s — preventing API rate limit
            </div>
          )}
          {importing && (
            <div className="flex items-center gap-2 text-xs text-[#FF6B35] mb-3">
              <Loader2 className="h-3 w-3 animate-spin" /> Importing products with freight calculator pricing...
            </div>
          )}
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`rounded-xl p-3 text-sm ${importResult.success ? 'bg-[#06D6A0]/10 text-[#06D6A0]' : 'bg-red-500/10 text-red-400'}`}>
          {importResult.success
            ? `Imported ${importResult.newProducts || importResult.totalImported || 0} new products across ${importResult.stores || 0} stores (${importResult.catalogSize || importResult.totalImported || 0} total)`
            : `Import failed: ${importResult.error || importResult.message || 'Unknown error'}`}
        </div>
      )}
      {enrichResult && (
        <div className={`rounded-xl p-3 text-sm ${enrichResult.success ? 'bg-[#06D6A0]/10 text-[#06D6A0]' : 'bg-red-500/10 text-red-400'}`}>
          {enrichResult.success
            ? `Enriched ${enrichResult.enriched} product${enrichResult.enriched === 1 ? '' : 's'} across ${enrichResult.passes} pass${enrichResult.passes === 1 ? '' : 'es'}${enrichResult.skipped ? ` — ${enrichResult.skipped} skipped (no AE data available)` : ''}${enrichResult.enriched === 0 ? ' — queue empty or nothing to update' : ''}`
            : `Enrich failed: ${enrichResult.error || 'Unknown error'}`}
        </div>
      )}
      {rebuildResult && (
        <div className={`rounded-xl p-3 text-sm ${rebuildResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {rebuildResult.success
            ? <>
                Rebuilt <strong>{rebuildResult.rebuilt}</strong> product{rebuildResult.rebuilt === 1 ? '' : 's'} with real USD pricing
                {rebuildResult.deactivated ? `, deactivated ${rebuildResult.deactivated} (no longer on AE)` : ''}
                {rebuildResult.skipped ? `, ${rebuildResult.skipped} skipped` : ''}
                {rebuildResult.progress ? ` · Catalog progress: ${rebuildResult.progress.healed}/${rebuildResult.progress.total_active} healed` : ''}
              </>
            : `Rebuild failed: ${rebuildResult.error || 'Unknown error'}`}
        </div>
      )}

      {/* Total Products */}
      <div className="rounded-[16px] bg-[#111] p-4 inline-block">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Products</p>
        <p className="text-xl font-bold text-white">{pagination.totalProducts.toLocaleString()}</p>
        <p className="text-[10px] text-zinc-600">page {page} of {pagination.totalPages}</p>
      </div>

      {/* Search & Filters */}
      <div className="rounded-[16px] bg-[#111] p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#e85d2c]">
            Search
          </button>
          <select
            value={storeFilter}
            onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
          >
            <option value="">All Products</option>
            {stores.map((s) => (
              <option key={s.user_id} value={s.user_id}>{s.store_name} ({s.subdomain})</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </form>
      </div>

      {/* Products Table */}
      <div className="rounded-[16px] bg-[#111] p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No products found</p>
            <p className="text-xs text-zinc-600 mt-1">Click "Import from AliExpress" to load products</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
                  <th className="pb-3 pr-3">Product</th>
                  <th className="pb-3 pr-3">Cost</th>
                  <th className="pb-3 pr-3">Sale</th>
                  <th className="pb-3 pr-3">Profit</th>
                  <th className="pb-3 pr-3">ToGoGo</th>
                  {storeFilter && <th className="pb-3 pr-3">Store</th>}
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const status = p.is_active ? 'active' : 'inactive';
                  const supplierCost = parseFloat(p.supplier_cost || 0);
                  const salePrice = parseFloat(p.sale_price || 0);
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] overflow-hidden flex-shrink-0">
                            {p.image ? (
                              <img src={p.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Image className="h-5 w-5 text-zinc-600" />
                            )}
                          </div>
                          <p className="font-medium text-white max-w-[200px] truncate" title={p.title}>{p.title}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-zinc-400">A${supplierCost.toFixed(2)}</td>
                      <td className="py-3 pr-3 font-medium text-white">${salePrice.toFixed(2)}</td>
                      <td className="py-3 pr-3 text-emerald-400">${(salePrice - supplierCost).toFixed(2)}</td>
                      <td className="py-3 pr-3 text-[#FF6B35]">${((salePrice - supplierCost) * 0.1).toFixed(2)}</td>
                      {storeFilter && <td className="py-3 pr-3 text-zinc-400 text-xs">{p.seller_name || p.seller_email?.split('@')[0]}</td>}
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="relative py-3 text-right">
                        <button
                          onClick={() => setActionMenuProduct(actionMenuProduct === p.id ? null : p.id)}
                          className="rounded-lg p-1.5 hover:bg-white/[0.06]"
                        >
                          <MoreVertical className="h-4 w-4 text-zinc-500" />
                        </button>
                        {actionMenuProduct === p.id && (
                          <div className="absolute right-0 top-full z-10 w-40 rounded-xl border border-white/[0.06] bg-[#111] py-1 shadow-lg">
                            <button
                              onClick={() => handleAction(p.id, p.is_active ? 'deactivate' : 'activate')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04]"
                            >
                              <AlertTriangle className="h-4 w-4 text-[#FF6B35]" />
                              {p.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleAction(p.id, 'delete')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" /> Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06]">
            <p className="text-xs text-zinc-500">
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, pagination.totalProducts)} of {pagination.totalProducts.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <span className="text-xs text-zinc-500">Page {page} of {pagination.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-30"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

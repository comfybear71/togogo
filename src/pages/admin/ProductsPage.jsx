import { useState, useEffect } from 'react';
import {
  Search,
  MoreVertical,
  AlertTriangle,
  Trash2,
  Package,
  Image,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '';

const statusColors = {
  active: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  inactive: 'bg-white/[0.06] text-zinc-400',
};

export default function ProductsPage() {
  const token = useAuthStore((s) => s.token);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [actionMenuProduct, setActionMenuProduct] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action) {
    try {
      await fetch(`${API_BASE}/api/admin/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action }),
      });
      setActionMenuProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Product action failed:', err);
    }
  }

  const filteredProducts = products.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (statusFilter === 'active' && !p.is_active) return false;
    if (statusFilter === 'inactive' && p.is_active) return false;
    if (sellerFilter && !(p.seller_name || '').toLowerCase().includes(sellerFilter.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Product Management</h1>
        <p className="text-zinc-500">Manage listings, review reports, and moderate products.</p>
      </div>

      {/* Search & Filters */}
      <div className="rounded-[16px] bg-[#111] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
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
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm capitalize text-white focus:border-[#FF6B35] focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <input
            type="text"
            placeholder="Filter by seller..."
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-[16px] bg-[#111] p-6">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Seller</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Sold</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const status = p.is_active ? 'active' : 'inactive';
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] overflow-hidden">
                            {p.image ? (
                              <img src={p.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Image className="h-5 w-5 text-zinc-600" />
                            )}
                          </div>
                          <p className="font-medium text-white max-w-[200px] truncate">{p.title}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-medium text-white">${parseFloat(p.sale_price || 0).toFixed(2)}</td>
                      <td className="py-3 pr-4 text-zinc-400">{p.category || 'General'}</td>
                      <td className="py-3 pr-4 text-zinc-400">{p.seller_name || p.seller_email}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">{p.total_sold || 0}</td>
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
      </div>
    </div>
  );
}

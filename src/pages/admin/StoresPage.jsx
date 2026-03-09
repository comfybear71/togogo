import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Globe,
  Store,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const statusConfig = {
  active: { color: 'bg-[#06D6A0]/10 text-[#06D6A0]', icon: CheckCircle },
  provisioning: { color: 'bg-[#FFD23F]/10 text-[#FFD23F]', icon: Clock },
  pending: { color: 'bg-blue-100 text-blue-700', icon: Clock },
  inactive: { color: 'bg-gray-100 text-gray-600', icon: XCircle },
  deleted: { color: 'bg-red-100 text-red-600', icon: XCircle },
};

const domainStatusConfig = {
  active: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  pending: 'bg-[#FFD23F]/10 text-[#FFD23F]',
  expired: 'bg-red-100 text-red-600',
  transferred: 'bg-blue-100 text-blue-700',
};

export default function StoresPage() {
  const { token } = useAuthStore();
  const [tab, setTab] = useState('stores');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stores, setStores] = useState([]);
  const [domains, setDomains] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || '';

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${apiBase}/api/admin/stores?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStores(data.stores || []);
      setDomains(data.domains || []);
      setStatusCounts(data.statusCounts || {});
    } catch (err) {
      console.error('Fetch stores error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  function handleSearch(e) {
    e.preventDefault();
    fetchData();
  }

  async function handleDelete(store) {
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/api/store-provision/delete-subdomain?storeId=${store.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to delete store');
        return;
      }

      setDeleteModal(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete store');
    } finally {
      setDeleting(false);
    }
  }

  const totalStores = Object.entries(statusCounts)
    .filter(([k]) => k !== 'deleted')
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Stores & Domains</h1>
          <p className="text-gray-500">View and manage customer stores and domain registrations.</p>
        </div>

        {/* Admin navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { to: '/admin', label: 'Dashboard' },
            { to: '/admin/users', label: 'Users' },
            { to: '/admin/products', label: 'Products' },
            { to: '/admin/orders', label: 'Orders' },
            { to: '/admin/stores', label: 'Stores', active: true },
            { to: '/admin/marketing', label: 'Marketing' },
            { to: '/admin/settings', label: 'Settings' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                item.active
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900 shadow'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-[16px] bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Total Stores</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalStores}</p>
          </div>
          <div className="rounded-[16px] bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-[#06D6A0]">{statusCounts.active || 0}</p>
          </div>
          <div className="rounded-[16px] bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Provisioning</p>
            <p className="mt-1 text-2xl font-bold text-[#FFD23F]">{statusCounts.provisioning || 0}</p>
          </div>
          <div className="rounded-[16px] bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Domains</p>
            <p className="mt-1 text-2xl font-bold text-[#FF6B35]">{domains.length}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow">
          <button
            onClick={() => setTab('stores')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === 'stores' ? 'bg-[#FF6B35] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Store className="h-4 w-4" /> Subdomain Stores ({stores.length})
          </button>
          <button
            onClick={() => setTab('domains')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === 'domains' ? 'bg-[#FF6B35] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="h-4 w-4" /> Purchased Domains ({domains.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="rounded-[16px] bg-white p-5 shadow">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by subdomain, domain, or owner email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div className="flex gap-2">
              {tab === 'stores' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="provisioning">Provisioning</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="deleted">Deleted</option>
                </select>
              )}
              <button
                type="button"
                onClick={fetchData}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center rounded-[16px] bg-white p-16 shadow">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-[#FF6B35]" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        ) : tab === 'stores' ? (
          /* Stores Table */
          <div className="rounded-[16px] bg-white p-6 shadow">
            {stores.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Store className="h-12 w-12 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">No stores found</p>
                <p className="text-sm text-gray-400">Stores will appear here when customers create them.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                      <th className="pb-3 pr-4">Store / Subdomain</th>
                      <th className="pb-3 pr-4">Owner</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Created</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => {
                      const sc = statusConfig[store.status] || statusConfig.pending;
                      const StatusIcon = sc.icon;
                      return (
                        <tr key={store.id} className="border-b border-gray-50">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B35]/10">
                                <Store className="h-4 w-4 text-[#FF6B35]" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{store.store_name || store.subdomain}</p>
                                <p className="text-xs text-gray-500">{store.full_domain}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm text-gray-900">{store.owner_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{store.owner_email}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${sc.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {store.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {new Date(store.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {store.status === 'active' && (
                                <a
                                  href={`https://${store.full_domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#FF6B35]"
                                  title="Visit store"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              {store.status !== 'deleted' && (
                                <button
                                  onClick={() => setDeleteModal(store)}
                                  className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                  title="Delete store"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Domains Table */
          <div className="rounded-[16px] bg-white p-6 shadow">
            {domains.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Globe className="h-12 w-12 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">No domains found</p>
                <p className="text-sm text-gray-400">Purchased domains will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                      <th className="pb-3 pr-4">Domain</th>
                      <th className="pb-3 pr-4">Owner</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Registrar</th>
                      <th className="pb-3 pr-4">Registered</th>
                      <th className="pb-3">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#06D6A0]/10">
                              <Globe className="h-4 w-4 text-[#06D6A0]" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{d.domain}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-gray-900">{d.owner_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{d.owner_email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${domainStatusConfig[d.status] || 'bg-gray-100 text-gray-600'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 capitalize text-gray-600">{d.registrar || '-'}</td>
                        <td className="py-3 pr-4 text-gray-600">
                          {d.registered_at ? new Date(d.registered_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 text-gray-600">
                          {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteModal(null)}>
            <div className="w-full max-w-md rounded-[16px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-bold text-gray-900">Delete Store</h2>
                </div>
                <button onClick={() => setDeleteModal(null)} className="rounded-lg p-1 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteModal.full_domain}</span>?
              </p>
              <p className="mt-2 text-sm text-gray-500">
                This will remove the subdomain from Vercel and mark the store as deleted. This action cannot be undone.
              </p>
              <div className="mt-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                <p><span className="font-medium">Owner:</span> {deleteModal.owner_name} ({deleteModal.owner_email})</p>
                <p><span className="font-medium">Created:</span> {new Date(deleteModal.created_at).toLocaleDateString()}</p>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteModal)}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Store'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

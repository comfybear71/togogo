import React, { useState, useEffect } from 'react';
import {
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
  Plus,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const statusConfig = {
  active: { color: 'bg-[#06D6A0]/10 text-[#06D6A0]', icon: CheckCircle },
  provisioning: { color: 'bg-[#FFD23F]/10 text-[#FFD23F]', icon: Clock },
  pending: { color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  inactive: { color: 'bg-white/[0.06] text-zinc-400', icon: XCircle },
  deleted: { color: 'bg-red-500/10 text-red-400', icon: XCircle },
};

const domainStatusConfig = {
  active: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  pending: 'bg-[#FFD23F]/10 text-[#FFD23F]',
  expired: 'bg-red-500/10 text-red-400',
  transferred: 'bg-blue-500/10 text-blue-400',
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
  const [showProvision, setShowProvision] = useState(false);
  const [provisionForm, setProvisionForm] = useState({ userId: '', email: '', userName: '', subdomain: '', storeName: '', pricePerMonth: '19.99' });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

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

  // Fetch users for the provision modal dropdown
  async function fetchUsers() {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/users?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(Array.isArray(data) ? data : []);
      } else {
        console.error('Fetch users failed:', res.status);
        setUsersError('Could not load users');
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setUsersError('Could not load users');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleProvision(e) {
    e.preventDefault();
    setProvisioning(true);
    setProvisionResult(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/provision-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: provisionForm.userId || undefined,
          email: provisionForm.email || undefined,
          userName: provisionForm.userName || undefined,
          subdomain: provisionForm.subdomain,
          storeName: provisionForm.storeName,
          pricePerMonth: provisionForm.pricePerMonth,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProvisionResult({ error: data.error || 'Failed to provision store' });
      } else {
        setProvisionResult({ success: true, data });
        fetchData(); // Refresh the stores list
      }
    } catch (err) {
      setProvisionResult({ error: 'Network error: ' + err.message });
    } finally {
      setProvisioning(false);
    }
  }

  const totalStores = Object.entries(statusCounts)
    .filter(([k]) => k !== 'deleted')
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Stores & Domains</h1>
          <p className="text-zinc-500">View and manage customer stores and domain registrations.</p>
        </div>
        <button
          onClick={() => { setShowProvision(true); setProvisionResult(null); fetchUsers(); }}
          className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90"
        >
          <Plus className="h-4 w-4" /> Provision Store
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[16px] bg-[#111] p-5">
          <p className="text-sm font-medium text-zinc-500">Total Stores</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalStores}</p>
        </div>
        <div className="rounded-[16px] bg-[#111] p-5">
          <p className="text-sm font-medium text-zinc-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-[#06D6A0]">{statusCounts.active || 0}</p>
        </div>
        <div className="rounded-[16px] bg-[#111] p-5">
          <p className="text-sm font-medium text-zinc-500">Provisioning</p>
          <p className="mt-1 text-2xl font-bold text-[#FFD23F]">{statusCounts.provisioning || 0}</p>
        </div>
        <div className="rounded-[16px] bg-[#111] p-5">
          <p className="text-sm font-medium text-zinc-500">Domains</p>
          <p className="mt-1 text-2xl font-bold text-[#FF6B35]">{domains.length}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-xl bg-[#111] p-1">
        <button
          onClick={() => setTab('stores')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'stores' ? 'bg-[#FF6B35] text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Store className="h-4 w-4" /> Subdomain Stores ({stores.length})
        </button>
        <button
          onClick={() => setTab('domains')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'domains' ? 'bg-[#FF6B35] text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Globe className="h-4 w-4" /> Purchased Domains ({domains.length})
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rounded-[16px] bg-[#111] p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search by subdomain, domain, or owner email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
            />
          </div>
          <div className="flex gap-2">
            {tab === 'stores' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
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
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm text-zinc-400 hover:bg-white/[0.04]"
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
        <div className="flex items-center justify-center rounded-[16px] bg-[#111] p-16">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-[#FF6B35]" />
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        </div>
      ) : tab === 'stores' ? (
        /* Stores Table */
        <div className="rounded-[16px] bg-[#111] p-6">
          {stores.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Store className="h-12 w-12 text-zinc-700" />
              <p className="text-lg font-medium text-zinc-500">No stores found</p>
              <p className="text-sm text-zinc-600">Stores will appear here when customers create them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
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
                      <tr key={store.id} className="border-b border-white/[0.04]">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B35]/10">
                              <Store className="h-4 w-4 text-[#FF6B35]" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{store.store_name || store.subdomain}</p>
                              <p className="text-xs text-zinc-500">{store.full_domain}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-white">{store.owner_name || 'Unknown'}</p>
                          <p className="text-xs text-zinc-500">{store.owner_email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${sc.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {store.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">
                          {new Date(store.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {store.status === 'active' && (
                              <a
                                href={`https://${store.full_domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-[#FF6B35]"
                                title="Visit store"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {store.status !== 'deleted' && (
                              <button
                                onClick={() => setDeleteModal(store)}
                                className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
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
        <div className="rounded-[16px] bg-[#111] p-6">
          {domains.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Globe className="h-12 w-12 text-zinc-700" />
              <p className="text-lg font-medium text-zinc-500">No domains found</p>
              <p className="text-sm text-zinc-600">Purchased domains will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
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
                    <tr key={d.id} className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#06D6A0]/10">
                            <Globe className="h-4 w-4 text-[#06D6A0]" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{d.domain}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-white">{d.owner_name || 'Unknown'}</p>
                        <p className="text-xs text-zinc-500">{d.owner_email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${domainStatusConfig[d.status] || 'bg-white/[0.06] text-zinc-400'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 capitalize text-zinc-400">{d.registrar || '-'}</td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {d.registered_at ? new Date(d.registered_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 text-zinc-400">
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
          <div className="w-full max-w-md rounded-[16px] bg-[#111] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-bold text-white">Delete Store</h2>
              </div>
              <button onClick={() => setDeleteModal(null)} className="rounded-lg p-1 hover:bg-white/[0.06]">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <p className="text-sm text-zinc-400">
              Are you sure you want to delete <span className="font-semibold text-white">{deleteModal.full_domain}</span>?
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              This will remove the subdomain from Vercel and mark the store as deleted. This action cannot be undone.
            </p>
            <div className="mt-2 rounded-xl bg-[#0a0a0a] p-3 text-xs text-zinc-500">
              <p><span className="font-medium">Owner:</span> {deleteModal.owner_name} ({deleteModal.owner_email})</p>
              <p><span className="font-medium">Created:</span> {new Date(deleteModal.created_at).toLocaleDateString()}</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.1]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Provision Store Modal */}
      {showProvision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowProvision(false)}>
          <div className="w-full max-w-lg rounded-[16px] bg-[#111] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-[#FF6B35]" />
                <h2 className="text-lg font-bold text-white">Provision Store for User</h2>
              </div>
              <button onClick={() => setShowProvision(false)} className="rounded-lg p-1 hover:bg-white/[0.06]">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              Manually create a store and subscription for a user. Use this when payment was received but store creation failed.
            </p>
            <form onSubmit={handleProvision} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">User</label>
                {allUsers.length > 0 ? (
                  <select
                    value={provisionForm.userId}
                    onChange={(e) => {
                      const user = allUsers.find(u => u.id === e.target.value);
                      setProvisionForm({ ...provisionForm, userId: e.target.value, email: user?.email || '', userName: user?.name || '' });
                    }}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
                  >
                    <option value="">Select existing user or enter email below...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                ) : (
                  loadingUsers ? (
                    <p className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-500">Loading users...</p>
                  ) : usersError ? (
                    <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">{usersError} — enter email below to create a new user</p>
                  ) : (
                    <p className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-500">No existing users — enter email below to create one</p>
                  )
                )}
              </div>
              {!provisionForm.userId && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-400">Email <span className="text-[#FF6B35]">*</span></label>
                    <input
                      type="email"
                      value={provisionForm.email}
                      onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                      required={!provisionForm.userId}
                      placeholder="user@example.com"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-zinc-600">User will be created automatically if they don't exist</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-400">User Name</label>
                    <input
                      type="text"
                      value={provisionForm.userName}
                      onChange={(e) => setProvisionForm({ ...provisionForm, userName: e.target.value })}
                      placeholder="Stuart"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">Subdomain</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={provisionForm.subdomain}
                    onChange={(e) => setProvisionForm({ ...provisionForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required
                    placeholder="stu"
                    className="flex-1 rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
                  />
                  <span className="text-sm text-zinc-500">.togogo.me</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">Store Name</label>
                <input
                  type="text"
                  value={provisionForm.storeName}
                  onChange={(e) => setProvisionForm({ ...provisionForm, storeName: e.target.value })}
                  placeholder="Stuart's Store"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">Price Per Month ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={provisionForm.pricePerMonth}
                  onChange={(e) => setProvisionForm({ ...provisionForm, pricePerMonth: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
                />
              </div>

              {provisionResult?.error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-400">{provisionResult.error}</p>
                </div>
              )}

              {provisionResult?.success && (
                <div className="rounded-xl bg-[#06D6A0]/10 border border-[#06D6A0]/20 p-3">
                  <p className="text-sm font-medium text-[#06D6A0]">Store provisioned successfully!</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {provisionResult.data.store.domain} is now active for {provisionResult.data.user.name} ({provisionResult.data.user.email})
                  </p>
                  <a
                    href={provisionResult.data.store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[#FF6B35] hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit store
                  </a>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProvision(false)}
                  className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning || (!provisionForm.userId && !provisionForm.email) || !provisionForm.subdomain}
                  className="flex-1 rounded-xl bg-[#FF6B35] py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90 disabled:opacity-50"
                >
                  {provisioning ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Provisioning...
                    </span>
                  ) : 'Provision Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

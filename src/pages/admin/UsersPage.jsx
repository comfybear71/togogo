import { useState, useEffect } from 'react'
import {
  Search, MoreVertical, Shield, ShieldCheck, ShieldAlert,
  User, X, AlertCircle, Ban, Loader2, Store, RefreshCw,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const roleBadge = {
  admin: 'bg-[#FF6B35]/10 text-[#FF6B35]',
  seller: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  buyer: 'bg-[#FFD23F]/10 text-[#FFD23F]',
}

const verificationBadge = {
  verified: { color: 'text-[#06D6A0]', icon: ShieldCheck, label: 'Verified' },
  basic: { color: 'text-[#FFD23F]', icon: Shield, label: 'Basic' },
  pending: { color: 'text-[#FF6B35]', icon: ShieldAlert, label: 'Pending' },
  none: { color: 'text-zinc-600', icon: Shield, label: 'None' },
  suspended: { color: 'text-red-500', icon: Ban, label: 'Suspended' },
}

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('joinDate')
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionMenuUser, setActionMenuUser] = useState(null)
  const [updating, setUpdating] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (sortBy === 'name') params.set('sort', 'name')
      else if (sortBy === 'revenue') params.set('sort', 'revenue')

      const res = await fetch(`${API_BASE}/api/admin/users?${params}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, sortBy])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const updateUser = async (userId, updates) => {
    setUpdating(userId)
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ userId, ...updates }),
      })
      if (!res.ok) throw new Error('Failed to update user')
      await fetchUsers()
      setActionMenuUser(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  // Close action menu when clicking outside
  useEffect(() => {
    if (!actionMenuUser) return
    const handler = () => setActionMenuUser(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [actionMenuUser])

  const pendingVerifications = users.filter((u) => u.verificationLevel === 'pending')

  return (
    <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-zinc-500">
                {loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#111] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.04]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Verification Queue */}
        {pendingVerifications.length > 0 && (
          <div className="rounded-[16px] border-2 border-[#FF6B35]/20 bg-[#FF6B35]/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#FF6B35]" />
              <h2 className="text-lg font-semibold text-white">Verification Queue ({pendingVerifications.length})</h2>
            </div>
            <div className="space-y-2">
              {pendingVerifications.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl bg-[#111] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B35]/10">
                      <User className="h-5 w-5 text-[#FF6B35]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateUser(u.id, { verificationLevel: 'verified' })}
                      disabled={updating === u.id}
                      className="rounded-lg bg-[#06D6A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#06D6A0]/90 disabled:opacity-50"
                    >
                      {updating === u.id ? 'Saving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateUser(u.id, { verificationLevel: 'none' })}
                      disabled={updating === u.id}
                      className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.1] disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="rounded-[16px] bg-[#111] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
              >
                <option value="joinDate">Newest First</option>
                <option value="revenue">Revenue</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#FF6B35] animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && users.length === 0 && (
          <div className="rounded-[16px] bg-[#111] p-12 text-center">
            <User className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No users yet</h3>
            <p className="text-sm text-zinc-500">
              {searchQuery ? 'No users match your search. Try different keywords.' : 'Users will appear here once they sign up.'}
            </p>
          </div>
        )}

        {/* Users Table */}
        {!loading && users.length > 0 && (
          <div className="rounded-[16px] bg-[#111] p-6">
            <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Verification</th>
                    <th className="pb-3 pr-4">Stores</th>
                    <th className="pb-3 pr-4">Orders</th>
                    <th className="pb-3 pr-4">Revenue</th>
                    <th className="pb-3 pr-4">Joined</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const vBadge = verificationBadge[u.verificationLevel] || verificationBadge.none
                    const VIcon = vBadge.icon
                    return (
                      <tr
                        key={u.id}
                        className="cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]"
                        onClick={() => setSelectedUser(u)}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B35]/20 to-[#06D6A0]/20">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                              ) : (
                                <User className="h-4 w-4 text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white">{u.name}</p>
                              <p className="text-xs text-zinc-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[u.role] || roleBadge.buyer}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className={`flex items-center gap-1 ${vBadge.color}`}>
                            <VIcon className="h-4 w-4" />
                            <span className="text-xs font-medium">{vBadge.label}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {u.storeCount > 0 ? (
                            <div className="flex items-center gap-1 text-[#06D6A0]">
                              <Store className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{u.storeCount}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">{u.totalOrders || '—'}</td>
                        <td className="py-3 pr-4 font-medium text-white">
                          {u.totalRevenue > 0 ? `$${u.totalRevenue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="relative py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionMenuUser(actionMenuUser === u.id ? null : u.id)
                            }}
                            className="rounded-lg p-1.5 hover:bg-white/[0.06]"
                          >
                            <MoreVertical className="h-4 w-4 text-zinc-500" />
                          </button>
                          {actionMenuUser === u.id && (
                            <div className="absolute right-4 top-full z-50 w-44 rounded-xl border border-white/[0.06] bg-[#111] py-1 shadow-xl shadow-black/40">
                              <button
                                onClick={(e) => { e.stopPropagation(); updateUser(u.id, { verificationLevel: 'verified' }) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04]"
                              >
                                <ShieldCheck className="h-4 w-4 text-[#06D6A0]" /> Verify
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateUser(u.id, { role: 'seller' }) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04]"
                              >
                                <Store className="h-4 w-4 text-[#06D6A0]" /> Make Seller
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateUser(u.id, { role: 'admin' }) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04]"
                              >
                                <Shield className="h-4 w-4 text-[#FF6B35]" /> Make Admin
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateUser(u.id, { verificationLevel: 'suspended' }) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                              >
                                <Ban className="h-4 w-4" /> Suspend
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedUser(null)}>
            <div className="w-full max-w-lg rounded-[16px] bg-[#111] p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">User Profile</h2>
                <button onClick={() => setSelectedUser(null)} className="rounded-lg p-1 hover:bg-white/[0.06]">
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-[#0a0a0a] p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B35] to-[#06D6A0]">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedUser.name}</h3>
                  <p className="text-sm text-zinc-500">{selectedUser.email}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[selectedUser.role] || roleBadge.buyer}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Verification</p>
                  <p className="text-lg font-bold capitalize text-white">{selectedUser.verificationLevel}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Stores</p>
                  <p className="text-lg font-bold text-white">{selectedUser.storeCount}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Total Orders</p>
                  <p className="text-lg font-bold text-white">{selectedUser.totalOrders}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-xs text-zinc-500">Revenue</p>
                  <p className="text-lg font-bold text-white">${selectedUser.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-zinc-400">
                {selectedUser.phone && <p><span className="font-medium text-white">Phone:</span> {selectedUser.phone}</p>}
                {selectedUser.location && <p><span className="font-medium text-white">Location:</span> {selectedUser.location}</p>}
                <p><span className="font-medium text-white">Joined:</span> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                {selectedUser.bio && <p><span className="font-medium text-white">Bio:</span> {selectedUser.bio}</p>}
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => { updateUser(selectedUser.id, { verificationLevel: 'verified' }); setSelectedUser(null) }}
                  className="flex-1 rounded-xl bg-[#06D6A0] py-2.5 text-sm font-medium text-white hover:bg-[#06D6A0]/90"
                >
                  Verify User
                </button>
                <button
                  onClick={() => { updateUser(selectedUser.id, { role: 'seller' }); setSelectedUser(null) }}
                  className="flex-1 rounded-xl bg-[#FF6B35] py-2.5 text-sm font-medium text-white hover:bg-[#FF6B35]/90"
                >
                  Make Seller
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

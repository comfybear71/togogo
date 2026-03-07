import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  X,
  AlertCircle,
  Ban,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const sampleUsers = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    email: 'sarah.m@example.com',
    avatar: null,
    role: 'seller',
    trustScore: 92,
    verificationLevel: 'verified',
    joinDate: '2025-08-14',
    status: 'active',
    totalOrders: 156,
    totalRevenue: 12400,
    phone: '+1 (555) 123-4567',
    address: 'Portland, OR',
    bio: 'Eco-friendly artisan goods maker.',
  },
  {
    id: '2',
    name: 'James Kowalski',
    email: 'james.k@example.com',
    avatar: null,
    role: 'buyer',
    trustScore: 78,
    verificationLevel: 'basic',
    joinDate: '2025-11-02',
    status: 'active',
    totalOrders: 23,
    totalRevenue: 0,
    phone: '+1 (555) 234-5678',
    address: 'Austin, TX',
    bio: 'Love discovering handmade products.',
  },
  {
    id: '3',
    name: 'Aisha Rahman',
    email: 'aisha.r@example.com',
    avatar: null,
    role: 'seller',
    trustScore: 88,
    verificationLevel: 'pending',
    joinDate: '2025-12-20',
    status: 'active',
    totalOrders: 67,
    totalRevenue: 5230,
    phone: '+1 (555) 345-6789',
    address: 'Brooklyn, NY',
    bio: 'Handmade jewelry and accessories.',
  },
  {
    id: '4',
    name: 'Miguel Lopez',
    email: 'miguel.l@example.com',
    avatar: null,
    role: 'buyer',
    trustScore: 45,
    verificationLevel: 'none',
    joinDate: '2026-01-15',
    status: 'suspended',
    totalOrders: 8,
    totalRevenue: 0,
    phone: '+1 (555) 456-7890',
    address: 'Miami, FL',
    bio: '',
  },
  {
    id: '5',
    name: 'Emily Chen',
    email: 'emily.c@example.com',
    avatar: null,
    role: 'admin',
    trustScore: 100,
    verificationLevel: 'verified',
    joinDate: '2025-06-01',
    status: 'active',
    totalOrders: 0,
    totalRevenue: 0,
    phone: '+1 (555) 567-8901',
    address: 'San Francisco, CA',
    bio: 'Platform administrator.',
  },
];

const roleBadge = {
  admin: 'bg-[#FF6B35]/10 text-[#FF6B35]',
  seller: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  buyer: 'bg-[#FFD23F]/10 text-[#FFD23F]',
};

const verificationBadge = {
  verified: { color: 'text-[#06D6A0]', icon: ShieldCheck, label: 'Verified' },
  basic: { color: 'text-[#FFD23F]', icon: Shield, label: 'Basic' },
  pending: { color: 'text-[#FF6B35]', icon: ShieldAlert, label: 'Pending' },
  none: { color: 'text-gray-400', icon: Shield, label: 'None' },
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joinDate');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenuUser, setActionMenuUser] = useState(null);

  const pendingVerifications = sampleUsers.filter((u) => u.verificationLevel === 'pending');

  const filteredUsers = sampleUsers
    .filter((u) => {
      if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (verificationFilter !== 'all' && u.verificationLevel !== verificationFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'joinDate') return new Date(b.joinDate) - new Date(a.joinDate);
      if (sortBy === 'trustScore') return b.trustScore - a.trustScore;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35]">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage users, verifications, and permissions.</p>
        </div>

        {/* Verification Queue */}
        {pendingVerifications.length > 0 && (
          <div className="rounded-[16px] border-2 border-[#FF6B35]/20 bg-[#FF6B35]/5 p-5 shadow">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#FF6B35]" />
              <h2 className="text-lg font-semibold text-gray-900">Verification Queue ({pendingVerifications.length})</h2>
            </div>
            <div className="space-y-2">
              {pendingVerifications.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B35]/10">
                      <User className="h-5 w-5 text-[#FF6B35]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-[#06D6A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#06D6A0]/90">
                      Approve
                    </button>
                    <button className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="rounded-[16px] bg-white p-5 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="basic">Basic</option>
                <option value="pending">Pending</option>
                <option value="none">None</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#FF6B35] focus:outline-none"
              >
                <option value="joinDate">Newest First</option>
                <option value="trustScore">Trust Score</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-[16px] bg-white p-6 shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Trust Score</th>
                  <th className="pb-3 pr-4">Verification</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const vBadge = verificationBadge[u.verificationLevel];
                  const VIcon = vBadge.icon;
                  return (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B35]/20 to-[#06D6A0]/20">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[u.role]}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${u.trustScore}%`,
                                backgroundColor: u.trustScore >= 80 ? '#06D6A0' : u.trustScore >= 50 ? '#FFD23F' : '#FF6B35',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{u.trustScore}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className={`flex items-center gap-1 ${vBadge.color}`}>
                          <VIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">{vBadge.label}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{new Date(u.joinDate).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            u.status === 'active' ? 'bg-[#06D6A0]/10 text-[#06D6A0]' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="relative py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuUser(actionMenuUser === u.id ? null : u.id);
                          }}
                          className="rounded-lg p-1.5 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </button>
                        {actionMenuUser === u.id && (
                          <div className="absolute right-0 top-full z-10 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                              <ShieldCheck className="h-4 w-4 text-[#06D6A0]" /> Verify
                            </button>
                            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                              <AlertCircle className="h-4 w-4 text-[#FFD23F]" /> Warn
                            </button>
                            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                              <ShieldAlert className="h-4 w-4 text-[#FF6B35]" /> Suspend
                            </button>
                            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                              <Ban className="h-4 w-4" /> Ban
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
        </div>

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedUser(null)}>
            <div className="w-full max-w-lg rounded-[16px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">User Profile</h2>
                <button onClick={() => setSelectedUser(null)} className="rounded-lg p-1 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B35] to-[#06D6A0]">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[selectedUser.role]}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Trust Score</p>
                  <p className="text-lg font-bold text-gray-900">{selectedUser.trustScore}/100</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Verification</p>
                  <p className="text-lg font-bold capitalize text-gray-900">{selectedUser.verificationLevel}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-lg font-bold text-gray-900">{selectedUser.totalOrders}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-lg font-bold text-gray-900">${selectedUser.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p><span className="font-medium text-gray-900">Phone:</span> {selectedUser.phone}</p>
                <p><span className="font-medium text-gray-900">Location:</span> {selectedUser.address}</p>
                <p><span className="font-medium text-gray-900">Joined:</span> {new Date(selectedUser.joinDate).toLocaleDateString()}</p>
                {selectedUser.bio && <p><span className="font-medium text-gray-900">Bio:</span> {selectedUser.bio}</p>}
              </div>
              <div className="mt-5 flex gap-2">
                <button className="flex-1 rounded-xl bg-[#06D6A0] py-2.5 text-sm font-medium text-white hover:bg-[#06D6A0]/90">
                  Verify User
                </button>
                <button className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

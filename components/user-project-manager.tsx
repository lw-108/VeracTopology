'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  FolderKanban,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  Sparkles,
  Layers,
  Code,
  Shield,
  Terminal,
  Copy,
} from 'lucide-react';
import type { UserEntity, ProjectEntity } from '@/types/graph';

interface UserProjectManagerProps {
  onUserSelect?: (user: UserEntity) => void;
}

export function UserProjectManager({ onUserSelect }: UserProjectManagerProps) {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApiViewOpen, setIsApiViewOpen] = useState(false);
  const [apiResponseJson, setApiResponseJson] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Security Engineer');
  const [formProjectName, setFormProjectName] = useState('');
  const [formProjectDeadline, setFormProjectDeadline] = useState('');
  const [formProjectDesc, setFormProjectDesc] = useState('');
  const [formProjectStatus, setFormProjectStatus] = useState<'Planning' | 'Active' | 'In Review' | 'Completed' | 'Critical'>('Active');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsApiViewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load all users from /api/user
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        if (!selectedUser) {
          setSelectedUser(data.users[0]);
          if (onUserSelect) onUserSelect(data.users[0]);
        }
      }
    } catch (err) {
      console.error('[UserProjectManager] Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, onUserSelect]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle user switch
  const handleSelectUser = (user: UserEntity) => {
    setSelectedUser(user);
    if (onUserSelect) onUserSelect(user);
  };

  // Test /api/user/[userId]/projects endpoint live
  const handleTestUserProjectApi = async (userId: string) => {
    try {
      const res = await fetch(`/api/user/${userId}/projects`);
      const data = await res.json();
      setApiResponseJson(JSON.stringify(data, null, 2));
      setIsApiViewOpen(true);
    } catch (err: any) {
      setApiResponseJson(JSON.stringify({ error: err.message }, null, 2));
      setIsApiViewOpen(true);
    }
  };

  // Create User + 1-to-1 Project
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        project: formProjectName.trim()
          ? {
              name: formProjectName.trim(),
              deadline: formProjectDeadline,
              description: formProjectDesc.trim(),
              status: formProjectStatus,
            }
          : undefined,
      };

      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Create user failed');
      const data = await res.json();

      if (data.user) {
        setUsers((prev) => [data.user, ...prev]);
        setSelectedUser(data.user);
        if (onUserSelect) onUserSelect(data.user);
      }

      // Reset form
      setFormName('');
      setFormEmail('');
      setFormProjectName('');
      setFormProjectDeadline('');
      setFormProjectDesc('');
      setIsCreateOpen(false);
    } catch (err) {
      console.error('[UserProjectManager] Create error:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: UserEntity) => {
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormProjectName(user.project?.name || '');
    setFormProjectDeadline(user.project?.deadline || '');
    setFormProjectDesc(user.project?.description || '');
    setFormProjectStatus(user.project?.status || 'Active');
    setIsEditOpen(true);
  };

  // Update User & Project
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        project: {
          name: formProjectName.trim(),
          deadline: formProjectDeadline,
          description: formProjectDesc.trim(),
          status: formProjectStatus,
        },
      };

      const res = await fetch(`/api/user/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Update user failed');

      // Update state locally
      const updatedUser: UserEntity = {
        ...selectedUser,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        project: {
          id: selectedUser.project?.id || `proj-${Date.now().toString(36)}`,
          name: formProjectName.trim(),
          deadline: formProjectDeadline,
          description: formProjectDesc.trim(),
          status: formProjectStatus,
          userId: selectedUser.id,
        },
      };

      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updatedUser : u)));
      setSelectedUser(updatedUser);
      if (onUserSelect) onUserSelect(updatedUser);

      setIsEditOpen(false);
    } catch (err) {
      console.error('[UserProjectManager] Update error:', err);
    }
  };

  // Delete User & Project
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and their associated project?')) return;

    try {
      const res = await fetch(`/api/user/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete user failed');

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedUser?.id === userId) {
        const remaining = users.filter((u) => u.id !== userId);
        const next = remaining[0] || null;
        setSelectedUser(next);
        if (onUserSelect && next) onUserSelect(next);
      }
    } catch (err) {
      console.error('[UserProjectManager] Delete error:', err);
    }
  };

  const project = selectedUser?.project;

  return (
    <div className="flex items-center gap-2">
      {/* ── Active User & Project Badge in Header ──────────────────────── */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs text-slate-800 font-medium transition-all shadow-xs"
        title="Manage Users & Project Details"
      >
        <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
          {selectedUser ? selectedUser.name.charAt(0) : 'U'}
        </div>
        <div className="flex flex-col text-left leading-tight">
          <span className="font-semibold text-slate-900 truncate max-w-[110px]">
            {selectedUser?.name || 'Select User'}
          </span>
          <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
            {project ? `📁 ${project.name}` : 'No Project'}
          </span>
        </div>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {/* ── Main User CRUD & Project Details Modal (Rendered via Portal) ──── */}
      {mounted &&
        isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative w-full max-w-2xl my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
                    <User size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">User & Project Registry</h2>
                    <p className="text-xs text-slate-500">1 User $\leftrightarrow$ 1 Project Topology Association in PostgreSQL + Apache AGE</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus size={13} />
                    <span>New User</span>
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body: Active Project Summary Card */}
              {selectedUser && project && (
                <div className="m-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 shrink-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-md bg-purple-100 text-purple-700">
                        <FolderKanban size={14} />
                      </span>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                          Active Project
                        </div>
                        <h3 className="text-xs font-bold text-slate-900">{project.name}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          project.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : project.status === 'In Review'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {project.status || 'Active'}
                      </span>
                      <button
                        onClick={() => openEditModal(selectedUser)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60"
                        title="Edit User & Project"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                    {project.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Deadline:</span>
                      <span className="font-semibold text-slate-800">
                        {project.deadline || 'No deadline set'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTestUserProjectApi(selectedUser.id)}
                      className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
                      title="Inspect GET /api/user/[userId]/projects output"
                    >
                      <Terminal size={11} className="text-slate-500" />
                      <span>Query User ID API</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Body: Users List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  All Users & Associated Projects ({users.length})
                </div>

                {users.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const p = u.project;
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        handleSelectUser(u);
                        setIsModalOpen(false);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-slate-900 bg-white shadow-xs ring-1 ring-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                            isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({u.role})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                          {p && (
                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 truncate max-w-[200px]">
                                📁 {p.name}
                              </span>
                              {p.deadline && (
                                <span className="text-slate-500 text-[10px]">
                                  ⏳ {p.deadline}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestUserProjectApi(u.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100"
                          title="Query API for this user"
                        >
                          <Terminal size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(u);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100"
                          title="Edit User"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(u.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Create User Modal (Rendered via Portal) ───────────────────── */}
      {mounted &&
        isCreateOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
            onClick={() => setIsCreateOpen(false)}
          >
            <div
              className="relative w-full max-w-md my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-900 text-white">
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Create New User & Project</h3>
                    <p className="text-xs text-slate-500">1 User $\leftrightarrow$ 1 Project in PostgreSQL + Apache AGE</p>
                  </div>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">User Information</div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Lin"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. maya.lin@sentinel.sec"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Role</label>
                    <input
                      type="text"
                      placeholder="e.g. Zero-Trust Security Lead"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2.5">
                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Associated Project (1-to-1)</div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cloud Sentinel Enforcer"
                      value={formProjectName}
                      onChange={(e) => setFormProjectName(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Deadline</label>
                      <input
                        type="date"
                        required
                        value={formProjectDeadline}
                        onChange={(e) => setFormProjectDeadline(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        value={formProjectStatus}
                        onChange={(e) => setFormProjectStatus(e.target.value as any)}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                      >
                        <option value="Planning">Planning</option>
                        <option value="Active">Active</option>
                        <option value="In Review">In Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Project Description</label>
                    <textarea
                      rows={2}
                      placeholder="Project scope, security objectives, target mesh..."
                      value={formProjectDesc}
                      onChange={(e) => setFormProjectDesc(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs"
                  >
                    Create User & Project
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ── Edit User Modal (Rendered via Portal) ─────────────────────── */}
      {mounted &&
        isEditOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
            onClick={() => setIsEditOpen(false)}
          >
            <div
              className="relative w-full max-w-md my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Edit User & Project Details</h3>
                <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      required
                      value={formProjectName}
                      onChange={(e) => setFormProjectName(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={formProjectDeadline}
                      onChange={(e) => setFormProjectDeadline(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={formProjectDesc}
                      onChange={(e) => setFormProjectDesc(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ── API Response Live Console Inspector (Rendered via Portal) ──── */}
      {mounted &&
        isApiViewOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
            onClick={() => setIsApiViewOpen(false)}
          >
            <div
              className="relative w-full max-w-xl my-auto bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-5 font-mono text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Terminal Header */}
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold pl-2">
                    <Terminal size={14} />
                    <span>GET /api/user/[userId]/projects</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiResponseJson);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button onClick={() => setIsApiViewOpen(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Terminal Output */}
              <pre className="p-3.5 bg-slate-900/90 rounded-xl overflow-x-auto text-[11px] text-emerald-300 border border-slate-800/80 max-h-96 leading-relaxed">
                {apiResponseJson}
              </pre>

              <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Status: <strong className="text-emerald-400">200 OK</strong> · Source: <strong className="text-purple-400">neo4j</strong></span>
                <button
                  onClick={() => setIsApiViewOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Close Console
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

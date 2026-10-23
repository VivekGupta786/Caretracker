import React, { useState } from 'react';
import { UserPlus, Search, ShieldCheck, ShieldOff, Mail, Briefcase } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge, roleBadge } from '../components/ui/Badge';
import { Button, FormField, inputCls, selectCls, EmptyState } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import type { User, UserRole } from '../types';

export default function UserManagement() {
  const { users, currentUser, addUser, toggleUserActive } = useApp();
  const { success, error } = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout
      title="User Management"
      subtitle={`${users.length} staff accounts · ${users.filter(u => u.active).length} active`}
      actions={<Button onClick={() => setModalOpen(true)}><UserPlus className="w-4 h-4" /> Add User</Button>}
    >
      {/* Search */}
      <Card className="p-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Users grid */}
      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={<UserPlus className="w-12 h-12" />} title="No users found" />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => (
            <Card key={u.id} className={`p-4 ${!u.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                    u.role === 'admin' ? 'bg-purple-500' : u.role === 'doctor' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}>
                    {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{u.name}{u.id === currentUser?.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}</p>
                    {roleBadge(u.role)}
                  </div>
                </div>
                {!u.active && <Badge variant="danger">Inactive</Badge>}
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {u.email}</p>
                {u.department && <p className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> {u.department}</p>}
                <p>Joined {new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
              {u.id !== currentUser?.id && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <Button
                    variant={u.active ? 'outline' : 'primary'}
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      toggleUserActive(u.id);
                      success(u.active ? 'User deactivated' : 'User reactivated', u.name);
                    }}
                  >
                    {u.active ? <><ShieldOff className="w-3.5 h-3.5" /> Deactivate</> : <><ShieldCheck className="w-3.5 h-3.5" /> Reactivate</>}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(user) => {
          const result = addUser(user);
          if (result.success) {
            success('User created', `${user.name} added as ${user.role}`);
            setModalOpen(false);
          } else {
            error('Could not create user', result.error);
          }
        }}
        nextId={users.length + 1}
      />
    </Layout>
  );
}

function AddUserModal({ open, onClose, onAdd, nextId }: { open: boolean; onClose: () => void; onAdd: (u: User) => void; nextId: number }) {
  const blank = { name: '', email: '', role: 'nurse' as UserRole, department: '' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const user: User = {
      id: `u${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      department: form.department.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    onAdd(user);
    setForm(blank);
    setErrors({});
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Staff Member"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}><UserPlus className="w-4 h-4" /> Create User</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Full Name" error={errors.name} required>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Maria Gomez" autoFocus />
        </FormField>
        <FormField label="Email" error={errors.email} required>
          <input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@caretrack.demo" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Role" required>
            <select className={selectCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
              <option value="nurse">Nurse</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
          <FormField label="Department">
            <input className={inputCls} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Ward A" />
          </FormField>
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">New users are created active. They can sign in using their email on the login screen.</p>
      </div>
    </Modal>
  );
}

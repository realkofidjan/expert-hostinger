import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Settings, ToggleLeft, ToggleRight, MapPin, CreditCard,
  Save, Smartphone, Banknote, Truck, Pencil, Check, X, AlertTriangle,
  Trash2, Download, Upload, Construction, RotateCcw, CheckCircle2,
  ShieldCheck, Lock, Users, Building2, Globe, Mail, Phone, Hash,
  Percent, Link2, Clock, Bell, AtSign
} from 'lucide-react';
import api from '../../api';
import { useAlert } from '../../context/AlertContext';
import { useRole, fetchRolePermissions, clearPermissionsCache } from '../../utils/permissions';

// ── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',     label: 'General',     icon: <Building2 size={15} /> },
  { id: 'payments',    label: 'Payments',    icon: <CreditCard size={15} /> },
  { id: 'delivery',    label: 'Delivery',    icon: <Truck size={15} /> },
  { id: 'permissions', label: 'Permissions', icon: <ShieldCheck size={15} />, adminOnly: true },
  { id: 'backup',      label: 'Backup',      icon: <Download size={15} /> },
];

const EMPTY_FORM = {
  // ── Company / General ────────────────────────────────────────────────────
  company_name: '',
  company_tagline: '',
  company_email: '',
  company_phone: '',
  company_secondary_phone: '',
  company_registration: '',
  vat_rate: '0',
  notification_email: '',
  business_hours: '',
  store_address: '',
  pickup_address: '',
  // ── Social Media ─────────────────────────────────────────────────────────
  social_instagram: '',
  social_facebook: '',
  social_twitter: '',
  social_linkedin: '',
  // ── Payments ─────────────────────────────────────────────────────────────
  paystack_enabled: 'true',
  bank_name: '',
  bank_branch: '',
  bank_account_number: '',
  bank_account_name: '',
  momo_number: '',
  momo_network: 'MTN',
  manual_payment_instructions: '',
  // ── Site ─────────────────────────────────────────────────────────────────
  under_construction: 'false',
};

// Keys that belong to each tab's save action
const GENERAL_KEYS  = ['company_name','company_tagline','company_email','company_phone','company_secondary_phone','company_registration','vat_rate','notification_email','business_hours','store_address','pickup_address','social_instagram','social_facebook','social_twitter','social_linkedin','under_construction'];
const PAYMENT_KEYS  = ['paystack_enabled','bank_name','bank_branch','bank_account_number','bank_account_name','momo_number','momo_network','manual_payment_instructions'];

const AdminSettings = () => {
  const navigate = useNavigate();
  const { can, isAdmin } = useRole();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingPayments, setSavingPayments] = useState(false);

  useEffect(() => { if (!can('manageSettings')) navigate('/admin', { replace: true }); }, []);

  const [form, setForm] = useState(EMPTY_FORM);
  const f = (key) => form[key] ?? '';
  const set = (key) => (v) => setForm(p => ({ ...p, [key]: v }));
  const setCheck = (key) => () => setForm(p => ({ ...p, [key]: p[key] === 'true' ? 'false' : 'true' }));

  // Delivery
  const [regions, setRegions] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [editingRegion, setEditingRegion] = useState(null);

  // Permissions
  const [permDefinitions, setPermDefinitions] = useState([]);
  const [permMatrix, setPermMatrix] = useState({ 'sub-admin': {}, staff: {} });
  const [permLoading, setPermLoading] = useState(false);
  const [savingRole, setSavingRole] = useState(null);

  // Backup
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState(null);
  const restoreInputRef = useRef(null);

  // Load settings + regions on mount
  useEffect(() => {
    api.get('/admin/settings')
      .then(res => setForm(prev => ({ ...prev, ...res.data })))
      .catch(() => showAlert('error', 'Load Failed', 'Could not load settings'))
      .finally(() => setLoading(false));

    api.get('/admin/delivery-regions')
      .then(res => setRegions(res.data || []))
      .catch(() => {})
      .finally(() => setRegionsLoading(false));
  }, []);

  // Load permissions when Permissions tab first opens (admin only)
  useEffect(() => {
    if (activeTab === 'permissions' && isAdmin && permDefinitions.length === 0) {
      setPermLoading(true);
      api.get('/admin/permissions')
        .then(res => {
          setPermDefinitions(res.data.definitions || []);
          setPermMatrix(res.data.permissions || { 'sub-admin': {}, staff: {} });
        })
        .catch(() => showAlert('error', 'Load Failed', 'Could not load permissions'))
        .finally(() => setPermLoading(false));
    }
  }, [activeTab, isAdmin]);

  // ── Save handlers ────────────────────────────────────────────────────────
  const saveKeys = async (keys, setSaving, label) => {
    setSaving(true);
    try {
      const payload = {};
      keys.forEach(k => { payload[k] = form[k] ?? ''; });
      await api.put('/admin/settings', payload);
      showAlert('success', 'Saved', `${label} updated successfully.`);
    } catch (err) {
      showAlert('error', 'Save Failed', err.response?.data?.error || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral  = (e) => { e.preventDefault(); saveKeys(GENERAL_KEYS,  setSavingGeneral,  'General settings'); };
  const handleSavePayments = (e) => { e.preventDefault(); saveKeys(PAYMENT_KEYS,  setSavingPayments, 'Payment settings'); };

  const toggleUnderConstruction = () => {
    const newVal = form.under_construction === 'true' ? 'false' : 'true';
    setForm(p => ({ ...p, under_construction: newVal }));
    api.put('/admin/settings', { under_construction: newVal })
      .then(() => showAlert('success', newVal === 'true' ? 'Under Construction' : 'Site Live',
        newVal === 'true' ? 'Visitors see the construction page.' : 'Your website is now visible.'))
      .catch(() => showAlert('error', 'Failed', 'Could not update setting'));
  };

  const saveRegion = async (region) => {
    try {
      await api.put(`/admin/delivery-regions/${region.id}`, {
        delivery_fee: region.delivery_fee,
        is_free: region.is_free,
        is_active: region.is_active !== false,
      });
      setRegions(prev => prev.map(r => r.id === region.id ? { ...r, ...region } : r));
      setEditingRegion(null);
      showAlert('success', 'Region Updated', `${region.region_name} delivery fee updated.`);
    } catch {
      showAlert('error', 'Update Failed', 'Could not update delivery region');
    }
  };

  const handlePermToggle = (role, key) => {
    setPermMatrix(prev => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } }));
  };

  const handleSavePermissions = async (role) => {
    setSavingRole(role);
    try {
      await api.put('/admin/permissions', { role, permissions: permMatrix[role] });
      clearPermissionsCache();
      showAlert('success', 'Permissions Saved', `${role === 'sub-admin' ? 'Sub-Admin' : 'Staff'} permissions updated.`);
    } catch (err) {
      showAlert('error', 'Save Failed', err.response?.data?.error || 'Could not save permissions');
    } finally {
      setSavingRole(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `expert-office-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      showAlert('success', 'Backup Downloaded', 'All tables exported.');
    } catch {
      showAlert('error', 'Export Failed', 'Could not generate backup.');
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) { showAlert('error', 'Invalid File', 'Please upload a .zip file.'); return; }
    setRestoring(true);
    setRestoreResults(null);
    const formData = new FormData();
    formData.append('backup', file);
    try {
      const res = await api.post('/admin/backup/restore', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setRestoreResults(res.data.results);
      showAlert('success', 'Restore Complete', `${res.data.results.filter(r => r.status === 'restored').length} tables restored.`);
    } catch (err) {
      showAlert('error', 'Restore Failed', err.response?.data?.error || 'Could not restore backup.');
    } finally {
      setRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    if (resetPhrase !== 'RESET') return;
    setResetting(true);
    try {
      await api.delete('/admin/reset-database');
      showAlert('success', 'Database Reset', 'All operational data cleared.');
      setResetConfirm(false);
      setResetPhrase('');
    } catch (err) {
      showAlert('error', 'Reset Failed', err.response?.data?.error || 'Could not reset database');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-40">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);
  const isUnderConstruction = form.under_construction === 'true';
  const isPaystackEnabled  = form.paystack_enabled  === 'true';

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">

        {/* ── Header ── */}
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Platform Settings</h1>
          <p className="text-[var(--text-muted)] mt-1 font-medium">Manage all platform configuration from one place</p>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 p-1.5 bg-[var(--bg-secondary)] rounded-2xl w-fit flex-wrap">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GENERAL TAB                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="space-y-6">

            {/* Company Information */}
            <Section icon={<Building2 size={20} className="text-green-500" />} title="Company Information">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-5">Core business details used on documents, proformas, and receipts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput icon={<Building2 size={14} />} label="Company Name" value={f('company_name')} onChange={set('company_name')} placeholder="e.g. Expert Office Furnish Ltd." />
                <FieldInput icon={<Hash size={14} />} label="Business Tagline" value={f('company_tagline')} onChange={set('company_tagline')} placeholder="e.g. Your Health, Your Wealth" />
                <FieldInput icon={<Hash size={14} />} label="Registration / TIN Number" value={f('company_registration')} onChange={set('company_registration')} placeholder="e.g. CS123456789" />
                <FieldInput icon={<Percent size={14} />} label="VAT Rate (%)" value={f('vat_rate')} onChange={set('vat_rate')} placeholder="e.g. 15" type="number" />
              </div>
            </Section>

            {/* Contact Details */}
            <Section icon={<Phone size={20} className="text-blue-500" />} title="Contact Details">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-5">Displayed on documents and contact pages.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput icon={<Mail size={14} />} label="Primary Email" value={f('company_email')} onChange={set('company_email')} placeholder="e.g. info@expertoffice.com" />
                <FieldInput icon={<Bell size={14} />} label="Notification / Orders Email" value={f('notification_email')} onChange={set('notification_email')} placeholder="e.g. orders@expertoffice.com" />
                <FieldInput icon={<Phone size={14} />} label="Primary Phone" value={f('company_phone')} onChange={set('company_phone')} placeholder="e.g. +233 30 000 0000" />
                <FieldInput icon={<Phone size={14} />} label="Secondary Phone" value={f('company_secondary_phone')} onChange={set('company_secondary_phone')} placeholder="e.g. +233 55 000 0000" />
                <div className="md:col-span-2">
                  <FieldInput icon={<Clock size={14} />} label="Business Hours" value={f('business_hours')} onChange={set('business_hours')} placeholder="e.g. Mon–Fri: 8am–6pm | Sat: 9am–3pm" />
                </div>
              </div>
            </Section>

            {/* Location */}
            <Section icon={<MapPin size={20} className="text-yellow-500" />} title="Location">
              <div className="space-y-4">
                <FieldInput icon={<MapPin size={14} />} label="Pickup / Showroom Address" value={f('pickup_address') || f('store_address')} onChange={(v) => setForm(p => ({ ...p, pickup_address: v, store_address: v }))} placeholder="e.g. 12 Liberation Road, Accra, Ghana" />
              </div>
            </Section>

            {/* Social Media */}
            <Section icon={<Globe size={20} className="text-purple-500" />} title="Social Media">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-5">Links displayed on the website footer and contact section.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput icon={<AtSign size={14} />} label="Instagram" value={f('social_instagram')} onChange={set('social_instagram')} placeholder="https://instagram.com/expertoffice" />
                <FieldInput icon={<Link2 size={14} />} label="Facebook" value={f('social_facebook')} onChange={set('social_facebook')} placeholder="https://facebook.com/expertoffice" />
                <FieldInput icon={<Link2 size={14} />} label="X / Twitter" value={f('social_twitter')} onChange={set('social_twitter')} placeholder="https://x.com/expertoffice" />
                <FieldInput icon={<Globe size={14} />} label="LinkedIn" value={f('social_linkedin')} onChange={set('social_linkedin')} placeholder="https://linkedin.com/company/expertoffice" />
              </div>
            </Section>

            {/* Site Visibility */}
            <Section icon={<Construction size={20} className="text-amber-500" />} title="Site Visibility">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">When enabled, visitors see a maintenance page. Admin access is unaffected.</p>
              <div
                onClick={toggleUnderConstruction}
                className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${isUnderConstruction ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-amber-500/20'}`}
              >
                <div>
                  <p className="font-black text-[var(--text-primary)] text-sm">Under Construction Mode</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {isUnderConstruction ? 'Site is hidden — visitors see construction page.' : 'Site is live and visible to all visitors.'}
                  </p>
                </div>
                <div className={`transition-colors ${isUnderConstruction ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                  {isUnderConstruction ? <ToggleRight size={40} strokeWidth={1.5} /> : <ToggleLeft size={40} strokeWidth={1.5} />}
                </div>
              </div>
            </Section>

            <SaveButton loading={savingGeneral} label="SAVE GENERAL SETTINGS" />
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PAYMENTS TAB                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payments' && (
          <form onSubmit={handleSavePayments} className="space-y-6">

            {/* Paystack */}
            <Section icon={<CreditCard size={20} className="text-green-500" />} title="Online Payment Gateway">
              <div
                onClick={() => setForm(p => ({ ...p, paystack_enabled: isPaystackEnabled ? 'false' : 'true' }))}
                className={`flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all ${isPaystackEnabled ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-green-500/20'}`}
              >
                <div>
                  <p className="font-black text-[var(--text-primary)]">Paystack (Mobile Money)</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">
                    {isPaystackEnabled ? 'Customers can pay via MoMo through Paystack.' : 'Paystack is disabled — MoMo option hidden at checkout.'}
                  </p>
                </div>
                <div className={`transition-colors ${isPaystackEnabled ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                  {isPaystackEnabled ? <ToggleRight size={44} strokeWidth={1.5} /> : <ToggleLeft size={44} strokeWidth={1.5} />}
                </div>
              </div>
            </Section>

            {/* Bank Transfer */}
            <Section icon={<Banknote size={20} className="text-blue-500" />} title="Bank Transfer Details">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">Shown to customers who choose to pay by bank transfer.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput icon={<Building2 size={14} />} label="Bank Name" value={f('bank_name')} onChange={set('bank_name')} placeholder="e.g. GCB Bank" />
                <FieldInput icon={<MapPin size={14} />} label="Branch" value={f('bank_branch')} onChange={set('bank_branch')} placeholder="e.g. Accra Main Branch" />
                <FieldInput icon={<Hash size={14} />} label="Account Number" value={f('bank_account_number')} onChange={set('bank_account_number')} placeholder="e.g. 1234567890" />
                <FieldInput icon={<Building2 size={14} />} label="Account Name" value={f('bank_account_name')} onChange={set('bank_account_name')} placeholder="e.g. Expert Office Furnish Ltd." />
              </div>
            </Section>

            {/* MoMo */}
            <Section icon={<Smartphone size={20} className="text-green-500" />} title="Mobile Money Details">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">Manual MoMo transfer details shown when Paystack is off or as an alternative.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2 block mb-1.5">Network</label>
                  <select
                    value={f('momo_network')}
                    onChange={e => setForm(p => ({ ...p, momo_network: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none transition-all"
                  >
                    <option value="MTN">MTN MoMo</option>
                    <option value="AirtelTigo">AirtelTigo Money</option>
                    <option value="Vodafone">Vodafone Cash</option>
                  </select>
                </div>
                <FieldInput icon={<Smartphone size={14} />} label="MoMo Number" value={f('momo_number')} onChange={set('momo_number')} placeholder="e.g. 0241234567" />
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2 block mb-1.5">Payment Instructions (optional)</label>
                  <textarea
                    value={f('manual_payment_instructions')}
                    onChange={e => setForm(p => ({ ...p, manual_payment_instructions: e.target.value }))}
                    rows={3}
                    placeholder="Any additional instructions shown to customers during checkout..."
                    className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none transition-all placeholder:font-normal placeholder:text-[var(--text-muted)] resize-none"
                  />
                </div>
              </div>
            </Section>

            <SaveButton loading={savingPayments} label="SAVE PAYMENT SETTINGS" />
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* DELIVERY TAB                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'delivery' && (
          <Section icon={<Truck size={20} className="text-purple-500" />} title="Delivery Regions & Pricing">
            <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">
              Set delivery fees per Ghana region. Toggle free delivery for applicable areas.
              Click the <Pencil size={12} className="inline" /> icon to edit a region.
            </p>
            {regionsLoading ? (
              <div className="flex items-center gap-2 text-[var(--text-muted)] py-4">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Loading regions...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {regions.map(region => (
                  <div key={region.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${editingRegion?.id === region.id ? 'border-green-500/40 bg-green-500/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
                    <div className="flex-1">
                      <span className="font-bold text-sm text-[var(--text-primary)]">{region.region_name}</span>
                      {region.is_free && <span className="ml-2 text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Free</span>}
                    </div>
                    {editingRegion?.id === region.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium cursor-pointer">
                          <input type="checkbox" checked={editingRegion.is_free}
                            onChange={e => setEditingRegion(r => ({ ...r, is_free: e.target.checked, delivery_fee: e.target.checked ? 0 : r.delivery_fee }))}
                            className="accent-green-500"
                          /> Free
                        </label>
                        {!editingRegion.is_free && (
                          <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-1.5">
                            <span className="text-xs text-[var(--text-muted)] font-bold">₵</span>
                            <input type="number" step="0.01" min="0" value={editingRegion.delivery_fee}
                              onChange={e => setEditingRegion(r => ({ ...r, delivery_fee: e.target.value }))}
                              className="w-20 text-sm font-bold text-[var(--text-primary)] bg-transparent outline-none"
                            />
                          </div>
                        )}
                        <button onClick={() => saveRegion(editingRegion)} className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"><Check size={14} /></button>
                        <button onClick={() => setEditingRegion(null)} className="p-2 bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-xl hover:text-red-500 transition-colors"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {region.is_free ? 'Free' : region.delivery_fee > 0
                            ? `₵${parseFloat(region.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
                            : <span className="text-amber-500 text-xs font-bold">Not set</span>}
                        </span>
                        <button
                          onClick={() => setEditingRegion({ id: region.id, region_name: region.region_name, delivery_fee: region.delivery_fee, is_free: region.is_free, is_active: region.is_active })}
                          className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-green-500 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PERMISSIONS TAB                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'permissions' && isAdmin && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
              <Lock size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)] mb-0.5">Role Permission Matrix</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Control what <strong className="text-[var(--text-primary)]">Sub-Admins</strong> and <strong className="text-[var(--text-primary)]">Staff</strong> can access.
                  Admins always have full access. Changes take effect at the user's next login.
                </p>
              </div>
            </div>

            {permLoading ? (
              <div className="flex items-center gap-2 text-[var(--text-muted)] py-8">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Loading permissions...
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {['sub-admin', 'staff'].map(role => (
                  <Section
                    key={role}
                    icon={<Users size={18} className={role === 'sub-admin' ? 'text-purple-400' : 'text-blue-400'} />}
                    title={role === 'sub-admin' ? 'Sub-Admin Permissions' : 'Staff Permissions'}
                  >
                    <div className="space-y-2 mb-6">
                      {permDefinitions.map(perm => {
                        const enabled = !!(permMatrix[role]?.[perm.key]);
                        return (
                          <div
                            key={perm.key}
                            onClick={() => handlePermToggle(role, perm.key)}
                            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                              enabled
                                ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                                : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-color)]'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <p className={`font-bold text-sm ${enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                {perm.label}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">{perm.desc}</p>
                            </div>
                            <div className={`flex-shrink-0 transition-colors ${enabled ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                              {enabled ? <ToggleRight size={32} strokeWidth={1.5} /> : <ToggleLeft size={32} strokeWidth={1.5} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSavePermissions(role)}
                      disabled={savingRole === role}
                      className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-extrabold text-xs tracking-widest uppercase hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingRole === role ? (
                        <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving...</>
                      ) : (
                        <><Save size={14} /> Save {role === 'sub-admin' ? 'Sub-Admin' : 'Staff'} Permissions</>
                      )}
                    </button>
                  </Section>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* BACKUP TAB                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Export */}
              <Section icon={<Download size={20} className="text-blue-500" />} title="Export Backup">
                <p className="text-sm text-[var(--text-muted)] -mt-2 mb-5">Download all database tables as Excel files in a single zip archive.</p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-500/10 hover:bg-blue-500/20 border-2 border-blue-500/30 hover:border-blue-500/50 text-blue-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {exporting
                    ? <><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Exporting...</>
                    : <><Download size={16} /> Download Backup</>}
                </button>
                <p className="text-xs text-[var(--text-muted)] mt-3 text-center">Each table saved as a separate .xlsx file</p>
              </Section>

              {/* Restore */}
              <Section icon={<Upload size={20} className="text-green-500" />} title="Restore from Backup">
                <p className="text-sm text-[var(--text-muted)] -mt-2 mb-5">
                  Upload a backup zip. Each .xlsx must be named after its table (e.g.{' '}
                  <code className="text-xs bg-[var(--bg-tertiary)] px-1 py-0.5 rounded">orders.xlsx</code>).
                </p>
                <input ref={restoreInputRef} type="file" accept=".zip" onChange={handleRestoreFile} className="hidden" />
                <button
                  onClick={() => restoreInputRef.current?.click()}
                  disabled={restoring}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/30 hover:border-green-500/50 text-green-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {restoring
                    ? <><div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Restoring...</>
                    : <><Upload size={16} /> Upload Backup Zip</>}
                </button>
                {restoreResults && (
                  <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto">
                    {restoreResults.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${r.status === 'restored' ? 'bg-green-500/10 text-green-500' : r.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                        <span className="flex items-center gap-1.5">
                          {r.status === 'restored' ? <CheckCircle2 size={12} /> : r.status === 'error' ? <X size={12} /> : <RotateCcw size={12} />}
                          {r.table || r.area}
                        </span>
                        <span>{r.status === 'restored' ? (r.rows != null ? `${r.rows} rows` : `${r.files ?? 0} files`) : r.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* Danger Zone */}
            {can('resetDatabase') && (
              <div className="p-6 rounded-[2rem] border-2 border-red-500/30 bg-red-500/5">
                <h2 className="text-sm font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-3">
                  <AlertTriangle size={18} /> Danger Zone
                </h2>
                <p className="text-xs text-[var(--text-muted)] mb-5">
                  Permanently clear all operational data — orders, inquiries, quotes, logs, and notifications.
                  Product catalog, users, and settings are <strong>preserved</strong>.
                </p>
                {!resetConfirm ? (
                  <button
                    onClick={() => setResetConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                  >
                    <Trash2 size={15} /> Reset Database
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/30">
                    <p className="text-xs font-bold text-red-400">
                      Permanently deletes: <strong>all orders, payments, inquiries, quotes, activity logs, and notifications</strong>. Cannot be undone.
                    </p>
                    <div>
                      <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1.5">Type <strong>RESET</strong> to confirm</label>
                      <input
                        type="text"
                        value={resetPhrase}
                        onChange={e => setResetPhrase(e.target.value.toUpperCase())}
                        placeholder="RESET"
                        className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border-2 border-red-500/40 focus:border-red-500 rounded-xl text-sm font-black text-red-400 outline-none tracking-widest"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReset}
                        disabled={resetPhrase !== 'RESET' || resetting}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        {resetting ? 'Resetting...' : <><Trash2 size={13} /> Confirm Reset</>}
                      </button>
                      <button
                        onClick={() => { setResetConfirm(false); setResetPhrase(''); }}
                        className="px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded-xl font-bold text-xs transition-all hover:bg-[var(--bg-tertiary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

// ── Reusable sub-components ──────────────────────────────────────────────────
const Section = ({ icon, title, children }) => (
  <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-xl">
    <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-6 flex items-center gap-3">
      {icon} {title}
    </h2>
    {children}
  </div>
);

const FieldInput = ({ label, value, onChange, placeholder, icon, type = 'text' }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2 block">{label}</label>
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{icon}</span>
      )}
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full py-3.5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none transition-all placeholder:font-normal placeholder:text-[var(--text-muted)] ${icon ? 'pl-9 pr-4' : 'px-4'}`}
      />
    </div>
  </div>
);

const SaveButton = ({ loading, label }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-3xl font-extrabold text-sm tracking-widest uppercase hover:scale-[1.01] hover:shadow-[0_25px_60px_-10px_rgba(34,197,94,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl"
  >
    {loading
      ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving...</>
      : <><Save size={17} /> {label}</>}
  </button>
);

export default AdminSettings;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Settings, ToggleLeft, ToggleRight, MapPin, FileText, CreditCard,
  Save, Smartphone, Banknote, Truck, Pencil, Check, X, AlertTriangle,
  Trash2, Download, Upload, Construction, RotateCcw, CheckCircle2
} from 'lucide-react';
import api from '../../api';
import { useAlert } from '../../context/AlertContext';
import { useRole } from '../../utils/permissions';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { can } = useRole();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState(null);
  const restoreInputRef = useRef(null);

  useEffect(() => { if (!can('manageSettings')) navigate('/admin', { replace: true }); }, []);

  const [form, setForm] = useState({
    paystack_enabled: 'true',
    under_construction: 'false',
    store_address: '',
    pickup_address: '',
    bank_name: '',
    bank_branch: '',
    bank_account_number: '',
    bank_account_name: '',
    momo_number: '',
    momo_network: 'MTN',
    manual_payment_instructions: '',
  });

  const [regions, setRegions] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [editingRegion, setEditingRegion] = useState(null);

  useEffect(() => {
    api.get('/admin/settings')
      .then(res => setForm(prev => ({ ...prev, ...res.data })))
      .catch(() => showAlert('error', 'Load Failed', 'Could not load settings'))
      .finally(() => setLoading(false));

    api.get('/admin/delivery-regions')
      .then(res => setRegions(res.data || []))
      .catch(() => { })
      .finally(() => setRegionsLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      showAlert('success', 'Settings Saved', 'Platform settings updated successfully.');
    } catch (err) {
      showAlert('error', 'Save Failed', err.response?.data?.error || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveRegion = async (region) => {
    try {
      await api.put(`/admin/delivery-regions/${region.id}`, {
        delivery_fee: region.delivery_fee,
        is_free: region.is_free,
        is_active: region.is_active !== false
      });
      setRegions(prev => prev.map(r => r.id === region.id ? { ...r, ...region } : r));
      setEditingRegion(null);
      showAlert('success', 'Region Updated', `${region.region_name} delivery fee updated.`);
    } catch {
      showAlert('error', 'Update Failed', 'Could not update delivery region');
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
      showAlert('success', 'Backup Downloaded', 'All tables exported as Excel files in a zip.');
    } catch {
      showAlert('error', 'Export Failed', 'Could not generate backup.');
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      showAlert('error', 'Invalid File', 'Please upload a .zip file.');
      return;
    }

    setRestoring(true);
    setRestoreResults(null);
    const formData = new FormData();
    formData.append('backup', file);
    try {
      const res = await api.post('/admin/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
      showAlert('success', 'Database Reset', 'All operational data has been cleared successfully.');
      setResetConfirm(false);
      setResetPhrase('');
    } catch (err) {
      showAlert('error', 'Reset Failed', err.response?.data?.error || 'Could not reset database');
    } finally {
      setResetting(false);
    }
  };

  const isPaystackEnabled = form.paystack_enabled === 'true';
  const isUnderConstruction = form.under_construction === 'true';

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-40">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Platform Settings</h1>
          <p className="text-[var(--text-muted)] mt-1 font-medium">Configure payments, delivery, and store information</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-8 items-start">

          {/* ── LEFT COLUMN ── */}
          <form onSubmit={handleSave} className="space-y-8">
            {/* Paystack Toggle */}
            <Section icon={<CreditCard size={20} className="text-green-500" />} title="Payment Gateway">
              <div
                onClick={() => setForm(prev => ({ ...prev, paystack_enabled: isPaystackEnabled ? 'false' : 'true' }))}
                className={`flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all ${isPaystackEnabled ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-green-500/20'}`}
              >
                <div>
                  <p className="font-black text-[var(--text-primary)]">Paystack Online Payments (MoMo)</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">
                    {isPaystackEnabled ? 'Customers can pay via Mobile Money through Paystack.' : 'Paystack is disabled — MoMo option will be hidden.'}
                  </p>
                </div>
                <div className={`text-3xl transition-colors ${isPaystackEnabled ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                  {isPaystackEnabled ? <ToggleRight size={44} strokeWidth={1.5} /> : <ToggleLeft size={44} strokeWidth={1.5} />}
                </div>
              </div>
            </Section>

            {/* Pickup Location */}
            <Section icon={<MapPin size={20} className="text-yellow-500" />} title="Pickup Location">
              <FieldInput
                label="Pickup / Showroom Address"
                value={form.pickup_address || form.store_address}
                onChange={v => setForm(p => ({ ...p, pickup_address: v, store_address: v }))}
                placeholder="e.g. 12 Liberation Road, Accra, Ghana"
              />
            </Section>

            {/* Bank Transfer */}
            <Section icon={<Banknote size={20} className="text-blue-500" />} title="Bank Transfer Details">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">These details are shown to customers who choose to pay by bank transfer.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Bank Name" value={form.bank_name} onChange={v => setForm(p => ({ ...p, bank_name: v }))} placeholder="e.g. GCB Bank" />
                <FieldInput label="Branch" value={form.bank_branch} onChange={v => setForm(p => ({ ...p, bank_branch: v }))} placeholder="e.g. Accra Main Branch" />
                <FieldInput label="Account Name" value={form.bank_account_name} onChange={v => setForm(p => ({ ...p, bank_account_name: v }))} placeholder="e.g. Expert Office Furnish Ltd." />
                <FieldInput label="Account Number" value={form.bank_account_number} onChange={v => setForm(p => ({ ...p, bank_account_number: v }))} placeholder="e.g. 1234567890" />
              </div>
            </Section>

            {/* MoMo */}
            <Section icon={<Smartphone size={20} className="text-green-500" />} title="Mobile Money Details">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">Shown to customers who pay via MoMo.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2 block mb-1.5">Network</label>
                  <select
                    value={form.momo_network}
                    onChange={e => setForm(p => ({ ...p, momo_network: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none transition-all"
                  >
                    <option value="MTN">MTN MoMo</option>
                    <option value="AirtelTigo">AirtelTigo Money</option>
                    <option value="Vodafone">Vodafone Cash</option>
                  </select>
                </div>
                <FieldInput label="MoMo Number" value={form.momo_number} onChange={v => setForm(p => ({ ...p, momo_number: v }))} placeholder="e.g. 0241234567" />
              </div>
            </Section>

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-3xl font-extrabold text-sm tracking-widest uppercase hover:scale-[1.01] hover:shadow-[0_25px_60px_-10px_rgba(34,197,94,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl"
            >
              {saving ? 'SAVING...' : <><Save size={17} /> SAVE SETTINGS</>}
            </button>

          </form>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">

            {/* Under Construction */}
            <Section icon={<Construction size={20} className="text-amber-500" />} title="Site Visibility">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">When enabled, visitors see an "Under Construction" page instead of the website. Admin access is unaffected.</p>
              <div
                onClick={() => {
                  const newVal = isUnderConstruction ? 'false' : 'true';
                  setForm(p => ({ ...p, under_construction: newVal }));
                  api.put('/admin/settings', { under_construction: newVal })
                    .then(() => showAlert('success', isUnderConstruction ? 'Site Live' : 'Under Construction', isUnderConstruction ? 'Your website is now visible to visitors.' : 'Visitors will see the under construction page.'))
                    .catch(() => showAlert('error', 'Failed', 'Could not update setting'));
                }}
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

            {/* Export Backup */}
            <Section icon={<Download size={20} className="text-blue-500" />} title="Export Backup">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-5">Download all database tables as individual Excel files in a single zip archive.</p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-500/10 hover:bg-blue-500/20 border-2 border-blue-500/30 hover:border-blue-500/50 text-blue-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {exporting ? (
                  <><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Exporting...</>
                ) : (
                  <><Download size={16} /> Download Backup</>
                )}
              </button>
              <p className="text-xs text-[var(--text-muted)] mt-3 text-center">Each table is saved as a separate .xlsx file</p>
            </Section>

            {/* Restore Backup */}
            <Section icon={<Upload size={20} className="text-green-500" />} title="Restore from Backup">
              <p className="text-sm text-[var(--text-muted)] -mt-2 mb-5">Upload a backup zip file. Each .xlsx file must be named after its table (e.g. <code className="text-xs bg-[var(--bg-tertiary)] px-1 py-0.5 rounded">orders.xlsx</code>).</p>

              <input
                ref={restoreInputRef}
                type="file"
                accept=".zip"
                onChange={handleRestoreFile}
                className="hidden"
              />
              <button
                onClick={() => restoreInputRef.current?.click()}
                disabled={restoring}
                className="w-full flex items-center justify-center gap-2 py-4 bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/30 hover:border-green-500/50 text-green-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {restoring ? (
                  <><div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Restoring...</>
                ) : (
                  <><Upload size={16} /> Upload Backup Zip</>
                )}
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

            {/* Danger Zone / Reset Database */}
            {can('resetDatabase') && (
              <div className="p-6 rounded-[2rem] border-2 border-red-500/30 bg-red-500/5">
                <h2 className="text-sm font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-3">
                  <AlertTriangle size={18} /> Danger Zone
                </h2>
                <p className="text-xs text-[var(--text-muted)] mb-5">
                  Permanently clear all operational data — orders, inquiries, quotes, logs, and notifications. Product catalog, users, and settings are preserved.
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
                    <div className="flex items-center gap-2">
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
        </div>

        {/* ── Delivery Regions — full width, two columns ── */}
        <Section icon={<Truck size={20} className="text-purple-500" />} title="Delivery Regions & Pricing">
          <p className="text-sm text-[var(--text-muted)] -mt-2 mb-4">Set delivery fees for each Ghana region. Toggle free delivery where applicable.</p>
          {regionsLoading ? (
            <div className="flex items-center gap-2 text-[var(--text-muted)] py-4">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Loading regions...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {regions.map(region => (
                <div key={region.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${editingRegion?.id === region.id ? 'border-green-500/40 bg-green-500/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
                  <div className="flex-1">
                    <span className="font-bold text-sm text-[var(--text-primary)]">{region.region_name}</span>
                    {region.is_free ? <span className="ml-2 text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Free</span> : null}
                  </div>
                  {editingRegion?.id === region.id ? (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingRegion.is_free}
                          onChange={e => setEditingRegion(r => ({ ...r, is_free: e.target.checked, delivery_fee: e.target.checked ? 0 : r.delivery_fee }))}
                          className="accent-green-500"
                        />
                        Free
                      </label>
                      {!editingRegion.is_free && (
                        <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-1.5">
                          <span className="text-xs text-[var(--text-muted)] font-bold">₵</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={editingRegion.delivery_fee}
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
                        {region.is_free ? 'Free delivery' : region.delivery_fee > 0 ? `₵${parseFloat(region.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}` : <span className="text-amber-500 text-xs">Not set</span>}
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
      </div>
    </AdminLayout>
  );
};

const Section = ({ icon, title, children }) => (
  <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-xl">
    <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-6 flex items-center gap-3">
      {icon} {title}
    </h2>
    {children}
  </div>
);

const FieldInput = ({ label, value, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2 block">{label}</label>
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none transition-all placeholder:font-normal placeholder:text-[var(--text-muted)]"
    />
  </div>
);

export default AdminSettings;

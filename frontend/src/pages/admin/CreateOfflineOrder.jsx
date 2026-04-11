import React, { useState } from 'react';
import { ArrowLeft, Save, Store, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';

const CreateOfflineOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        payment_method: 'cash',
        delivery_mode: 'pickup',
        delivery_fee: 0,
        status: 'collected',
        payment_status: 'paid',
        items: []
    });

    const searchProducts = async (q) => {
        setSearchTerm(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await api.get(`/products?q=${encodeURIComponent(q)}&limit=5`);
            setSearchResults(res.data.products || []);
        } catch {
            setSearchResults([]);
        }
    };

    const addItem = (product) => {
        const existing = formData.items.find(i => i.product_id === product.id && i.variant === product.selectedVariant);
        if (existing) {
            const up = formData.items.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
            setFormData({ ...formData, items: up });
        } else {
            setFormData({
                ...formData,
                items: [...formData.items, {
                    product_id: product.id,
                    product_name: product.name,
                    unit_price: product.price,
                    quantity: 1,
                    variant: product.selectedVariant || null
                }]
            });
        }
        setSearchTerm('');
        setSearchResults([]);
    };

    const updateQty = (idx, qty) => {
        const up = [...formData.items];
        up[idx].quantity = Math.max(1, parseInt(qty) || 1);
        setFormData({ ...formData, items: up });
    };

    const removeItem = (idx) => {
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });
    };

    const submitOrder = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) return toast.error('Add at least one item');
        if (!formData.customer_email) return toast.error('Customer email is required');

        setLoading(true);
        try {
            await api.post('/admin/orders', formData);
            toast.success('Offline order recorded.');
            navigate('/admin/orders');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to record order');
        } finally {
            setLoading(false);
        }
    };

    const subtotal = formData.items.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
    const total = subtotal + parseFloat(formData.delivery_fee || 0);

    return (
        <AdminLayout>
            <div className="flex flex-col animate-fadeIn mb-8 space-y-6 max-w-5xl">
                <div className="flex items-center gap-4 shrink-0">
                    <button onClick={() => navigate('/admin/orders')} className="w-10 h-10 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors">
                        <ArrowLeft size={18} className="text-[var(--text-primary)]" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Record Offline Order</h1>
                        <p className="text-[var(--text-muted)] mt-1">Manually log a walk-in or direct customer purchase</p>
                    </div>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-8">
                        <form id="offline-form" onSubmit={submitOrder} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Customer Name</label>
                                    <input required type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm focus:border-green-500 text-[var(--text-primary)]" placeholder="Walk-in Customer" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Email Address</label>
                                    <input required type="email" value={formData.customer_email} onChange={e => setFormData({...formData, customer_email: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm focus:border-green-500 text-[var(--text-primary)]" placeholder="customer@example.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Phone (Optional)</label>
                                    <input type="text" value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm focus:border-green-500 text-[var(--text-primary)]" placeholder="0500000000" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-y py-8 border-[var(--border-color)]">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Delivery Mode</label>
                                    <select value={formData.delivery_mode} onChange={e => setFormData({...formData, delivery_mode: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm outline-none cursor-pointer text-[var(--text-primary)]">
                                        <option value="pickup">Store Pickup</option>
                                        <option value="delivery">Delivery</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Payment</label>
                                    <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm outline-none cursor-pointer text-[var(--text-primary)]">
                                        <option value="cash">Cash/POS</option>
                                        <option value="momo">MoMo</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                {formData.delivery_mode === 'delivery' && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Delivery Fee (GHS)</label>
                                        <input type="number" min="0" value={formData.delivery_fee} onChange={e => setFormData({...formData, delivery_fee: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm focus:border-green-500 text-[var(--text-primary)]" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="mb-6 relative">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Search Product to Add</label>
                                    <input type="text" value={searchTerm} onChange={e => searchProducts(e.target.value)} placeholder="Type product name or SKU..." className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3.5 px-4 text-sm focus:border-blue-500 text-[var(--text-primary)]" />
                                    {searchResults.length > 0 && (
                                        <ul className="absolute z-50 mt-2 w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                            {searchResults.map(p => (
                                                <li key={p.id}>
                                                    <button type="button" onClick={() => addItem(p)} className="w-full text-left px-5 py-3 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm flex justify-between border-b last:border-0 border-[var(--border-color)] transition-colors">
                                                        <span>{p.name} {p.stock <= 0 && <span className="text-red-500 ml-2 text-xs font-bold">(Out of stock!)</span>}</span>
                                                        <span className="font-bold">₵{parseFloat(p.price).toLocaleString()}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--border-color)]">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-left text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                <th className="py-4 px-5">Product</th>
                                                <th className="py-4 px-5 w-32">Unit Price</th>
                                                <th className="py-4 px-5 w-24">Qty</th>
                                                <th className="py-4 px-5 text-right w-32">Subtotal</th>
                                                <th className="py-4 px-5 w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.items.map((item, i) => (
                                                <tr key={i} className="border-b border-[var(--border-color)] last:border-0 bg-[var(--bg-primary)]">
                                                    <td className="py-4 px-5 font-semibold text-[var(--text-primary)]">{item.product_name}</td>
                                                    <td className="py-4 px-5 text-[var(--text-muted)]">₵{parseFloat(item.unit_price).toLocaleString()}</td>
                                                    <td className="py-4 px-5">
                                                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(i, e.target.value)} className="w-16 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2 text-center text-[var(--text-primary)]" />
                                                    </td>
                                                    <td className="py-4 px-5 text-right font-bold text-[var(--text-primary)]">₵{(item.unit_price * item.quantity).toLocaleString()}</td>
                                                    <td className="py-4 px-5 text-right">
                                                        <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {formData.items.length === 0 && (
                                                <tr><td colSpan="5" className="py-12 text-center text-[var(--text-muted)] bg-[var(--bg-primary)]">No items added yet. Search above to begin.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {formData.items.length > 0 && (
                                    <div className="mt-6 flex flex-col items-end gap-2 bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)]">
                                        <p className="text-sm font-bold text-[var(--text-muted)] flex justify-between w-64"><span>Subtotal:</span> <span>₵{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                                        {formData.delivery_mode === 'delivery' && (
                                            <p className="text-sm font-bold text-[var(--text-muted)] flex justify-between w-64 border-b border-[var(--border-color)] pb-3 mb-1">
                                                <span>Delivery:</span> <span>₵{parseFloat(formData.delivery_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </p>
                                        )}
                                        <p className="text-2xl font-black mt-2 text-green-500 flex justify-between w-64"><span>Total:</span> <span>₵{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="p-6 border-t border-[var(--border-color)] flex gap-4 bg-[var(--bg-secondary)]/50 justify-end">
                        <button type="button" onClick={() => navigate('/admin/orders')} className="px-6 py-3 rounded-xl font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors">Save as Draft</button>
                        <button form="offline-form" type="submit" disabled={loading} className="px-8 py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2 shadow-lg shadow-green-500/30">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Finalize Order
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default CreateOfflineOrder;

import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Store, Truck, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api';

const CreateOfflineOrderModal = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    
    const [formData, setFormData] = useState({
        customer_name: '',
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
        
        setLoading(true);
        try {
            await api.post('/admin/orders', formData);
            toast.success('Offline order recorded.');
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to record order');
        } finally {
            setLoading(false);
        }
    };

    const subtotal = formData.items.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
    const total = subtotal + parseFloat(formData.delivery_fee || 0);

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-primary)] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Store className="text-green-500" /> Record Offline Order
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="offline-form" onSubmit={submitOrder} className="space-y-6">
                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Customer Name</label>
                                <input required type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-[var(--bg-secondary)] border rounded-xl py-2.5 px-4 text-sm focus:border-green-500" placeholder="Walk-in Customer" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Phone (Optional)</label>
                                <input type="text" value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} className="w-full bg-[var(--bg-secondary)] border rounded-xl py-2.5 px-4 text-sm focus:border-green-500" />
                            </div>
                        </div>

                        {/* Order Type & Payment */}
                        <div className="grid grid-cols-3 gap-4 border-y py-6 border-[var(--border-color)]">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Delivery Mode</label>
                                <select value={formData.delivery_mode} onChange={e => setFormData({...formData, delivery_mode: e.target.value})} className="w-full bg-[var(--bg-secondary)] border rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer">
                                    <option value="pickup">Store Pickup</option>
                                    <option value="delivery">Delivery</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Payment</label>
                                <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full bg-[var(--bg-secondary)] border rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer">
                                    <option value="cash">Cash/POS</option>
                                    <option value="momo">MoMo Check</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                            </div>
                            {formData.delivery_mode === 'delivery' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Delivery Fee (GHS)</label>
                                    <input type="number" min="0" value={formData.delivery_fee} onChange={e => setFormData({...formData, delivery_fee: e.target.value})} className="w-full bg-[var(--bg-secondary)] border rounded-xl py-2.5 px-4 text-sm focus:border-green-500" />
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        <div>
                            <div className="mb-4 relative">
                                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Search Product to Add</label>
                                <input type="text" value={searchTerm} onChange={e => searchProducts(e.target.value)} placeholder="Type product name or SKU..." className="w-full bg-[var(--bg-secondary)] border rounded-xl py-3 px-4 text-sm focus:border-blue-500" />
                                {searchResults.length > 0 && (
                                    <ul className="absolute z-50 mt-1 w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <li key={p.id}>
                                                <button type="button" onClick={() => addItem(p)} className="w-full text-left px-4 py-2 hover:bg-green-500/10 hover:text-green-500 text-sm flex justify-between">
                                                    <span>{p.name} {p.stock <= 0 && <span className="text-red-500 ml-2">(Out of stock!)</span>}</span>
                                                    <span className="font-bold">GHS {parseFloat(p.price).toLocaleString()}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)] text-left text-xs uppercase text-[var(--text-muted)]">
                                        <th className="pb-2">Product</th>
                                        <th className="pb-2 w-24">Unit Price</th>
                                        <th className="pb-2 w-20">Qty</th>
                                        <th className="pb-2 text-right w-24">Sub</th>
                                        <th className="pb-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, i) => (
                                        <tr key={i} className="border-b border-[var(--border-color)]">
                                            <td className="py-3 font-semibold">{item.product_name}</td>
                                            <td className="py-3 text-[var(--text-muted)]">GHS {parseFloat(item.unit_price).toLocaleString()}</td>
                                            <td className="py-3"><input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(i, e.target.value)} className="w-16 bg-[var(--bg-secondary)] border rounded p-1 text-center" /></td>
                                            <td className="py-3 text-right font-bold">GHS {(item.unit_price * item.quantity).toLocaleString()}</td>
                                            <td className="py-3 text-right">
                                                <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {formData.items.length === 0 && (
                                        <tr><td colSpan="5" className="py-6 text-center text-[var(--text-muted)] opacity-60">No items added yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            {formData.items.length > 0 && (
                                <div className="mt-4 text-right">
                                    <p className="text-sm font-semibold text-[var(--text-muted)]">Subtotal: GHS {subtotal.toLocaleString()}</p>
                                    {formData.delivery_mode === 'delivery' && <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Delivery: GHS {parseFloat(formData.delivery_fee || 0).toLocaleString()}</p>}
                                    <p className="text-xl font-black mt-2 text-green-500">Total: GHS {total.toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 bg-[var(--bg-secondary)]/50">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-red-500 transition-colors border">Cancel</button>
                    <button form="offline-form" type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2 shadow-lg shadow-green-500/30">
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        <Save size={16} /> Save Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateOfflineOrderModal;

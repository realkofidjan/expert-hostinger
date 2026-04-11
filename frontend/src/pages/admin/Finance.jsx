import React, { useState, useEffect } from 'react';
import { useAlert } from '../../context/AlertContext';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import { BarChart3, TrendingUp, DollarSign, Wallet, ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';

const Finance = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchFinance = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/finance');
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch finance stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinance();
    }, []);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-[60vh]">
                    <Loader2 className="animate-spin text-green-500 w-10 h-10" />
                </div>
            </AdminLayout>
        );
    }

    if (!stats) return null;

    const cards = [
        {
            title: 'Total Revenue',
            value: `GHS ${stats.totalRevenue.toLocaleString()}`,
            icon: <TrendingUp className="text-emerald-500" size={24} />,
            bg: 'from-emerald-500/10 to-emerald-500/5',
            border: 'border-emerald-500/20'
        },
        {
            title: 'Revenue This Month',
            value: `GHS ${stats.thisMonthRevenue.toLocaleString()}`,
            icon: <BarChart3 className="text-blue-500" size={24} />,
            bg: 'from-blue-500/10 to-blue-500/5',
            border: 'border-blue-500/20'
        },
        {
            title: 'Unpaid / Pending Receivables',
            value: `GHS ${stats.unpaidRevenue.toLocaleString()}`,
            icon: <ArrowDownRight className="text-orange-500" size={24} />,
            bg: 'from-orange-500/10 to-orange-500/5',
            border: 'border-orange-500/20'
        },
        {
            title: 'Avg Order Value',
            value: `GHS ${stats.averageOrderValue.toLocaleString()}`,
            icon: <Wallet className="text-purple-500" size={24} />,
            bg: 'from-purple-500/10 to-purple-500/5',
            border: 'border-purple-500/20'
        }
    ];

    return (
        <AdminLayout>
            <div className="space-y-8 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-muted)] bg-clip-text text-transparent">
                            Financial Analytics
                        </h1>
                        <p className="text-[var(--text-muted)] mt-1">Track your revenue and financial performance.</p>
                    </div>
                    <button
                        onClick={fetchFinance}
                        className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-all flex items-center gap-2 text-sm text-[var(--text-primary)]"
                    >
                        <TrendingUp size={16} className="text-green-500" />
                        Refresh Data
                    </button>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map((card, i) => (
                        <div key={i} className={`p-6 rounded-3xl bg-gradient-to-br ${card.bg} border ${card.border} relative overflow-hidden group`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                        {card.title}
                                    </p>
                                    <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                                        {card.value}
                                    </h3>
                                </div>
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                    {card.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Payment Methods Breakdown */}
                    <div className="glass p-6 or 8 rounded-3xl border border-[var(--border-color)]">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <DollarSign size={20} className="text-green-500" />
                            Revenue by Payment Method
                        </h3>
                        <div className="space-y-5">
                            {stats.paymentMethods.map((pm, i) => {
                                const percentage = stats.totalRevenue > 0 ? (pm.total / stats.totalRevenue) * 100 : 0;
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-bold uppercase text-[var(--text-muted)]">{pm.method.replace('_', ' ')}</span>
                                            <span className="font-black text-[var(--text-primary)]">GHS {parseFloat(pm.total).toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Offline vs Online Sales */}
                    <div className="glass p-6 or 8 rounded-3xl border border-[var(--border-color)]">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <Wallet size={20} className="text-blue-500" />
                            Order Channels
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl flex justify-between items-center">
                                <div>
                                    <p className="text-xs uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">Total Orders</p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">{stats.orderCounts.total}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-green-500 mb-1">Online</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{stats.orderCounts.online}</p>
                                </div>
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-yellow-500 mb-1">Offline / Manual</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{stats.orderCounts.offline}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Finance;

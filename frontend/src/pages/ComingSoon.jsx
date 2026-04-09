import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const ComingSoon = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>

      {/* Ambient blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-green-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] bg-yellow-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 blur-[200px] rounded-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-green-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-green-500/30">
            <img
              src="/assets/Company logo.png"
              alt="Expert Office"
              className="w-14 h-14 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #eab308, #22c55e)',
              backgroundSize: '200%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradientShift 4s ease infinite'
            }}>
          EXPERT OFFICE
        </h1>

        {/* Tagline */}
        <p className="text-slate-400 text-lg md:text-xl font-medium mb-2 tracking-wide">
          Premium Office Furniture & Supplies
        </p>

        {/* Divider */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto my-8" />

        {/* Coming Soon message */}
        <div className="mb-10">
          <p className="text-slate-300 text-2xl md:text-3xl font-bold tracking-tight">
            Website Coming Soon{dots}
          </p>
          <p className="text-slate-500 text-sm mt-3 font-medium uppercase tracking-widest">
            We're crafting something exceptional
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {['Office Chairs', 'Executive Desks', 'Filing Solutions', 'Workstations', 'Accessories'].map((item) => (
            <span
              key={item}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border text-slate-400"
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(8px)'
              }}>
              {item}
            </span>
          ))}
        </div>

        {/* Admin Link */}
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/admin/login"
            className="group flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)';
              e.currentTarget.style.color = '#22c55e';
              e.currentTarget.style.background = 'rgba(34,197,94,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Admin Portal
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-slate-600 text-xs font-medium tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Expert Office Furnish Ltd.
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;

import React from 'react';
import { Construction } from 'lucide-react';

const UnderConstruction = () => {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-center px-6">
      <img src="/images/Logo.png" alt="Expert Office Furnish" className="h-16 mb-10 opacity-90" />

      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-8">
        <Construction size={36} className="text-amber-400" />
      </div>

      <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
        Under Construction
      </h1>
      <p className="text-slate-400 text-lg max-w-md font-medium mb-10">
        We're working on something great. Check back soon.
      </p>

      <a
        href="https://wa.me/233507103200"
        className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 shadow-xl shadow-green-500/20"
      >
        Contact Us on WhatsApp
      </a>
    </div>
  );
};

export default UnderConstruction;

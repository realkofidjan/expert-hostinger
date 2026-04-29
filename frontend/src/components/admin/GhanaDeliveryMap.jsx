import React, { useState } from 'react';
import { Check, X, MapPin } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   SVG path data for Ghana's 16 administrative regions.
   ViewBox: 0 0 300 420  (w × h)
   Coordinates are approximate but proportionally representative.
──────────────────────────────────────────────────────────────────────────────*/
const REGION_PATHS = [
  {
    key: 'upper_west',   name: 'Upper West',
    d: 'M0,0 L125,0 L120,58 L98,80 L0,75 Z',
    lx: 52, ly: 40,
  },
  {
    key: 'upper_east',   name: 'Upper East',
    d: 'M178,0 L300,0 L300,50 L255,62 L220,65 L178,48 Z',
    lx: 242, ly: 28,
  },
  {
    key: 'north_east',   name: 'North East',
    d: 'M215,93 L255,62 L300,50 L300,148 L258,152 L218,130 Z',
    lx: 262, ly: 100,
  },
  {
    key: 'northern',     name: 'Northern',
    d: 'M98,80 L178,48 L215,93 L218,130 L258,152 L192,168 L108,165 Z',
    lx: 172, ly: 118,
  },
  {
    key: 'savannah',     name: 'Savannah',
    d: 'M0,75 L98,80 L108,165 L0,170 Z',
    lx: 46, ly: 122,
  },
  {
    key: 'oti',          name: 'Oti',
    d: 'M218,130 L258,152 L278,238 L252,245 L208,218 L203,158 Z',
    lx: 238, ly: 192,
  },
  {
    key: 'bono',         name: 'Bono',
    d: 'M0,170 L108,165 L118,252 L0,255 Z',
    lx: 48, ly: 210,
  },
  {
    key: 'bono_east',    name: 'Bono East',
    d: 'M108,165 L192,168 L203,158 L208,218 L172,248 L118,252 Z',
    lx: 155, ly: 202,
  },
  {
    key: 'ahafo',        name: 'Ahafo',
    d: 'M38,252 L118,252 L112,292 L35,294 Z',
    lx: 74, ly: 270,
  },
  {
    key: 'western_north', name: 'Western North',
    d: 'M0,255 L38,252 L35,294 L102,308 L0,342 Z',
    lx: 30, ly: 296,
  },
  {
    key: 'ashanti',      name: 'Ashanti',
    d: 'M35,294 L112,292 L172,248 L200,255 L195,336 L88,340 L35,326 Z',
    lx: 118, ly: 300,
  },
  {
    key: 'eastern',      name: 'Eastern',
    d: 'M172,248 L208,218 L252,245 L255,338 L190,342 L183,298 Z',
    lx: 216, ly: 290,
  },
  {
    key: 'volta',        name: 'Volta',
    d: 'M252,245 L278,238 L300,148 L300,385 L255,385 L252,338 Z',
    lx: 278, ly: 295,
  },
  {
    key: 'western',      name: 'Western',
    d: 'M0,342 L88,340 L83,420 L0,420 Z',
    lx: 40, ly: 380,
  },
  {
    key: 'central',      name: 'Central',
    d: 'M88,340 L190,342 L192,388 L83,420 Z',
    lx: 132, ly: 378,
  },
  {
    key: 'greater_accra', name: 'Greater Accra',
    d: 'M190,342 L252,338 L255,385 L192,388 Z',
    lx: 220, ly: 360,
  },
];

/* Match SVG region key → DB region object by name (case-insensitive, fuzzy) */
const matchRegion = (regions, svgName) => {
  const n = svgName.toLowerCase().replace(/\s+/g, ' ').trim();
  return regions.find(r => {
    const rn = (r.region_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return rn === n || rn.includes(n) || n.includes(rn);
  });
};

const fmt = (fee) =>
  fee > 0
    ? `₵${parseFloat(fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
    : null;

/* ─── Colour helpers ────────────────────────────────────────────────────────*/
const regionFill = (region, isHovered, isEditing) => {
  if (!region) return isHovered ? '#374151' : '#1f2937';         // unknown – dark grey
  if (isEditing) return '#166534';                               // editing – deep green
  if (region.is_free) return isHovered ? '#16a34a' : '#15803d'; // free – green
  if (region.delivery_fee > 0) return isHovered ? '#1d4ed8' : '#1e40af'; // priced – blue
  return isHovered ? '#b45309' : '#92400e';                      // not set – amber
};

const regionStroke = (isEditing, isHovered) => {
  if (isEditing) return '#4ade80';
  if (isHovered) return '#d1fae5';
  return '#374151';
};

/* ─── Main component ────────────────────────────────────────────────────────*/
const GhanaDeliveryMap = ({ regions, onSave }) => {
  const [hovered, setHovered]     = useState(null);   // svg key
  const [editing, setEditing]     = useState(null);   // { svgKey, region, fee, is_free }
  const [tooltip, setTooltip]     = useState(null);   // { x, y, svgKey }
  const [saving, setSaving]       = useState(false);

  const handleRegionClick = (svgRegion) => {
    const dbRegion = matchRegion(regions, svgRegion.name);
    if (!dbRegion) return;
    setEditing({
      svgKey:  svgRegion.key,
      region:  dbRegion,
      fee:     dbRegion.delivery_fee ?? 0,
      is_free: !!dbRegion.is_free,
    });
  };

  const handleMouseMove = (e, svgKey) => {
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 12, svgKey });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await onSave({
        id:           editing.region.id,
        region_name:  editing.region.region_name,
        delivery_fee: editing.is_free ? 0 : parseFloat(editing.fee) || 0,
        is_free:      editing.is_free,
        is_active:    editing.region.is_active !== false,
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">

      {/* ── SVG Map ──────────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 w-full xl:w-auto">
        <svg
          viewBox="0 0 300 420"
          className="w-full max-w-[340px] mx-auto xl:mx-0 drop-shadow-xl select-none"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.4))' }}
        >
          {REGION_PATHS.map((rp) => {
            const dbR       = matchRegion(regions, rp.name);
            const isHovered = hovered === rp.key;
            const isEditing = editing?.svgKey === rp.key;
            const fill      = regionFill(dbR, isHovered, isEditing);
            const stroke    = regionStroke(isEditing, isHovered);

            return (
              <g key={rp.key}>
                <path
                  d={rp.d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isEditing ? 2 : 1}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHovered(rp.key)}
                  onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                  onMouseMove={(e) => handleMouseMove(e, rp.key)}
                  onClick={() => handleRegionClick(rp)}
                />
                {/* Region label */}
                <text
                  x={rp.lx}
                  y={rp.ly}
                  textAnchor="middle"
                  fontSize={rp.name.length > 10 ? '6.5' : '7.5'}
                  fontWeight="700"
                  fill="rgba(255,255,255,0.85)"
                  className="pointer-events-none"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {rp.name.split(' ').map((word, i) => (
                    <tspan key={i} x={rp.lx} dy={i === 0 ? 0 : 8}>{word}</tspan>
                  ))}
                </text>
                {/* Price badge */}
                {dbR && (
                  <text
                    x={rp.lx}
                    y={rp.ly + (rp.name.split(' ').length > 1 ? 16 : 10)}
                    textAnchor="middle"
                    fontSize="6"
                    fill="rgba(255,255,255,0.7)"
                    className="pointer-events-none"
                    style={{ fontFamily: 'system-ui, sans-serif' }}
                  >
                    {dbR.is_free ? 'FREE' : dbR.delivery_fee > 0 ? fmt(dbR.delivery_fee) : '—'}
                  </text>
                )}
              </g>
            );
          })}

          {/* SVG tooltip */}
          {tooltip && hovered && (() => {
            const rp  = REGION_PATHS.find(r => r.key === hovered);
            const dbR = rp ? matchRegion(regions, rp.name) : null;
            if (!rp) return null;
            const label = dbR
              ? (dbR.is_free ? 'Free delivery' : dbR.delivery_fee > 0 ? fmt(dbR.delivery_fee) : 'Not set')
              : 'Unknown region';
            return (
              <g transform={`translate(${Math.min(tooltip.x, 240)},${Math.max(tooltip.y - 8, 0)})`}>
                <rect x="-4" y="-14" width={rp.name.length * 5.5 + 16} height="22" rx="4" fill="rgba(0,0,0,0.85)" />
                <text x="4" y="-3" fontSize="8" fill="white" fontWeight="700"
                  style={{ fontFamily: 'system-ui, sans-serif' }}>{rp.name} — {label}</text>
              </g>
            );
          })()}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center xl:justify-start">
          {[
            { color: '#15803d', label: 'Free delivery' },
            { color: '#1e40af', label: 'Fixed fee set' },
            { color: '#92400e', label: 'Not configured' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 text-center xl:text-left">Click a region to set its delivery fee</p>
      </div>

      {/* ── Editor Panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 w-full">
        {editing ? (
          <div className="glass p-6 rounded-[2rem] border border-green-500/30 shadow-xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-green-500" />
                <h3 className="font-black text-[var(--text-primary)]">{editing.region.region_name}</h3>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Free toggle */}
            <div
              onClick={() => setEditing(e => ({ ...e, is_free: !e.is_free, fee: !e.is_free ? 0 : e.fee }))}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${editing.is_free ? 'border-green-500/40 bg-green-500/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}
            >
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Free Delivery</p>
                <p className="text-xs text-[var(--text-muted)]">No charge for this region</p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center transition-all ${editing.is_free ? 'bg-green-500 justify-end' : 'bg-[var(--bg-tertiary)] justify-start'}`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
              </div>
            </div>

            {/* Fee input */}
            {!editing.is_free && (
              <div>
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Delivery Fee (₵)</label>
                <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border-2 border-transparent focus-within:border-green-500/50 rounded-2xl px-4 py-3 transition-all">
                  <span className="text-[var(--text-muted)] font-bold text-lg">₵</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing.fee}
                    onChange={e => setEditing(ed => ({ ...ed, fee: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-[var(--text-primary)] font-bold text-lg"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Check size={16} /> Save Region</>}
              </button>
              <button onClick={() => setEditing(null)} className="px-5 py-3 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded-2xl font-bold text-sm transition-all hover:bg-[var(--bg-tertiary)]">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Region list (scrollable summary) */
          <div className="glass rounded-[2rem] border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-widest">All Regions</h3>
            </div>
            <div className="divide-y divide-[var(--border-color)] max-h-[420px] overflow-y-auto">
              {regions.map(region => (
                <button
                  key={region.id}
                  onClick={() => {
                    const rp = REGION_PATHS.find(r =>
                      r.name.toLowerCase() === (region.region_name || '').toLowerCase() ||
                      (region.region_name || '').toLowerCase().includes(r.name.toLowerCase()) ||
                      r.name.toLowerCase().includes((region.region_name || '').toLowerCase())
                    );
                    if (rp) handleRegionClick(rp);
                  }}
                  className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors text-left group"
                >
                  <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-green-500 transition-colors">
                    {region.region_name}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${region.is_free ? 'bg-green-500/15 text-green-500' : region.delivery_fee > 0 ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-500'}`}>
                    {region.is_free ? 'Free' : region.delivery_fee > 0 ? fmt(region.delivery_fee) : 'Not set'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GhanaDeliveryMap;

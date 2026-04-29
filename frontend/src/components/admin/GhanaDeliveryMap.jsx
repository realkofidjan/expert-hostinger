import React, { useState, useEffect, useRef } from 'react';
import { Check, X, MapPin, Loader2 } from 'lucide-react';

/* ─── ISO code → DB region name mapping ────────────────────────────────────*/
const SVG_ID_TO_NAME = {
  GHAF: 'Ahafo',
  GHAH: 'Ashanti',
  GHBO: 'Bono',
  GHBE: 'Bono East',
  GHCP: 'Central',
  GHEP: 'Eastern',
  GHAA: 'Greater Accra',
  GHNP: 'North East',
  GHNE: 'Northern',
  GHOT: 'Oti',
  GHSV: 'Savannah',
  GHUE: 'Upper East',
  GHUW: 'Upper West',
  GHTV: 'Volta',
  GHWP: 'Western',
  GHWN: 'Western North',
};

/* Match an SVG name → DB region row (fuzzy) */
const matchRegion = (regions, svgName) => {
  if (!svgName) return null;
  const n = svgName.toLowerCase().replace(/\s+/g, ' ').trim();
  return regions.find(r => {
    const rn = (r.region_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    // Exact or contained match; also handle "Brong-Ahafo" ↔ "Bono"
    return rn === n || rn.includes(n) || n.includes(rn) ||
      (n === 'bono' && rn === 'brong-ahafo');
  });
};

const fmt = (fee) =>
  fee > 0
    ? `₵${parseFloat(fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
    : null;

/* ─── Colour helpers ────────────────────────────────────────────────────────*/
const regionFill = (region, isHovered, isEditing) => {
  if (!region) return isHovered ? '#374151' : '#1f2937';
  if (isEditing) return '#166534';
  if (region.is_free) return isHovered ? '#16a34a' : '#15803d';
  if (region.delivery_fee > 0) return isHovered ? '#1d4ed8' : '#1e40af';
  return isHovered ? '#b45309' : '#92400e';
};

const regionStroke = (isEditing, isHovered) => {
  if (isEditing) return '#4ade80';
  if (isHovered) return '#d1fae5';
  return '#ffffff';
};

/* ─── Main component ────────────────────────────────────────────────────────*/
const GhanaDeliveryMap = ({ regions, onSave }) => {
  const [paths, setPaths]       = useState([]);      // [{ id, d }]
  const [viewBox, setViewBox]   = useState('0 0 1000 1000');
  const [loading, setLoading]   = useState(true);
  const [hovered, setHovered]   = useState(null);
  const [editing, setEditing]   = useState(null);
  const [tooltip, setTooltip]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const svgRef                  = useRef(null);

  /* Load & parse the real Ghana SVG once */
  useEffect(() => {
    fetch('/images/gh.svg')
      .then(r => r.text())
      .then(text => {
        const parser = new DOMParser();
        const doc    = parser.parseFromString(text, 'image/svg+xml');
        const svgEl  = doc.querySelector('svg');
        if (svgEl) setViewBox(svgEl.getAttribute('viewbox') || svgEl.getAttribute('viewBox') || '0 0 1000 1000');
        const featureGroup = doc.getElementById('features');
        const pathEls = featureGroup
          ? Array.from(featureGroup.querySelectorAll('path'))
          : Array.from(doc.querySelectorAll('path[id^="GH"]'));
        const extracted = pathEls
          .filter(p => SVG_ID_TO_NAME[p.id])
          .map(p => ({ id: p.id, d: p.getAttribute('d') }));
        setPaths(extracted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRegionClick = (svgId) => {
    const name    = SVG_ID_TO_NAME[svgId];
    const dbRegion = matchRegion(regions, name);
    if (!dbRegion) return;
    setEditing({
      svgId,
      region:  dbRegion,
      fee:     dbRegion.delivery_fee ?? 0,
      is_free: !!dbRegion.is_free,
    });
  };

  const handleMouseMove = (e, svgId) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 12, svgId });
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
        {loading ? (
          <div className="flex items-center justify-center w-full max-w-[340px] mx-auto xl:mx-0 h-[420px]">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full max-w-[360px] mx-auto xl:mx-0 select-none"
            style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.4))' }}
          >
            {paths.map(({ id, d }) => {
              const name      = SVG_ID_TO_NAME[id];
              const dbR       = matchRegion(regions, name);
              const isHovered = hovered === id;
              const isEditing = editing?.svgId === id;
              const fill      = regionFill(dbR, isHovered, isEditing);
              const stroke    = regionStroke(isEditing, isHovered);

              return (
                <path
                  key={id}
                  d={d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isEditing ? 3 : 1}
                  className="cursor-pointer transition-colors duration-150"
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                  onMouseMove={(e) => handleMouseMove(e, id)}
                  onClick={() => handleRegionClick(id)}
                />
              );
            })}

            {/* SVG tooltip */}
            {tooltip && hovered && (() => {
              const name = SVG_ID_TO_NAME[hovered];
              const dbR  = matchRegion(regions, name);
              const label = dbR
                ? (dbR.is_free ? 'Free delivery' : dbR.delivery_fee > 0 ? fmt(dbR.delivery_fee) : 'Not set')
                : 'Unknown';
              const svgW = parseFloat(viewBox.split(' ')[2]) || 1000;
              const scaleX = svgRef.current ? svgW / svgRef.current.getBoundingClientRect().width : 1;
              const tx = Math.min(tooltip.x * scaleX, svgW - 160);
              const ty = Math.max(tooltip.y * scaleX - 20, 10);
              const text = `${name} — ${label}`;
              return (
                <g transform={`translate(${tx},${ty})`}>
                  <rect x="-4" y="-14" width={text.length * 6 + 16} height="22" rx="4" fill="rgba(0,0,0,0.85)" />
                  <text x="4" y="-3" fontSize="12" fill="white" fontWeight="700"
                    style={{ fontFamily: 'system-ui, sans-serif' }}>{text}</text>
                </g>
              );
            })()}
          </svg>
        )}

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
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  : <><Check size={16} /> Save Region</>}
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
                    const svgId = Object.entries(SVG_ID_TO_NAME).find(
                      ([, name]) => matchRegion([region], name)
                    )?.[0];
                    if (svgId) handleRegionClick(svgId);
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

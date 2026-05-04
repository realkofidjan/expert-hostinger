import React, { useState, useEffect, useRef } from 'react';
import { Check, X, MapPin, Loader2 } from 'lucide-react';

/* ─── ISO code → display name ───────────────────────────────────────────────*/
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

/* ─── Unique colour per region ──────────────────────────────────────────────
   Full-saturation hex (used for stroke + active states).
   Fill is rendered at 30% opacity via fillOpacity.
──────────────────────────────────────────────────────────────────────────────*/
const REGION_COLOR = {
  GHAF: '#f97316', // orange
  GHAH: '#8b5cf6', // violet
  GHBO: '#06b6d4', // cyan
  GHBE: '#ec4899', // pink
  GHCP: '#22c55e', // green
  GHEP: '#f59e0b', // amber
  GHAA: '#3b82f6', // blue
  GHNP: '#84cc16', // lime
  GHNE: '#14b8a6', // teal
  GHOT: '#a855f7', // purple
  GHSV: '#ef4444', // red
  GHUE: '#10b981', // emerald
  GHUW: '#0ea5e9', // sky
  GHTV: '#d946ef', // fuchsia
  GHWP: '#fb923c', // orange-400
  GHWN: '#34d399', // emerald-400
};

/* DB region names that don't exactly match the SVG display names */
const DB_NAME_OVERRIDES = {
  'brong-ahafo': 'Bono',
};

/* Match an SVG display name → DB region row (exact only, with known overrides) */
const matchRegion = (regions, svgName) => {
  if (!svgName) return null;
  const n = svgName.toLowerCase().replace(/\s+/g, ' ').trim();
  // 1. Exact match
  const exact = regions.find(r =>
    (r.region_name || '').toLowerCase().replace(/\s+/g, ' ').trim() === n
  );
  if (exact) return exact;
  // 2. Known DB→SVG name overrides (e.g. "Brong-Ahafo" in DB = "Bono" on SVG)
  return regions.find(r => {
    const rn = (r.region_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return DB_NAME_OVERRIDES[rn]?.toLowerCase() === n;
  });
};

const fmt = (fee) =>
  fee > 0 ? `₵${parseFloat(fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}` : null;

/* ─── Main component ────────────────────────────────────────────────────────*/
const GhanaDeliveryMap = ({ regions, onSave }) => {
  const [paths, setPaths]     = useState([]);
  const [viewBox, setViewBox] = useState('0 0 1000 1000');
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [editing, setEditing] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [saving, setSaving]   = useState(false);
  const svgRef                = useRef(null);

  /* Load & parse the real Ghana SVG once */
  useEffect(() => {
    fetch('/images/gh.svg')
      .then(r => r.text())
      .then(text => {
        const parser = new DOMParser();
        const doc    = parser.parseFromString(text, 'image/svg+xml');
        const svgEl  = doc.querySelector('svg');
        if (svgEl) {
          setViewBox(
            svgEl.getAttribute('viewbox') ||
            svgEl.getAttribute('viewBox') ||
            '0 0 1000 1000'
          );
        }
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
    const name     = SVG_ID_TO_NAME[svgId];
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
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, svgId });
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

  /* Build a tooltip string */
  const tooltipLabel = (svgId) => {
    const name = SVG_ID_TO_NAME[svgId];
    const dbR  = matchRegion(regions, name);
    const fee  = dbR
      ? (dbR.is_free ? 'Free delivery' : dbR.delivery_fee > 0 ? fmt(dbR.delivery_fee) : 'Not set')
      : '—';
    return `${name}  ·  ${fee}`;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">

      {/* ── SVG Map ──────────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 w-full xl:w-auto">
        {loading ? (
          <div className="flex items-center justify-center w-full max-w-[360px] mx-auto h-[420px]">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={viewBox}
              className="w-full max-w-[360px] mx-auto xl:mx-0 select-none rounded-2xl overflow-visible"
              style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.35))' }}
            >
              {paths.map(({ id, d }) => {
                const color     = REGION_COLOR[id] || '#6b7280';
                const isHovered = hovered === id;
                const isEditing = editing?.svgId === id;

                return (
                  <path
                    key={id}
                    d={d}
                    fill={color}
                    fillOpacity={isEditing ? 0.75 : isHovered ? 0.55 : 0.3}
                    stroke={color}
                    strokeWidth={isEditing ? 4 : isHovered ? 3 : 1}
                    strokeOpacity={isEditing ? 1 : isHovered ? 0.9 : 0.5}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                    onMouseMove={(e) => handleMouseMove(e, id)}
                    onClick={() => handleRegionClick(id)}
                  />
                );
              })}
            </svg>

            {/* Floating tooltip — rendered outside SVG so it's never clipped */}
            {tooltip && hovered && (
              <div
                className="pointer-events-none absolute z-50 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xl whitespace-nowrap"
                style={{
                  background: REGION_COLOR[hovered] || '#374151',
                  left: Math.min(tooltip.x + 12, 300),
                  top: Math.max(tooltip.y - 36, 0),
                  transform: 'translateX(-50%)',
                }}
              >
                {tooltipLabel(hovered)}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] mt-3 text-center xl:text-left">
          Click a region to set its delivery fee
        </p>
      </div>

      {/* ── Editor Panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 w-full">
        {editing ? (
          <div className="glass p-6 rounded-[2rem] shadow-xl space-y-5 animate-fadeIn"
            style={{ borderColor: REGION_COLOR[editing.svgId] + '55', borderWidth: 1, borderStyle: 'solid' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: REGION_COLOR[editing.svgId] }} />
                <MapPin size={18} style={{ color: REGION_COLOR[editing.svgId] }} />
                <h3 className="font-black text-[var(--text-primary)]">{editing.region.region_name}</h3>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Free toggle */}
            <div
              onClick={() => setEditing(e => ({ ...e, is_free: !e.is_free, fee: !e.is_free ? 0 : e.fee }))}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                editing.is_free
                  ? 'border-green-500/40 bg-green-500/5'
                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Free Delivery</p>
                <p className="text-xs text-[var(--text-muted)]">No charge for this region</p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center transition-all ${
                editing.is_free ? 'bg-green-500 justify-end' : 'bg-[var(--bg-tertiary)] justify-start'
              }`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
              </div>
            </div>

            {/* Fee input */}
            {!editing.is_free && (
              <div>
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                  Delivery Fee (₵)
                </label>
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
                className="flex-1 flex items-center justify-center gap-2 py-3 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ background: REGION_COLOR[editing.svgId] }}
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  : <><Check size={16} /> Save Region</>}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-5 py-3 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded-2xl font-bold text-sm transition-all hover:bg-[var(--bg-tertiary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 rounded-[2rem] border border-dashed border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-muted)] text-center">
              Click a region on the map<br />to set its delivery fee
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GhanaDeliveryMap;

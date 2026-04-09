import React, { useState, useEffect, useRef } from 'react';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import api from '../api';
import { MapPin, User, Calendar, FolderOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
const imgUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);

const getAllImages = (project) => {
  if (!project) return [];
  const imgs = project.images?.length
    ? project.images.map(i => imgUrl(i.image_url))
    : project.cover_image
    ? [imgUrl(project.cover_image)]
    : [];
  return imgs.filter(Boolean);
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { theme } = useTheme();

  // Background image cycling
  const [bgSrc, setBgSrc] = useState('');
  const [bgVisible, setBgVisible] = useState(true);
  const cycleRef = useRef(null);
  const imgIndexRef = useRef(0);

  useEffect(() => {
    api.get('/projects')
      .then(res => { setProjects(res.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // When active project changes → reset bg
  useEffect(() => {
    if (!projects.length) return;
    const proj = projects[activeIndex];
    const images = getAllImages(proj);
    imgIndexRef.current = 0;
    setBgSrc(images[0] || '');
    setBgVisible(true);

    // Clear old interval
    if (cycleRef.current) clearInterval(cycleRef.current);
    if (images.length <= 1) return;

    // Cycle every 4.5s
    cycleRef.current = setInterval(() => {
      setBgVisible(false);
      setTimeout(() => {
        imgIndexRef.current = (imgIndexRef.current + 1) % images.length;
        setBgSrc(images[imgIndexRef.current]);
        setBgVisible(true);
      }, 600);
    }, 4500);

    return () => clearInterval(cycleRef.current);
  }, [activeIndex, projects]);

  const activeProject = projects[activeIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1e] flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1e] text-gray-900 dark:text-white flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-32">
          <FolderOpen size={56} className="text-slate-600" />
          <h2 className="text-2xl font-black text-slate-400">No Projects Yet</h2>
          <p className="text-slate-500 text-sm">Check back soon — we're adding our project portfolio.</p>
        </div>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#0a0f1e] text-gray-900 dark:text-white flex flex-col">
      <MainNavbar />

      {/* ═══════════════════════════════════════════════════════════
          HERO — full viewport, cycling bg + bottom-left info + right carousel
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>

        {/* Background image with crossfade */}
        <div className="absolute inset-0">
          {bgSrc ? (
            <img
              src={bgSrc}
              alt=""
              className="w-full h-full object-cover"
              style={{
                opacity: bgVisible ? 1 : 0,
                transition: 'opacity 0.7s ease-in-out',
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-slate-900 dark:to-slate-800" />
          )}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        {/* ── Bottom-left: project info ── */}
        <div className="absolute bottom-0 left-0 right-24 md:right-36 px-8 md:px-14 pb-12 z-10">
          {/* Badge row */}
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-500/40 backdrop-blur-sm rounded-full text-green-400 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Featured Project
            </span>
            {activeProject.year && (
              <span className="text-slate-400 text-sm font-medium">{activeProject.year}</span>
            )}
          </div>

          {/* Title */}
          <h1
            key={activeProject.id + '-title'}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4 drop-shadow-2xl"
            style={{ animation: 'fadeSlideUp 0.5s ease-out forwards' }}
          >
            {activeProject.title}
          </h1>

          {/* Description */}
          {activeProject.description && (
            <p
              key={activeProject.id + '-desc'}
              className="text-slate-300 text-sm md:text-base leading-relaxed line-clamp-2 mb-5 max-w-xl"
              style={{ animation: 'fadeSlideUp 0.5s 0.08s ease-out both' }}
            >
              {activeProject.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4">
            {activeProject.client && (
              <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <User size={12} className="text-green-400 shrink-0" />
                {activeProject.client}
              </span>
            )}
            {activeProject.location && (
              <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <MapPin size={12} className="text-green-400 shrink-0" />
                {activeProject.location}
              </span>
            )}
            {activeProject.images?.length > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                {activeProject.images.length} photo{activeProject.images.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Image progress dots */}
          {getAllImages(activeProject).length > 1 && (
            <div className="flex items-center gap-1.5 mt-5">
              {getAllImages(activeProject).map((src, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-500 ${
                    bgSrc === src
                      ? 'w-6 h-1.5 bg-green-400'
                      : 'w-1.5 h-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right side: vertical project carousel (last 5) ── */}
        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5">
          {projects.slice(0, 5).map((project, i) => {
            const thumb = imgUrl(project.cover_image || project.images?.[0]?.image_url);
            const isActive = i === activeIndex;
            return (
              <button
                key={project.id}
                onClick={() => setActiveIndex(i)}
                className={`relative shrink-0 rounded-xl overflow-hidden transition-all duration-300 ${
                  isActive
                    ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent shadow-lg shadow-green-500/30'
                    : 'opacity-50 hover:opacity-75'
                }`}
                style={{ width: '72px', height: isActive ? '90px' : '56px', transition: 'height 0.3s ease, opacity 0.3s ease' }}
                title={project.title}
              >
                {thumb ? (
                  <img src={thumb} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                    <FolderOpen size={14} className="text-slate-500" />
                  </div>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-1.5">
                    <p className="text-white text-[8px] font-black leading-tight line-clamp-2">{project.title}</p>
                  </div>
                )}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-400" />
                )}
              </button>
            );
          })}

          {/* Counter */}
          <p className="text-[9px] text-gray-500 dark:text-slate-500 font-bold tracking-widest mt-1">
            {activeIndex + 1}/{Math.min(projects.length, 5)}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ALL PROJECTS GRID
          ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-14 py-20 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-green-400 mb-2">Our Portfolio</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight">
              All Projects
            </h2>
          </div>
          <p className="text-gray-500 dark:text-slate-500 text-sm font-medium">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <button
              key={project.id}
              onClick={() => { setActiveIndex(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`group text-left rounded-3xl overflow-hidden border transition-all duration-500 ${
                i === activeIndex
                  ? 'border-green-500 shadow-xl shadow-green-500/10'
                  : 'border-gray-200 dark:border-slate-700/50 hover:border-green-500/30 hover:shadow-xl hover:shadow-green-500/5'
              }`}
            >
              {/* Image */}
              <div className="aspect-video overflow-hidden relative bg-gray-200 dark:bg-slate-800">
                {project.cover_image ? (
                  <img
                    src={imgUrl(project.cover_image)}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen size={36} className="text-gray-400 dark:text-slate-600" />
                  </div>
                )}
                {project.images?.length > 1 && (
                  <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                    {project.images.length} photos
                  </span>
                )}
                {i === activeIndex && (
                  <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                    <span className="bg-green-500/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Viewing
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5 bg-white dark:bg-slate-900/80">
                <h3 className={`font-black text-base leading-tight mb-2 transition-colors ${i === activeIndex ? 'text-green-600' : 'text-gray-900 dark:text-white group-hover:text-green-600'}`}>
                  {project.title}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                  {project.client && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <User size={10} className="text-green-400" /> {project.client}
                    </span>
                  )}
                  {project.location && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin size={10} className="text-green-400" /> {project.location}
                    </span>
                  )}
                  {project.year && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                      <Calendar size={10} className="text-green-600 dark:text-green-400" /> {project.year}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">{project.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <MainFooter />

      {/* Inline keyframes for title animation */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

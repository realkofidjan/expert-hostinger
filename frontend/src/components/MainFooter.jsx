import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, ArrowUp } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

// ── Social icon SVGs ─────────────────────────────────────────────────────────
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.5H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z" />
  </svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const LinkedinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// ── Hardcoded fallbacks (used when settings haven't been saved yet) ───────────
const FALLBACK = {
  company_phone:           '+233 244 371593',
  company_secondary_phone: '+233 244 280532',
  company_email:           'sales@expertofficefurnish.com',
  pickup_address:          'Atomic Hills Estate Road, Near ASI PLAZA',
  social_twitter:          'https://x.com/expertfurnish?s=21',
  social_instagram:        'https://www.instagram.com/expertofficefurnish?igsh=NzgwMXFybXlpNWo3',
  social_facebook:         'https://www.facebook.com/share/1HHFxrUmLk/?mibextid=wwXIfr',
  social_linkedin:         'https://www.linkedin.com/company/expert-office-furnish-company-limited/',
};

const MainFooter = () => {
  const raw = useSiteSettings();

  // Merge live settings over fallbacks
  const s = {
    phone:     raw.company_phone           || FALLBACK.company_phone,
    phone2:    raw.company_secondary_phone || FALLBACK.company_secondary_phone,
    email:     raw.company_email           || FALLBACK.company_email,
    address:   raw.pickup_address          || raw.store_address || FALLBACK.pickup_address,
    hours:     raw.business_hours          || '',
    twitter:   raw.social_twitter          || FALLBACK.social_twitter,
    instagram: raw.social_instagram        || FALLBACK.social_instagram,
    facebook:  raw.social_facebook         || FALLBACK.social_facebook,
    linkedin:  raw.social_linkedin         || FALLBACK.social_linkedin,
  };

  const socialLinks = [
    { component: <TwitterIcon />,   href: s.twitter   },
    { component: <InstagramIcon />, href: s.instagram },
    { component: <FacebookIcon />,  href: s.facebook  },
    { component: <LinkedinIcon />,  href: s.linkedin  },
  ].filter(l => l.href);

  return (
    <footer className="relative bg-[#0f172a] text-white pt-10 pb-10 overflow-hidden">
      {/* Background glows */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-green-600/20 blur-[100px] rounded-full -mr-32 -mb-32 pointer-events-none" />
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-900/10 blur-[100px] rounded-full -ml-32 -mt-32 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-24 mb-10">

          {/* Brand & Contact Column */}
          <div className="lg:col-span-2">
            <h2 className="text-4xl font-black text-green-500 mb-6 tracking-normal">
              Expert Office Furnish Co. Ltd.
            </h2>
            <p className="text-gray-200 text-lg leading-relaxed mb-10 max-w-lg">
              Transforming workspaces with premium furniture solutions. Your trusted partner for modern, elegant, and functional office environments.
            </p>

            <div className="space-y-8">
              {/* Phone */}
              <div className="flex items-start gap-5 text-gray-100">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 text-green-500 border border-green-500/20">
                  <Phone size={24} />
                </div>
                <div className="text-lg leading-snug pt-1 flex flex-wrap gap-x-2">
                  <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="hover:text-green-500 transition-colors">{s.phone}</a>
                  {s.phone2 && (
                    <>
                      <span className="text-gray-600">/</span>
                      <a href={`tel:${s.phone2.replace(/\s/g, '')}`} className="hover:text-green-500 transition-colors">{s.phone2}</a>
                    </>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-5 text-gray-100">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 text-yellow-500 border border-yellow-500/20">
                  <Mail size={24} />
                </div>
                <a href={`mailto:${s.email}`} className="text-lg pt-1 hover:text-yellow-500 transition-colors break-all">{s.email}</a>
              </div>

              {/* Address */}
              <div className="flex items-start gap-5 text-gray-100">
                <div className="w-12 h-12 rounded-full bg-green-600/10 flex items-center justify-center flex-shrink-0 text-green-600 border border-green-600/20">
                  <MapPin size={24} />
                </div>
                <p className="text-lg pt-1">{s.address}</p>
              </div>

              {/* Business Hours */}
              {s.hours && (
                <div className="flex items-start gap-5 text-gray-100">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400 border border-blue-500/20">
                    <Clock size={24} />
                  </div>
                  <p className="text-lg pt-1 leading-relaxed">{s.hours}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-white mb-8 relative inline-block">
              Quick Links
              <span className="absolute -bottom-2 left-0 w-8 h-0.5 bg-green-500" />
            </h3>
            <ul className="space-y-5">
              {[
                { label: 'Home', href: '/' },
                { label: 'Products', href: '/products' },
                { label: 'Gallery', href: '/gallery' },
                { label: 'Our Services', href: '#services' },
                { label: 'Cart', href: '/cart' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-gray-300 hover:text-white text-lg transition-colors flex items-center gap-4 group">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 transform group-hover:scale-125 transition-transform" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-xl font-bold text-white mb-8 relative inline-block">
              Support
              <span className="absolute -bottom-2 left-0 w-8 h-0.5 bg-yellow-500" />
            </h3>
            <ul className="space-y-5">
              {[
                { label: 'Contact Us', href: '#contact' },
                { label: 'Login', href: '/admin/login' },
                { label: 'Sign Up', href: '/admin/login' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-gray-300 hover:text-white text-lg transition-colors flex items-center gap-4 group">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 transform group-hover:scale-125 transition-transform" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="border-t border-gray-800/50 pt-10 pb-10 text-center">
            <h3 className="text-lg font-bold text-white mb-8 uppercase tracking-[0.2em]">Connect With Us</h3>
            <div className="flex justify-center gap-6">
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-full bg-gray-800/50 hover:bg-green-600 flex items-center justify-center transition-all duration-300 border border-gray-700/50 hover:border-green-400"
                >
                  {social.component}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="border-t border-gray-800/50 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-lg text-gray-500 font-medium tracking-wide">
          <p>© {new Date().getFullYear()} Expert Office Furnish Ltd. All rights reserved.</p>
          <div className="flex items-center gap-1">
            Made with <span className="text-red-500 mx-1">❤</span> in Ghana
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MainFooter;

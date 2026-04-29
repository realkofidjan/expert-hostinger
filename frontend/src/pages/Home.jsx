import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Star, Shield, Truck, CheckCircle,
  ChevronLeft, ChevronRight, Sparkles, Zap, Award, Users,
  ShoppingBag, Eye, RefreshCw, Mail, Phone, MapPin, Send, Loader2,
  LayoutDashboard, Wrench, Layers, Activity, Clock
} from 'lucide-react';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import { useSiteSettings } from '../hooks/useSiteSettings';
import api from '../api';
import { LogoCloud } from '../components/ui/LogoCloud';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useCart } from '../context/CartContext';
import CustomPhoneInput from '../components/ui/PhoneInput';
import ProductCard from '../components/ProductCard';
import { createBlogUrl } from '../utils/url';

// ─── Testimonials data (exact from original) ─────────────────────────────────
const TESTIMONIALS = [
  {
    id: 1,
    quote: "Thank you for the kind assistance with having the sofa delivered on Saturday. We are very pleased with it. Best regards",
    author: "Jacob Agyei Twumasi",
    location: "Accra",
    rating: 4,
  },
  {
    id: 2,
    quote: "Thank you! I don't think I've already said but just to let you know we are very pleased with the furniture. The clients are so happy they want to order a new sofa for their London home! Thank you for all your help.",
    author: "Ann Pokua",
    location: "London",
    rating: 5,
  },
  {
    id: 3,
    quote: "Many thanks for the wonderful service. I am so happy with my new bench, also I purchased the 6 dining tables, those ones from the display showroom. Thanks again for the amazing service. Kind Regards",
    author: "Sophia Johnson",
    location: "Accra",
    rating: 5,
  },
];



// ─── Dynamic Brand Logos ───────────────────────────────────────────────────
const BRAND_IMAGES = import.meta.glob('../assets/store/companies/*.{png,jpg,jpeg,svg,webp}', { eager: true });
const BRANDS = Object.entries(BRAND_IMAGES).map(([path, module]) => {
  const fileName = path.split('/').pop().split('.')[0];
  return {
    src: module.default,
    alt: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  };
});


// ─── Moving Parts Background Component ──────────────────────────────────────
const BrandBackgroundParticles = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[100px]"
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -50, 100, 0],
            scale: [1, 1.2, 0.9, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: i % 2 === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.2)',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
    </div>
  );
};

// ─── Testimonials Section ─────────────────────────────────────────────────────
const TestimonialsSection = React.forwardRef(({ testimonials, visible }, ref) => {
  const [active, setActive] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActive(i => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const prev = () => setActive(i => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setActive(i => (i + 1) % testimonials.length);

  return (
    <section
      ref={ref}
      data-section="testimonials"
      className="py-32 bg-white dark:bg-gray-950 relative overflow-hidden"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-gray-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50" style={{ animation: 'blob 7s infinite' }} />
        <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-green-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50" style={{ animation: 'blob 7s 4s infinite' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">

          {/* Left: heading + controls */}
          <div className="lg:w-1/3 lg:self-start lg:sticky lg:top-32">
            <div className={`transform transition-all duration-1000 ${visible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                What Our <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500">
                  Customers Say
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed border-l-4 border-yellow-500 pl-6">
                Don't just take our word for it — hear from our satisfied customers
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={prev}
                  className="p-4 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-gray-800 hover:border-green-200 hover:text-green-600 transition-all duration-300 group"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`h-3 rounded-full transition-all duration-500 ${active === i ? 'bg-green-500 w-8' : 'bg-gray-200 dark:bg-gray-700 w-3 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={next}
                  className="p-4 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-gray-800 hover:border-green-200 hover:text-green-600 transition-all duration-300 group"
                >
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: sliding cards */}
          <div className="lg:w-2/3 w-full">
            <div className="relative min-h-[420px]">
              {testimonials.map((t, i) => (
                <div
                  key={t.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${i === active
                    ? 'opacity-100 translate-x-0 scale-100 z-20'
                    : i < active
                      ? 'opacity-0 -translate-x-20 scale-95 z-10'
                      : 'opacity-0 translate-x-20 scale-95 z-10'
                    }`}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100 dark:border-gray-700 h-full flex flex-col justify-center relative overflow-hidden">
                    {/* Decorative quote mark */}
                    <div className="absolute top-8 right-12 text-9xl font-serif text-green-50 dark:text-green-900/40 select-none leading-none">"</div>
                    <div className="relative z-10">
                      {/* Stars */}
                      <div className="flex text-yellow-400 mb-8 gap-1">
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} className="w-6 h-6 fill-current" style={{ animationDelay: `${j * 100}ms` }} />
                        ))}
                      </div>
                      {/* Quote */}
                      <blockquote className="text-2xl md:text-3xl text-gray-800 dark:text-gray-200 mb-10 leading-snug font-medium">
                        "{t.quote}"
                      </blockquote>
                      {/* Author */}
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg transform rotate-3 flex-shrink-0">
                          {t.author.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white text-xl">{t.author}</div>
                          <div className="text-green-600 font-medium flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            {t.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
});
TestimonialsSection.displayName = 'TestimonialsSection';

// ─── Home Page ────────────────────────────────────────────────────────────────
const Home = () => {
  const siteSettings = useSiteSettings();
  const [products, setProducts] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState({ 
    hero: false, 
    commitments: false, 
    services: false, 
    products: false, 
    blog: false, 
    testimonials: false 
  });
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState('');

  const heroRef = useRef(null);
  const commitmentsRef = useRef(null);
  const servicesRef = useRef(null);
  const productsRef = useRef(null);
  const blogRef = useRef(null);
  const testimonialsRef = useRef(null);
  const productScrollRef = useRef(null);

  // Scroll parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Intersection observer for scroll animations
  useEffect(() => {
    const opts = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const sec = e.target.getAttribute('data-section');
          setVisible(v => ({ ...v, [sec]: true }));
        }
      });
    }, opts);
    [heroRef, commitmentsRef, servicesRef, productsRef, blogRef, testimonialsRef].forEach(r => {
      if (r.current) obs.observe(r.current);
    });
    return () => obs.disconnect();
  }, []);


  // Fetch data
  useEffect(() => {
    api.get('/products?isFeatured=true&limit=10').then(r => {
      setProducts(r.data?.products || r.data || []);
    }).catch(() => { }).finally(() => setProductsLoading(false));

    api.get('/blogs').then(r => {
      setBlogs(r.data?.blogs || r.data || []);
    }).catch(() => { }).finally(() => setBlogsLoading(false));
  }, []);

  // Autofill contact if logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setContact(prev => ({
          ...prev,
          name: user.full_name || user.username || user.email.split('@')[0] || prev.name,
          email: user.email || prev.email,
          phone: user.phone || prev.phone
        }));
      } catch (e) {
        console.error("Failed to parse user for contact autofill", e);
      }
    }
  }, []);

  const scrollProducts = (dir) => {
    if (productScrollRef.current) {
      productScrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
    }
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewsletter = (e) => {
    e.preventDefault();
    setNewsletterDone(true);
  };

  const handleContact = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    setContactError('');
    try {
      await api.post('/inquiries', contact);
      setContactDone(true);
      setContact({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      setContactError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <MainNavbar />

      {/* Floating decorative dots */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-500 rounded-full animate-pulse opacity-60" />
        <div className="absolute top-40 right-20 w-3 h-3 bg-green-500 rounded-full animate-bounce opacity-40" />
        <div className="absolute top-60 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-50" />
        <div className="absolute bottom-40 right-1/3 w-2 h-2 bg-green-400 rounded-full animate-pulse opacity-30" />
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        data-section="hero"
        className="relative h-screen overflow-hidden"
      >
        {/* Parallax background */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: `url(/images/chairs1.jpeg)`,
            transform: `translateY(${scrollY * 0.5}px) scale(1.1)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        </div>

        <div className="relative z-10 h-full container mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="max-w-2xl w-full pt-20">
            <div className={`transform transition-all duration-1000 ${visible.hero ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>

              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8 animate-fadeIn">
                <Star className="w-4 h-4 text-yellow-400 mr-2" />
                <span className="text-sm text-white font-bold tracking-wider uppercase">Work Smart, Sit Safe</span>
              </div>

              {/* Heading */}
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-tight mb-8 tracking-tight">
                Transform Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-green-300 to-yellow-300">
                  Office Space
                </span>
                <span className="block text-4xl md:text-6xl mt-2 font-bold text-white/90">
                  with Style &amp; Comfort
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed font-light max-w-lg border-l-4 border-green-500 pl-6 bg-black/20 backdrop-blur-sm py-2 rounded-r-lg">
                Premium ergonomic furniture designed for health, productivity, and modern aesthetics. Experience the perfect blend of comfort and style.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-5">
                <Link to="/products">
                  <button className="w-full sm:w-auto group bg-white text-black px-8 py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                    Shop Now
                    <div className="bg-black text-white rounded-full p-1 ml-3 group-hover:rotate-45 transition-transform duration-300">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                </Link>
                <Link to="/cart">
                  <button className="w-full sm:w-auto group bg-white/5 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                    View Cart
                    <Sparkles className="ml-3 w-5 h-5 text-yellow-300 group-hover:scale-125 transition-transform" />
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Floating cards (desktop only) */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-3/4 pointer-events-none">
            <div className="relative w-full h-full">
              <div className="absolute top-20 right-20 bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl transform rotate-6 animate-float">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Shield className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Ergonomic Design</p>
                    <p className="text-white/60 text-xs">Certified Comfort</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-40 right-40 bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl transform -rotate-3" style={{ animation: 'float 3s ease-in-out 2s infinite' }}>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Star className="text-white w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Premium Quality</p>
                    <p className="text-white/60 text-xs">Top Rated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </section>

      {/* ── WHY CHOOSE US ────────────────────────────────────────────────────── */}
      <section
        id="commitments"
        ref={commitmentsRef}
        data-section="commitments"
        className="py-32 relative overflow-hidden bg-gray-50 dark:bg-gray-900"
      >
        {/* Animated blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ animation: 'blob 7s infinite' }} />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ animation: 'blob 7s 2s infinite' }} />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ animation: 'blob 7s 4s infinite' }} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            {/* Left sticky heading */}
            <div className="lg:w-1/3 lg:sticky lg:top-32">
              <div className={`transform transition-all duration-1000 ${visible.commitments ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
                <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                  Why <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500">Choose Us?</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed border-l-4 border-green-500 pl-6">
                  Experience the difference with our commitment to quality, sustainability, and customer retention
                </p>
                <div className="hidden lg:block">
                  <button className="group flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors">
                    Learn more about our values
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right cards */}
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Eco-Friendly - full width */}
              <div className={`group md:col-span-2 transform transition-all duration-1000 delay-200 ${visible.commitments ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700 relative overflow-hidden group-hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 dark:bg-green-900/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform duration-500">
                      <Shield className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Eco-Friendly Materials</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">We prioritize sustainable, responsibly sourced materials for a better tomorrow.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ergonomic Comfort */}
              <div className={`group transform transition-all duration-1000 delay-400 ${visible.commitments ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                <div className="h-full bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700 relative overflow-hidden group-hover:-translate-y-2">
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-50 dark:bg-yellow-900/20 rounded-full -ml-10 -mb-10 transition-transform group-hover:scale-150 duration-700" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-500">
                      <Award className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Ergonomic Comfort</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Furniture designed to support posture and reduce strain for optimal productivity.</p>
                  </div>
                </div>
              </div>

              {/* Flexible Policies */}
              <div className={`group transform transition-all duration-1000 delay-600 ${visible.commitments ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                <div className="h-full bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700 relative overflow-hidden group-hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-500">
                      <Truck className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Flexible Policies</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Enjoy comprehensive warranties, and express deliveries.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR SERVICES ────────────────────────────────────────────────────── */}
      <section
        id="services"
        ref={servicesRef}
        data-section="services"
        className="py-32 relative overflow-hidden bg-white dark:bg-gray-900"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 transform transition-all duration-1000 ${visible.services ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
              Our <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-yellow-500 to-green-600">Professional Services</span>
            </h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Beyond providing premium furniture, we offer comprehensive solutions to help you design, install, and optimize your ideal work environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                icon: <LayoutDashboard className="w-8 h-8" />, 
                title: "Office Design & Layout", 
                desc: "Spatial planning and expert consultation to maximize productivity and flow.",
                color: "green"
              },
              { 
                icon: <Truck className="w-8 h-8" />, 
                title: "Delivery & Installation", 
                desc: "Stress-free logistics and professional assembly at your location.",
                color: "yellow"
              },
              { 
                icon: <Layers className="w-8 h-8" />, 
                title: "Custom Solutions", 
                desc: "Tailored furniture designs that fit your specific brand identity.",
                color: "green"
              },
              { 
                icon: <Activity className="w-8 h-8" />, 
                title: "Ergonomic Audit", 
                desc: "Evaluation of workspace setups to improve long-term employee wellness.",
                color: "yellow"
              }
            ].map((service, i) => (
              <div 
                key={i}
                className={`group transform transition-all duration-1000 ${visible.services ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="h-full bg-gray-50 dark:bg-gray-800/40 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 hover:border-green-500/30 transition-all duration-500 group-hover:-translate-y-3 relative overflow-hidden text-center">
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 ${service.color === 'green' ? 'bg-green-100/50 dark:bg-green-900/20' : 'bg-yellow-100/50 dark:bg-yellow-900/20'} rounded-full -mt-20 blur-2xl group-hover:scale-150 transition-transform duration-700 opacity-60`} />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-16 h-16 ${service.color === 'green' ? 'bg-green-100 dark:bg-green-900/50 text-green-600' : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600'} rounded-2xl flex items-center justify-center mb-8 transform transition-transform duration-500 group-hover:rotate-[360deg] shadow-lg`}>
                      {service.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{service.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                      {service.desc}
                    </p>
                  </div>
                  
                  <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${service.color === 'green' ? 'from-green-500 to-green-300' : 'from-yellow-500 to-yellow-300'} transition-all duration-1000 ${visible.services ? 'w-full' : 'w-0'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VISION & MISSION ───────────────────────────────────────────────── */}
      <section
        className="py-32 relative overflow-hidden flex items-center justify-center min-h-[60vh]"
        style={{
          backgroundImage: `url(/images/Bg-Vision.jpeg)`,
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        {/* Decorative ping dots */}
        <div className="absolute top-12 left-12 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-60" />
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 right-32 w-2 h-2 bg-white rounded-full animate-ping opacity-40" style={{ animationDelay: '1s' }} />
        <div className="relative z-10 container mx-auto px-4 flex justify-center">
          <div className="relative group">
            {/* Gradient glow border */}
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-yellow-500 to-green-500 rounded-2xl blur opacity-30 group-hover:opacity-80 transition duration-1000" />
            {/* Image card */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 transform transition-all duration-700 group-hover:scale-[1.02]">
              <img
                src="/images/Vision-Mission.jpeg"
                alt="Vision &amp; Mission"
                className="max-w-5xl w-full h-auto object-cover"
              />
              {/* Shine on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
          </div>
        </div>
      </section>


      {/* ── PRODUCTS ─────────────────────────────────────────────────────────── */}
      <section
        id="products"
        ref={productsRef}
        data-section="products"
        className="py-32 bg-gray-50 dark:bg-gray-900"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            {/* Left sticky heading */}
            <div className="lg:w-1/3 lg:sticky lg:top-32">
              <div className={`transform transition-all duration-1000 ${visible.products ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
                <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                  Featured <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500">Products</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed border-l-4 border-yellow-500 pl-6">
                  Discover our handpicked selection of premium office furniture designed for modern workspaces
                </p>
                <div className="flex flex-col gap-6">
                  <Link to="/products">
                    <button className="group bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                      View All Products
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                  <div className="flex gap-4">
                    <button onClick={() => scrollProducts('left')} className="p-4 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" aria-label="Scroll left">
                      <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => scrollProducts('right')} className="p-4 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" aria-label="Scroll right">
                      <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Product snap carousel */}
            <div className="lg:w-2/3 w-full">
              {productsLoading ? (
                <div className="flex gap-8 overflow-hidden">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="min-w-[300px] md:min-w-[380px] bg-gray-100 rounded-[2.5rem] p-4 animate-pulse flex-shrink-0">
                      <div className="aspect-[4/3] bg-gray-200 rounded-[2rem] mb-6" />
                      <div className="px-4 space-y-3">
                        <div className="h-5 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-gray-500 text-lg bg-gray-50 rounded-2xl p-8 text-center">No products found.</div>
              ) : (
                <div
                  ref={productScrollRef}
                  className="flex gap-8 overflow-x-auto px-6 pt-5 pb-12 snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {products.map((p, i) => (
                    <div
                      key={p.id}
                      className={`sm:w-[380px] w-[320px] flex-shrink-0 snap-center transform transition-all duration-700 ${visible.products ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
                      style={{ transitionDelay: `${i * 100}ms` }}
                    >
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNERS / LOGO CLOUD ─────────────────────────────────────────── */}
      <section className="relative py-10 overflow-hidden bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <LogoCloud logos={BRANDS} />
      </section>


      {/* ── BLOG ─────────────────────────────────────────────────────────────── */}
      <section
        ref={blogRef}
        data-section="blog"
        className="py-32 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden"
      >
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="absolute top-20 right-20 w-64 h-64 border border-green-500/20 rounded-full" style={{ animation: 'spin 20s linear infinite' }} />
          <div className="absolute bottom-20 left-20 w-48 h-48 border border-yellow-500/20 rotate-45 animate-pulse" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-yellow-900/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Heading — centered */}
          <div className={`text-center transform transition-all duration-1000 ${visible.blog ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} mb-16`}>
            <span className="inline-block px-4 py-2 bg-green-500/20 text-green-400 text-sm font-bold rounded-full mb-6 backdrop-blur-sm border border-green-500/30">
              📚 FROM OUR BLOG
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              Latest{' '}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-400 to-green-400">
                  Insights
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 9C60 3 120 1 150 2C180 3 240 5 298 9" stroke="url(#blogGrad)" strokeWidth="3" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="blogGrad" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4ade80" />
                      <stop offset="0.5" stopColor="#facc15" />
                      <stop offset="1" stopColor="#4ade80" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Expert tips, trends, and inspiration for creating the perfect workspace
            </p>
          </div>

          {blogsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`bg-white/10 rounded-3xl overflow-hidden animate-pulse ${i === 0 ? 'md:col-span-2' : ''}`}>
                  <div className="aspect-video bg-white/5" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-20 text-gray-500 font-medium">No articles found.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {blogs.slice(0, 3).map((post, i) => (
                  <Link
                    key={post.id}
                    to={createBlogUrl(post)}
                    className={`group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 hover:border-green-500/30 rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-900/20 ${i === 0 ? 'md:col-span-2' : ''}`}
                  >
                    <div className={`relative overflow-hidden ${i === 0 ? 'aspect-video' : 'h-48'}`}>
                      {post.image_url ? (
                        <img
                          src={post.image_url.startsWith('http') ? post.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || ''}${post.image_url}`}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-900 to-gray-800 flex items-center justify-center">
                          <span className="text-4xl">📰</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                      {i === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                            <ArrowRight className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                      <span className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        {i === 0 ? '✨ FEATURED' : '📝 ARTICLE'}
                      </span>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-500 text-xs font-medium mb-3">
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h3 className={`font-bold text-white mb-3 group-hover:text-green-400 transition-colors leading-tight ${i === 0 ? 'text-2xl' : 'text-lg'}`}>
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className={`text-gray-400 leading-relaxed ${i === 0 ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'}`}>
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-6 flex items-center gap-2 text-green-400 font-semibold group-hover:text-green-300 transition-colors">
                        <span>Read Article</span>
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-12">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold rounded-full hover:shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1 transition-all duration-300"
                >
                  Explore All Articles
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <TestimonialsSection
        ref={testimonialsRef}
        testimonials={TESTIMONIALS}
        visible={visible.testimonials}
      />

      {/* ── NEWSLETTER ───────────────────────────────────────────────────────── */}
      <section className="py-32 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-green-900/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-yellow-900/20 rounded-full blur-3xl" />
          <div className="absolute top-10 left-10 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-60" />
          <div className="absolute bottom-10 right-10 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.7s' }} />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDelay: '1.4s' }} />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Glass container */}
          <div className="relative bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 p-8 md:p-16 overflow-hidden">
            {/* Corner gradient accents */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-br-full" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-yellow-500/20 to-transparent rounded-tl-full" />
            {newsletterDone ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-3xl font-black text-white mb-4">Thank You!</h3>
                <p className="text-gray-400 text-lg mb-6">You'll receive your first newsletter soon with exclusive insights and offers.</p>
                <button onClick={() => { setNewsletterDone(false); setNewsletterEmail(''); }}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-yellow-600 text-white rounded-2xl font-semibold hover:shadow-lg transition-all">
                  Subscribe Another Email
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
                {/* Left column */}
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30 mb-6">
                    <Mail className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-bold tracking-widest uppercase">Newsletter</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                    Stay in the
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-400 to-green-400">
                      Loop
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {[
                      { icon: <CheckCircle className="w-4 h-4 text-green-400" />, bg: 'bg-green-500/20', text: 'Exclusive early access to new products' },
                      { icon: <CheckCircle className="w-4 h-4 text-yellow-400" />, bg: 'bg-yellow-500/20', text: 'Members-only discounts up to 25% off' },
                      { icon: <CheckCircle className="w-4 h-4 text-green-400" />, bg: 'bg-green-500/20', text: 'Free workspace design tips & inspiration' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-gray-300">
                        <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0`}>
                          {item.icon}
                        </div>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right glass card */}
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-1">Join 10,000+ subscribers</h3>
                  <p className="text-gray-400 text-sm mb-6">Get weekly updates straight to your inbox</p>
                  <form onSubmit={handleNewsletter} className="space-y-3">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={e => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                    />
                    <button type="submit" className="relative w-full px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-green-500/30 transition-all overflow-hidden group">
                      <span className="relative z-10">Subscribe Now</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </button>
                  </form>
                  <p className="text-gray-600 text-xs mt-4 text-center">No spam · Unsubscribe anytime</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-32 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
              Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500">Touch</span>
            </h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Have a project in mind? We'd love to help transform your workspace.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-12 max-w-7xl mx-auto">
            {/* ── Contact Form ── */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] p-8 md:p-10 border border-gray-100 dark:border-gray-700">
              {contactDone ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Message Sent!</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">We'll get back to you within 24 hours.</p>
                  <button
                    onClick={() => setContactDone(false)}
                    className="px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold hover:bg-green-600 transition-colors"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Send us a message</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Fill in the form and our team will respond shortly.</p>
                  <form onSubmit={handleContact} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={contact.name}
                          onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Phone</label>
                        <CustomPhoneInput
                          value={contact.phone}
                          onChange={val => setContact(c => ({ ...c, phone: val || '' }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={contact.email}
                        onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                        placeholder="john@company.com"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Message *</label>
                      <textarea
                        required
                        rows={5}
                        value={contact.message}
                        onChange={e => setContact(c => ({ ...c, message: e.target.value }))}
                        placeholder="Tell us about your project or inquiry..."
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm resize-none"
                      />
                    </div>
                    {contactError && (
                      <p className="text-red-500 text-sm font-medium">{contactError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={contactLoading}
                      className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 transform transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {contactLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {contactLoading ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* ── Contact Info + Map ── */}
            <div className="flex flex-col gap-6">

              {/* Live contact details card */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-700 space-y-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Get in touch directly</h3>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0 text-green-600">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                    <div className="space-y-0.5">
                      {(siteSettings.company_phone || '+233 244 371593').split(',').map((n, i) => (
                        <a key={i} href={`tel:${n.trim().replace(/\s/g, '')}`}
                          className="block text-gray-900 dark:text-white font-semibold hover:text-green-600 transition-colors">
                          {n.trim()}
                        </a>
                      ))}
                      {siteSettings.company_secondary_phone && (
                        <a href={`tel:${siteSettings.company_secondary_phone.replace(/\s/g, '')}`}
                          className="block text-gray-900 dark:text-white font-semibold hover:text-green-600 transition-colors">
                          {siteSettings.company_secondary_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 text-yellow-600">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                    <a href={`mailto:${siteSettings.company_email || 'sales@expertofficefurnish.com'}`}
                      className="text-gray-900 dark:text-white font-semibold hover:text-yellow-600 transition-colors break-all">
                      {siteSettings.company_email || 'sales@expertofficefurnish.com'}
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {siteSettings.pickup_address || siteSettings.store_address || 'Atomic Hills Estate Road, Near ASI PLAZA'}
                    </p>
                  </div>
                </div>

                {/* Business Hours */}
                {siteSettings.business_hours && (
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hours</p>
                      <p className="text-gray-900 dark:text-white font-semibold">{siteSettings.business_hours}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Map */}
              <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 flex-1 min-h-[280px]">
                <iframe
                  title="Expert Office Furnish Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.2273646545197!2d-0.23428182410300186!3d5.680247094301138!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf9f59f1bee637%3A0x4d77b3c520395c25!2sEXPERT%20OFFICE%20FURNISH%20CO.%20LTD.!5e0!3m2!1sen!2sgh!4v1712483840000!5m2!1sen!2sgh"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '280px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <MainFooter />
    </div>
  );
};

export default Home;

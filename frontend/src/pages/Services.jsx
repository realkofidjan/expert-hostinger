import React, { useEffect } from 'react';
import { 
  CheckCircle2, 
  Settings, 
  Map, 
  Wrench, 
  BarChart3, 
  ShieldCheck, 
  Clock, 
  Users, 
  ArrowRight,
  Sparkles,
  Layout,
  Hammer,
  Truck
} from 'lucide-react';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';

const Services = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const services = [
    {
      icon: <Layout className="w-8 h-8" />,
      title: "Office Interior Design",
      description: "Transform your workspace into an inspiring environment. Our experts create ergonomic and aesthetic layouts tailored to your brand identity.",
      features: ["Space Assessment", "3D Visualization", "Mood Boards", "Custom Furniture Design"],
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <Truck className="w-8 h-8" />,
      title: "Fast Delivery & Assembly",
      description: "Hassle-free shipping and expert assembly. We ensure your new furniture is set up perfectly and ready for use in no time.",
      features: ["Express delivery", "White-glove assembly", "Furniture leveling", "Packaging removal"],
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: <Wrench className="w-8 h-8" />,
      title: "Repair & Maintenance",
      description: "Extend the life of your office assets. Our team provides professional restoration and preventive maintenance services for all your furniture.",
      features: ["Upholstery repair", "Structural fixing", "Fabric cleaning", "Parts replacement"],
      color: "from-orange-500 to-red-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Space Planning",
      description: "Maximize efficiency and workflow. We optimize your office layout to promote collaboration while ensuring social distancing compliance.",
      features: ["Occupancy analysis", "Acoustic planning", "Circulation flow", "Ergonomic audit"],
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: <ShieldCheck className="w-8 h-8" />,
      title: "Aura Service (Warranty Plus)",
      description: "Peace of mind for your investment. Our extended warranty plan covers accidental damage and structural wear for up to 5 years.",
      features: ["Priority support", "Annual check-ups", "Free spare parts", "Loaner furniture"],
      color: "from-yellow-500 to-amber-600"
    },
    {
      icon: <Map className="w-8 h-8" />,
      title: "Relocation Services",
      description: "Moving offices made easy. We handle the careful disassembly, transport, and re-installation of your entire workspace furniture.",
      features: ["Furniture inventory", "Secure crating", "IT station setup", "Final walkthrough"],
      color: "from-cyan-500 to-teal-600"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Concept",
      description: "Initial consultation to understand your needs, goals, and brand vision."
    },
    {
      number: "02",
      title: "Planning",
      description: "Detailed 2D/3D layouts and material selection to optimize your space."
    },
    {
      number: "03",
      title: "Execution",
      description: "Precise delivery and expert installation by our certified technicians."
    },
    {
      number: "04",
      title: "Aftercare",
      description: "Continuous support and maintenance to keep your workspace in top shape."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNavbar />

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute top-20 right-0 w-96 h-96 bg-green-500 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 left-0 w-72 h-72 bg-yellow-500 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full shadow-sm mb-6 animate-fadeIn">
                <Sparkles className="w-4 h-4 text-green-500" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Expert Office Solutions</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-8">
                Services Built for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500">Peak Productivity</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                Beyond selling furniture, we provide end-to-end workspace solutions that foster creativity, wellness, and efficiency in the modern office.
            </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, idx) => (
            <div 
              key={idx} 
              className="group bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-white/5 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} text-white flex items-center justify-center mb-10 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                {service.icon}
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 leading-tight">{service.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">
                {service.description}
              </p>
              
              <ul className="space-y-3 mb-10 mt-auto">
                {service.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-green-600 hover:text-green-700 transition-colors">
                Learn More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-green-500/10 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/3">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-green-500 mb-4 block">Proven Framework</span>
              <h2 className="text-4xl md:text-5xl font-black leading-tight mb-8">How We Work <br /> With You</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium italic">
                "Our process is designed to be seamless, collaborative, and entirely built around your timeline."
              </p>
              <button className="px-10 py-5 bg-white text-gray-900 rounded-full font-black text-sm uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-xl">
                Get a Consultation
              </button>
            </div>
            
            <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {steps.map((step, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-colors">
                  <span className="text-5xl font-black text-green-500/30 mb-6 block leading-none">{step.number}</span>
                  <h4 className="text-xl font-black mb-3">{step.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed font-medium">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
                <div>
                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-2">500+</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">Offices Transformed</p>
                </div>
                <div>
                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-2">15k</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">Products Delivered</p>
                </div>
                <div>
                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-2">98%</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">Client Satisfaction</p>
                </div>
                <div>
                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-2">5yr</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">Avg. Warranty</p>
                </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto rounded-[4rem] p-12 md:p-24 bg-gradient-to-br from-gray-900 to-black text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-green-500/30 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-yellow-500/20 rounded-full blur-[100px]" />
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-8">
            Let's Re-imagine <br /> Your Workspace
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12 font-medium">
            Ready to elevate your team's productivity? Speak with one of our ergonomics experts today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className="w-full sm:w-auto px-10 py-5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all transform active:scale-95">
              Book Free Site Audit
            </button>
            <button className="w-full sm:w-auto px-10 py-5 border-2 border-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-all transform active:scale-95">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      <MainFooter />
    </div>
  );
};

export default Services;

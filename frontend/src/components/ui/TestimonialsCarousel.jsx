import React, { useState, useEffect } from 'react';
import { Carousel } from '@ark-ui/react/carousel';
import { Star, Quote } from 'lucide-react';

export default function TestimonialsCarousel({ testimonials = [], visible = true }) {
  const [currentPage, setCurrentPage] = useState(0);

  // Auto-swipe functionality
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <Carousel.Root
      page={currentPage}
      onPageChange={(details) => setCurrentPage(details.page)}
      slideCount={testimonials.length}
      className="w-full"
      loop
    >
      <div className="flex flex-col lg:flex-row gap-16 items-center">
        {/* Left Column: Heading & Indicators */}
        <div className="lg:w-1/3">
          <div className={`transform transition-all duration-1000 ${visible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-[0.9]">
              What Our <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-500">Customers</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-yellow-500">Say</span>
            </h2>
            <p className="text-base text-gray-500 mb-10 leading-relaxed border-l-2 border-green-500 pl-6 max-w-sm">
              Don't just take our word for it - hear from our satisfied customers about their journey with Expert Office.
            </p>

            {/* Indicators - Matches image */}
            <Carousel.IndicatorGroup className="flex gap-2">
              {testimonials.map((_, index) => (
                <Carousel.Indicator
                  key={index}
                  index={index}
                  className="w-2.5 h-2.5 rounded-full bg-gray-200 data-[current]:bg-green-500 data-[current]:w-8 transition-all duration-500 cursor-pointer"
                />
              ))}
            </Carousel.IndicatorGroup>
          </div>
        </div>

        {/* Right Column: Carousel Items */}
        <div className="lg:w-2/3 w-full">
          <Carousel.ItemGroup className="overflow-visible py-16 -my-16">
            {testimonials.map((testimonial, index) => (
              <Carousel.Item
                key={index}
                index={index}
                className="px-4"
              >
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all duration-500 h-full">
                    {/* Architectural Decor */}
                    <Quote className="absolute top-8 right-10 w-20 h-20 text-green-50/50 -z-0 select-none" />
                    
                    <div className="relative z-10 h-full flex flex-col">
                    <div className="flex text-yellow-400 mb-8 gap-0.5">
                        {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                        ))}
                    </div>

                    <blockquote className="text-xl md:text-2xl text-gray-800 mb-10 leading-snug font-semibold tracking-tight">
                        "{testimonial.quote || testimonial.content}"
                    </blockquote>

                    <div className="flex items-center gap-4 mt-auto">
                        <div className="w-14 h-14 bg-gradient-to-tr from-green-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md transform group-hover:rotate-6 transition-transform">
                            {(testimonial.author || testimonial.name)?.charAt(0)}
                        </div>
                        <div>
                        <p className="font-black text-gray-900 text-lg tracking-tight leading-none mb-1">
                            {testimonial.author || testimonial.name}
                        </p>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                            {testimonial.location || testimonial.role}
                        </p>
                        </div>
                    </div>
                    </div>
                </div>
              </Carousel.Item>
            ))}
          </Carousel.ItemGroup>
        </div>
      </div>
    </Carousel.Root>
  );
}

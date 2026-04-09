import React from "react";
import { InfiniteSlider } from "./infinite-slider";

export function LogoCloud({ logos = [] }) {
    if (!logos || logos.length === 0) return null;

    return (
        <>
            {/* Section Global Heading */}
            <div className="text-center mb-8 flex flex-col items-center">
                <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                    Trusted by
                </p>
                <h2 className="text-xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                    Leading Companies
                </h2>
            </div>

            <div className="w-full border-y border-gray-100 dark:border-gray-800">
                <div className="relative mx-auto max-w-[1440px] py-12 md:border-x border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-[300px] z-10 pointer-events-none bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent" />
                    <div className="absolute right-0 top-0 h-full w-[300px] z-10 pointer-events-none bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent" />

                    <InfiniteSlider gap={40} reverse duration={20} durationOnHover={40}>
                        {logos.map((logo) => (
                            <div key={`logo-container-${logo.alt}`} className="flex flex-shrink-0 items-center justify-center p-2 group cursor-pointer">
                                <img
                                    alt={logo.alt}
                                    className="pointer-events-none h-8 select-none md:h-16 object-contain transition-all duration-500 hover:scale-110"
                                    height="auto"
                                    loading="lazy"
                                    src={logo.src}
                                    width="auto"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const span = document.createElement('span');
                                        span.className = 'font-bold text-xs md:text-sm uppercase tracking-[0.2em] text-gray-300 group-hover:text-gray-900 transition-colors';
                                        span.innerText = logo.alt;
                                        e.target.parentElement.appendChild(span);
                                    }}
                                />
                            </div>
                        ))}
                    </InfiniteSlider>
                </div>
            </div>
        </>
    );
}

import React, { useEffect, useState } from 'react';
import { PrismFluxLoader } from './ui/prism-flux-loader';

const PageLoader = ({ onDone, fast = false }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeDelay = fast ? 500 : 1800;
    const doneDelay = fast ? 850 : 2300;
    const fadeTimer = setTimeout(() => setFading(true), fadeDelay);
    const doneTimer = setTimeout(() => onDone?.(), doneDelay);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      {/* Ambient blobs - repositioned for overlay look */}
      <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-green-500/20 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[600px] h-[600px] bg-yellow-500/15 blur-[160px] rounded-full pointer-events-none" />

      {/* 3D Cube loader */}
      <PrismFluxLoader size={40} speed={4} />
    </div>
  );
};

export default PageLoader;

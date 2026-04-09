import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useMotionValue, animate, motion } from 'framer-motion';
import useMeasure from 'react-use-measure';

export function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  durationOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
}) {
  const [currentDuration, setCurrentDuration] = useState(duration);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);

    const [key, setKey] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const size = direction === 'horizontal' ? width : height;
        if (size === 0) return;

        const contentSize = size / 2 + gap / 2;
        const from = reverse ? -contentSize : 0;
        const to = reverse ? 0 : -contentSize;

        let controls;

        if (isTransitioning) {
            // Calculate remaining duration based on current position
            const currentPosition = translation.get();
            const totalDistance = Math.abs(to - from);
            const remainingDistance = Math.abs(to - currentPosition);
            const ratio = totalDistance > 0 ? remainingDistance / totalDistance : 0;
            const remainingDuration = currentDuration * ratio;

            controls = animate(translation, [currentPosition, to], {
                ease: 'linear',
                duration: remainingDuration,
                onComplete: () => {
                    setIsTransitioning(false);
                    setKey((prev) => prev + 1);
                },
            });
        } else {
            controls = animate(translation, [from, to], {
                ease: 'linear',
                duration: currentDuration,
                repeat: Infinity,
                repeatType: 'loop',
                repeatDelay: 0,
            });
        }

        return () => controls?.stop();
    }, [
        key,
        translation,
        currentDuration,
        width,
        height,
        gap,
        isTransitioning,
        direction,
        reverse,
    ]);

    const hoverProps = durationOnHover
        ? {
            onHoverStart: () => {
                setIsTransitioning(true);
                setCurrentDuration(durationOnHover);
            },
            onHoverEnd: () => {
                setIsTransitioning(true);
                setCurrentDuration(duration);
            },
        }
        : {};

  return (
    <div className={cn('overflow-hidden', className)}>
      <motion.div
        className='flex w-max'
        style={{
          ...(direction === 'horizontal'
            ? { x: translation }
            : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}

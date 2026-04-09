import React, { useState, useEffect } from "react";

export const PrismFluxLoader = ({ size = 30, speed = 5 }) => {
  const [time, setTime] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = ["Fetching", "Fixing", "Updating", "Placing", "Syncing", "Processing"];

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 0.02 * speed);
    }, 16);
    return () => clearInterval(interval);
  }, [speed]);

  useEffect(() => {
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 600);
    return () => clearInterval(statusInterval);
  }, []);

  const half = size / 2;

  const faceTransforms = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          transform: `rotateY(${time * 30}deg) rotateX(${time * 30}deg)`,
        }}
      >
        {faceTransforms.map((transform, i) => (
          <div
            key={i}
            className="absolute flex items-center justify-center"
            style={{
              width: size,
              height: size,
              border: `1.5px solid #22c55e`,
              transform,
              backfaceVisibility: "hidden",
              opacity: 0.85,
            }}
          >
            <img src="/images/Logo.png" alt="" style={{ width: size * 0.65, height: size * 0.65, objectFit: "contain" }} />
          </div>
        ))}
      </div>

      <div
        className="text-sm font-bold tracking-widest uppercase"
        style={{ color: "var(--text-muted)" }}
      >
        {statuses[statusIndex]}...
      </div>
    </div>
  );
};

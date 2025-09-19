"use client";

import { motion, useAnimationControls, easeInOut } from "framer-motion";
import { useEffect, useMemo } from "react";

type BreathingBubbleProps = {
  state: "idle" | "active" | "listening";
  size?: number;
  className?: string;
  overlayText?: string;
  progress?: number; // 0 to 1, renders water fill level
};

export default function BreathingBubble({ state, size = 240, className, overlayText, progress = 0 }: BreathingBubbleProps) {
  const controls = useAnimationControls();

  const variants = useMemo(
    () => ({
      idle: {
        scale: [1, 1.04, 1],
        transition: { duration: 3.2, repeat: Infinity, ease: easeInOut },
      },
      active: {
        scale: [1, 1.12, 1],
        transition: { duration: 1.6, repeat: Infinity, ease: easeInOut },
      },
      listening: {
        scale: [1, 1.18, 0.98, 1.18, 1],
        boxShadow: [
          "inset 0 0 40px rgba(255,255,255,0.8), 0 0 0 0 rgba(59,130,246,0.35)",
          "inset 0 0 40px rgba(255,255,255,0.8), 0 0 0 10px rgba(59,130,246,0.25)",
          "inset 0 0 40px rgba(255,255,255,0.8), 0 0 0 0 rgba(59,130,246,0.35)",
          "inset 0 0 40px rgba(255,255,255,0.8), 0 0 0 14px rgba(59,130,246,0.2)",
          "inset 0 0 40px rgba(255,255,255,0.8), 0 0 0 0 rgba(59,130,246,0.35)",
        ],
        transition: { duration: 1.2, repeat: Infinity, ease: easeInOut },
      },
    }),
    []
  );

  useEffect(() => {
    controls.start(state);
  }, [state, controls]);

  return (
    <div className={className} style={{ width: size, height: size }}>
      <motion.div
        initial="idle"
        animate={controls}
        variants={variants}
        className="relative w-full h-full rounded-full"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 35%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 15%, rgba(99,102,241,0.6) 58%, rgba(59,130,246,0.55) 100%)",
          boxShadow:
            "inset 0 0 40px rgba(255,255,255,0.8), inset 0 -30px 60px rgba(59,130,246,0.3), 0 28px 70px rgba(99,102,241,0.4)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="absolute inset-0 rounded-full bg-white/10" />
        <div className="absolute -inset-3 rounded-full blur-2xl bg-gradient-to-br from-indigo-400/40 to-sky-300/40" />
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-white/40 to-transparent mix-blend-overlay" />

        {/* Water fill (progress) */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <clipPath id="bubble-clip">
                <circle cx="50" cy="50" r="50" />
              </clipPath>
              <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
                <stop offset="100%" stopColor="rgba(59,130,246,0.2)" />
              </linearGradient>
              <path id="wavePath" d="M 0 10 C 12.5 5 37.5 15 50 10 C 62.5 5 87.5 15 100 10 L 100 120 L 0 120 Z" />
            </defs>
            <g clipPath="url(#bubble-clip)">
              {(() => {
                const clamped = Math.max(0, Math.min(1, progress));
                // Force perfect fill at the extremes to avoid visual gaps due to rounding
                const isFull = clamped >= 0.995;
                const isEmpty = clamped <= 0.001;
                const level = isFull ? 0 : isEmpty ? 100 : 100 - clamped * 100; // 0 at top, 100 at bottom
                const waterHeight = 100 - level;
                const waveYOffset = (isFull ? -5 : level) - 12; // extra overlap so dark wave covers bottom
                return (
                  <>
                    <rect x="0" y={isFull ? 0 : level} width="100" height={isFull ? 100 : waterHeight} fill="url(#waterGradient)" />
                    {!isEmpty && (
                      <g className="wave-outer" style={{ transform: `translateY(${waveYOffset}px)` }}>
                        <g className="wave-inner wave1">
                          <use href="#wavePath" x="0" fill="rgba(99,102,241,0.28)" />
                          <use href="#wavePath" x="100" fill="rgba(99,102,241,0.28)" />
                          <use href="#wavePath" x="200" fill="rgba(99,102,241,0.28)" />
                        </g>
                        <g className="wave-inner wave2">
                          <use href="#wavePath" x="0" fill="rgba(59,130,246,0.28)" />
                          <use href="#wavePath" x="100" fill="rgba(59,130,246,0.28)" />
                          <use href="#wavePath" x="200" fill="rgba(59,130,246,0.28)" />
                        </g>
                      </g>
                    )}
                  </>
                );
              })()}
            </g>
          </svg>
        </div>

        {overlayText && (
          <div className="absolute inset-0 grid place-items-center select-none text-center px-6">
            <span className="text-sm font-medium text-black/70">{overlayText}</span>
          </div>
        )}
        <style jsx>{`
          .wave-outer { transition: transform 480ms ease-in-out; }
          .wave-inner { animation: waveX 6s linear infinite; }
          .wave-inner.wave2 { animation-duration: 8s; opacity: 0.9; }
          @keyframes waveX {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100px); }
          }
        `}</style>
      </motion.div>
    </div>
  );
}



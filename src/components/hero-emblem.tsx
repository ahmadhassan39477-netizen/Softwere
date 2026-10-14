"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/brand-mark";

/** Side-stage brand emblem — layered motion, never overlays hero copy. */
export function HeroEmblem() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-visible sm:max-w-[320px] lg:max-w-[360px]">
      {/* Expanding pulse rings */}
      {!reduce &&
        [0, 1].map((i) => (
          <motion.div
            key={`pulse-${i}`}
            className="absolute inset-[8%] rounded-full border border-[var(--accent)]"
            initial={{ scale: 0.75, opacity: 0.35 }}
            animate={{ scale: [0.75, 1.28], opacity: [0.35, 0] }}
            transition={{
              duration: 3.6,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 1.8,
            }}
          />
        ))}

      {/* Soft aura */}
      <motion.div
        className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_70%)]"
        animate={
          reduce ? undefined : { scale: [0.92, 1.12, 0.92], opacity: [0.3, 0.75, 0.3] }
        }
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Outer dashed orbit */}
      <motion.div
        className="absolute inset-[2%] rounded-full border border-dashed border-[color-mix(in_oklab,var(--accent)_45%,transparent)]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      />

      {/* Mid solid ring */}
      <motion.div
        className="absolute inset-[13%] rounded-full border border-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 26, ease: "linear", repeat: Infinity }}
      />

      {/* Inner dotted ring */}
      <motion.div
        className="absolute inset-[22%] rounded-full border border-dotted border-[color-mix(in_oklab,var(--accent)_50%,transparent)]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 18, ease: "linear", repeat: Infinity }}
      />

      {/* Orbiting satellites */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-[4%]"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{
            duration: 11 + i * 3.5,
            ease: "linear",
            repeat: Infinity,
            delay: i * 0.55,
          }}
        >
          <span
            className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--accent)] shadow-[0_0_14px_var(--accent)]"
            style={{ opacity: 0.5 + (i % 3) * 0.15 }}
          />
        </motion.div>
      ))}

      {/* Vault mark — float + 3D tilt (not a flat spin) */}
      <motion.div
        className="absolute inset-0 z-[1] flex items-center justify-center"
        style={{ perspective: 900 }}
        initial={{ opacity: 0, scale: 0.5, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        <motion.div
          className="relative"
          animate={
            reduce
              ? undefined
              : {
                  y: [0, -14, 2, -9, 0],
                  rotateY: [-14, 12, -7, 16, -14],
                  rotateZ: [-5, 4, -2, 5, -5],
                  scale: [1, 1.05, 0.99, 1.03, 1],
                }
          }
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="absolute inset-[-22%] -z-10 rounded-[30%] bg-[var(--accent)] blur-2xl"
            animate={reduce ? undefined : { opacity: [0.12, 0.48, 0.16] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <BrandMark
            size={160}
            className="drop-shadow-[0_20px_42px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/brand-mark";

/** Side-stage brand emblem — layered motion, never overlays hero copy. */
export function HeroEmblem() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[380px]">
      {/* Soft aura */}
      <motion.div
        className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_70%)]"
        animate={
          reduce ? undefined : { scale: [0.92, 1.1, 0.92], opacity: [0.3, 0.7, 0.3] }
        }
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Outer dashed orbit */}
      <motion.div
        className="absolute inset-0 rounded-full border border-dashed border-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 42, ease: "linear", repeat: Infinity }}
      />

      {/* Mid ring */}
      <motion.div
        className="absolute inset-[11%] rounded-full border border-[color-mix(in_oklab,var(--accent)_28%,transparent)]"
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      />

      {/* Orbiting satellites */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-[6%]"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{
            duration: 14 + i * 5,
            ease: "linear",
            repeat: Infinity,
            delay: i * 0.8,
          }}
        >
          <span
            className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]"
            style={{ opacity: 0.55 + i * 0.15 }}
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
                  y: [0, -12, 2, -8, 0],
                  rotateY: [-12, 10, -6, 14, -12],
                  rotateZ: [-4, 3, -2, 4, -4],
                  scale: [1, 1.04, 0.99, 1.03, 1],
                }
          }
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="absolute inset-[-22%] -z-10 rounded-[30%] bg-[var(--accent)] blur-2xl"
            animate={reduce ? undefined : { opacity: [0.12, 0.42, 0.16] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <BrandMark
            size={172}
            className="drop-shadow-[0_20px_42px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

import type { Variants } from "motion/react";

export type HeroMotionVariants = {
  copyContainer: Variants;
  titleContainer: Variants;
  titleWord: Variants;
  titleAccent: Variants;
  subtitle: Variants;
  visualContainer: Variants;
  imageFrame: Variants;
  imageInner: Variants;
  glow: Variants;
  overlayContainer: Variants;
  quote: Variants;
  fromRight: Variants;
  fromLeft: Variants;
  columnContainer: Variants;
  cta: Variants;
};

const pop = {
  type: "spring" as const,
  stiffness: 280,
  damping: 16,
  bounce: 0.48,
};

const snap = {
  type: "spring" as const,
  stiffness: 420,
  damping: 20,
  bounce: 0.55,
};

const glide = {
  type: "spring" as const,
  stiffness: 90,
  damping: 18,
  bounce: 0.35,
};

const easeOut = [0.16, 1, 0.3, 1] as const;

export function createHeroVariants(reduced: boolean): HeroMotionVariants {
  if (reduced) {
    const fade: Variants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.25 } },
    };
    return {
      copyContainer: {
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      },
      titleContainer: {
        hidden: {},
        show: { transition: { staggerChildren: 0.04 } },
      },
      titleWord: fade,
      titleAccent: fade,
      subtitle: fade,
      visualContainer: {
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
      },
      imageFrame: fade,
      imageInner: fade,
      glow: fade,
      overlayContainer: {
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      },
      quote: fade,
      fromRight: fade,
      fromLeft: fade,
      columnContainer: {
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      },
      cta: fade,
    } satisfies HeroMotionVariants;
  }

  return {
    copyContainer: {
      hidden: {},
      show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
    },
    titleContainer: {
      hidden: {},
      show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
    },
    titleWord: {
      hidden: {
        opacity: 0,
        y: 48,
        rotateX: -28,
        filter: "blur(10px)",
      },
      show: {
        opacity: 1,
        y: 0,
        rotateX: 0,
        filter: "blur(0px)",
        transition: pop,
      },
    },
    titleAccent: {
      hidden: {
        opacity: 0,
        y: 56,
        scale: 0.6,
        rotate: -8,
        filter: "blur(12px)",
      },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotate: 0,
        filter: "blur(0px)",
        transition: { ...snap, delay: 0.08 },
      },
    },
    subtitle: {
      hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
      show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { ...glide, delay: 0.12 },
      },
    },
    visualContainer: {
      hidden: {},
      show: { transition: { staggerChildren: 0.16, delayChildren: 0.08 } },
    },
    imageFrame: {
      hidden: {
        opacity: 0,
        scale: 0.88,
        y: 40,
        rotateX: 8,
      },
      show: {
        opacity: 1,
        scale: 1,
        y: 0,
        rotateX: 0,
        transition: { duration: 0.95, ease: easeOut },
      },
    },
    imageInner: {
      hidden: { scale: 1.18 },
      show: {
        scale: 1,
        transition: { duration: 1.35, ease: easeOut },
      },
    },
    glow: {
      hidden: { opacity: 0, scale: 0.7 },
      show: {
        opacity: 1,
        scale: 1,
        transition: { duration: 1.1, ease: easeOut },
      },
    },
    overlayContainer: {
      hidden: {},
      show: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
    },
    quote: {
      hidden: { opacity: 0, x: -36, y: -12, filter: "blur(10px)" },
      show: {
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)",
        transition: glide,
      },
    },
    fromRight: {
      hidden: { opacity: 0, x: 72, y: 24, rotate: 10, filter: "blur(14px)" },
      show: {
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
        filter: "blur(0px)",
        transition: pop,
      },
      float: {
        y: [0, -7, 0],
        transition: {
          duration: 4.2,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: 1.8,
        },
      },
      floatAlt: {
        y: [0, 6, 0],
        transition: {
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: 2.1,
        },
      },
    },
    fromLeft: {
      hidden: { opacity: 0, x: -72, y: 24, rotate: -10, filter: "blur(14px)" },
      show: {
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
        filter: "blur(0px)",
        transition: pop,
      },
      float: {
        y: [0, -6, 0],
        transition: {
          duration: 3.6,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: 2,
        },
      },
      floatAlt: {
        y: [0, 5, 0],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: 2.3,
        },
      },
    },
    columnContainer: {
      hidden: {},
      show: { transition: { staggerChildren: 0.14 } },
    },
    cta: {
      hidden: {
        opacity: 0,
        y: 56,
        scale: 0.75,
        rotate: -4,
        filter: "blur(10px)",
      },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotate: 0,
        filter: "blur(0px)",
        transition: snap,
      },
      float: {
        y: [0, -5, 0],
        scale: [1, 1.02, 1],
        transition: {
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: 1.5,
        },
      },
    },
  } satisfies HeroMotionVariants;
}

const HERO_TITLE_LEAD = "Revolução no atendimento automático pelo";
export const HERO_TITLE_ACCENT = "WhatsApp";
export const HERO_TITLE_WORDS = HERO_TITLE_LEAD.split(" ");

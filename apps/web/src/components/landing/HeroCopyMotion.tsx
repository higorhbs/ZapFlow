"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  createHeroVariants,
  HERO_TITLE_ACCENT,
  HERO_TITLE_WORDS,
} from "@/components/landing/hero-motion";
import { TextAnimate } from "@/components/ui/text-animate";
import { APP_DISPLAY_NAME } from "@flowdesk/shared";

function useAnimateIn() {
  const [active, setActive] = useState(false);
  useEffect(() => setActive(true), []);
  return active;
}

export function HeroCopyMotion() {
  const active = useAnimateIn();
  const prefersReduced = useReducedMotion();
  const reduced = Boolean(active && prefersReduced);
  const v = createHeroVariants(reduced);
  const motionKey = active ? "run" : "idle";
  const enterKey = (id: string) => `${id}-${motionKey}`;
  const enter = () => ({
    initial: active ? ("hidden" as const) : false,
    animate: active ? ("show" as const) : undefined,
  });

  return (
    <motion.div
      key={enterKey("copy")}
      className="mx-auto max-w-4xl px-4 text-center sm:px-6"
      variants={v.copyContainer}
      {...enter()}
    >
      <motion.h1
        variants={v.titleContainer}
        className="perspective-[1200px] text-[1.75rem] font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl md:leading-[1.1] lg:text-[3.25rem]"
      >
        {HERO_TITLE_WORDS.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            variants={v.titleWord}
            className="mr-[0.28em] inline-block origin-bottom"
          >
            {word}
          </motion.span>
        ))}
        <TextAnimate
          as="span"
          by="character"
          animation="blurInUp"
          startOnView={false}
          once
          delay={HERO_TITLE_WORDS.length * 0.055 + 0.12}
          duration={0.45}
          className="inline-block text-primary"
          accessible={false}
        >
          {HERO_TITLE_ACCENT}
        </TextAnimate>
      </motion.h1>
      <motion.p
        variants={v.subtitle}
        className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg"
      >
        Automatize seu atendimento no WhatsApp com IA. O {APP_DISPLAY_NAME} responde
        clientes, agenda horários, envia confirmações, cobra via PIX e publica
        stories automaticamente.
      </motion.p>
    </motion.div>
  );
}

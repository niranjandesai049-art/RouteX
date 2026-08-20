"use client";

import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 0.5], [20, 0]);
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5],
    isMobile ? [0.75, 0.92] : [1.05, 1]
  );
  const translate = useTransform(scrollYProgress, [0, 0.5], [0, -40]);

  return (
    <div
      ref={containerRef}
      className="h-[50rem] md:h-[70rem] flex items-center justify-center relative p-2 md:p-10 overflow-hidden bg-[#020617] text-white"
    >
      <div
        className="py-10 md:py-20 w-full relative max-w-7xl mx-auto"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translateY={translate}>{titleComponent}</Header>
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translateY,
  children,
}: {
  translateY: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        translateY,
      }}
      className="max-w-5xl mx-auto text-center z-10 relative mb-4 md:mb-8"
    >
      {children}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-6xl -mt-6 md:-mt-8 mx-auto h-[28rem] sm:h-[34rem] md:h-[42rem] w-full border border-slate-800/80 p-2 md:p-4 bg-slate-900/90 rounded-[24px] md:rounded-[32px] shadow-2xl backdrop-blur-xl"
    >
      <div className="h-full w-full overflow-hidden rounded-[16px] md:rounded-[24px] bg-slate-950 border border-slate-800">
        {children}
      </div>
    </motion.div>
  );
};

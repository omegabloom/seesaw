"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface OrderCelebrationProps {
  amount: string;
  orderName: string;
  customerName: string;
  onComplete: () => void;
}

// Party animals that will dance around
const PARTY_ANIMALS = ["🦄", "🐻", "🦊", "🐰", "🐼", "🦁", "🐯", "🐸", "🐵", "🐷", "🐮", "🦋", "🐙", "🦀"];

// Confetti colors
const CONFETTI_COLORS = [
  "#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#9400d3",
  "#ff69b4", "#00ffff", "#ffd700", "#ff1493", "#00fa9a", "#ff6347", "#7fff00"
];

export function OrderCelebration({ amount, orderName, customerName, onComplete }: OrderCelebrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const animalsRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; color: string; left: number; delay: number; duration: number; rotation: number; size: number }>>([]);
  const [animals, setAnimals] = useState<Array<{ id: number; emoji: string; left: number; delay: number }>>([]);

  useEffect(() => {
    // Generate confetti pieces
    const pieces = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 720 - 360,
      size: 8 + Math.random() * 12,
    }));
    setConfettiPieces(pieces);

    // Generate party animals
    const partyAnimals = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: PARTY_ANIMALS[Math.floor(Math.random() * PARTY_ANIMALS.length)],
      left: 5 + (i * 8),
      delay: Math.random() * 0.3,
    }));
    setAnimals(partyAnimals);
  }, []);

  useEffect(() => {
    if (!containerRef.current || confettiPieces.length === 0) return;

    const tl = gsap.timeline({
      onComplete: () => {
        // Fade out everything
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.5,
          ease: "power2.inOut",
          onComplete,
        });
      },
    });

    // Initial state
    gsap.set(amountRef.current, { scale: 0, opacity: 0, rotation: -10 });
    gsap.set(detailsRef.current, { y: 50, opacity: 0 });
    gsap.set(".confetti-piece", { y: -100, opacity: 0 });
    gsap.set(".party-animal", { scale: 0, y: 100, opacity: 0 });

    // Explosion entrance for amount
    tl.to(amountRef.current, {
      scale: 1,
      opacity: 1,
      rotation: 0,
      duration: 0.6,
      ease: "back.out(1.7)",
    });

    // Confetti burst
    tl.to(".confetti-piece", {
      y: "random(100vh, 150vh)",
      opacity: 1,
      rotation: "random(-360, 360)",
      duration: "random(2, 4)",
      ease: "power1.out",
      stagger: {
        each: 0.01,
        from: "random",
      },
    }, "-=0.4");

    // Party animals bounce in
    tl.to(".party-animal", {
      scale: 1,
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: "back.out(2)",
      stagger: 0.05,
    }, "-=2");

    // Animals dance (bounce animation)
    tl.to(".party-animal", {
      y: -30,
      duration: 0.3,
      ease: "power2.out",
      stagger: {
        each: 0.05,
        repeat: 5,
        yoyo: true,
      },
    }, "-=1.5");

    // Amount pulse
    tl.to(amountRef.current, {
      scale: 1.1,
      duration: 0.2,
      ease: "power2.out",
      yoyo: true,
      repeat: 3,
    }, "-=2");

    // Show order details
    tl.to(detailsRef.current, {
      y: 0,
      opacity: 1,
      duration: 0.4,
      ease: "power2.out",
    }, "-=1");

    // Hold for a moment
    tl.to({}, { duration: 1.5 });

    // Cleanup
    return () => {
      tl.kill();
    };
  }, [confettiPieces, onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Confetti container */}
      <div ref={confettiRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="confetti-piece absolute"
            style={{
              left: `${piece.left}%`,
              top: -20,
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              borderRadius: "2px",
            }}
          />
        ))}
      </div>

      {/* Party animals */}
      <div ref={animalsRef} className="absolute bottom-20 left-0 right-0 flex justify-center gap-4 pointer-events-none">
        {animals.map((animal) => (
          <div
            key={animal.id}
            className="party-animal text-6xl md:text-7xl"
            style={{ animationDelay: `${animal.delay}s` }}
          >
            {animal.emoji}
          </div>
        ))}
      </div>

      {/* Celebration text */}
      <div className="relative z-10 text-center">
        {/* "NEW ORDER" burst */}
        <div className="mb-4">
          <span className="text-2xl md:text-3xl font-bold text-yellow-400 tracking-widest animate-pulse">
            🎉 NEW ORDER! 🎉
          </span>
        </div>

        {/* Amount - the star of the show */}
        <div ref={amountRef} className="mb-6">
          <span className="text-7xl md:text-9xl lg:text-[12rem] font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
            {amount}
          </span>
        </div>

        {/* Order details */}
        <div ref={detailsRef} className="space-y-2">
          <div className="text-xl md:text-2xl text-white/80">
            {orderName}
          </div>
          <div className="text-lg md:text-xl text-white/60">
            from {customerName}
          </div>
        </div>
      </div>

      {/* Radial glow effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* Sparkle effects */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>
    </div>
  );
}

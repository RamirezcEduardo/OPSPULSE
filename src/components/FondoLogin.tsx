"use client";

import { useEffect, useState } from "react";

const FOTOS = [1, 2, 3, 4, 5, 6].map((n) => `/fondos/fondo${n}.webp`);

/** Fondo del login: fundido entre imágenes de logística cada 6 s, con zoom lento. */
export function FondoLogin() {
  const [i, setI] = useState(0);
  const [reducir, setReducir] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducir(mq.matches);
    if (mq.matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % FOTOS.length), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden bg-grafito">
      {FOTOS.map((src, k) => (
        <div key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
          style={{
            backgroundImage: `url(${src})`,
            opacity: k === i ? 1 : 0,
            transform: !reducir && k === i ? "scale(1.08)" : "scale(1)",
            transition: "opacity 1.5s ease-in-out, transform 7s ease-out",
            filter: "blur(1.5px)",
          }} />
      ))}
      {/* capa para que la tarjeta se lea en tema claro y oscuro */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F151E]/55 via-[#0F151E]/35 to-[#0F151E]/65" />
    </div>
  );
}

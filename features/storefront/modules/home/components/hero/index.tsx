"use client";

import { ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { DotsShader } from "../dots-shader";
import LocalizedClientLink from "@/features/storefront/modules/common/components/localized-client-link";
import { Button } from "@/components/ui/button";

interface HeroProps {
  title?: string;
  description?: string;
  logoColor?: string;
}

const Hero = ({ title, description, logoColor }: HeroProps) => {
  const hueRotation = logoColor || "0";

  return (
    <section className="min-h-[76vh] w-full border-b border-border relative bg-slate-950 overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 45%, rgb(124, 58, 237) 0%, transparent 66%)`,
          filter: `hue-rotate(${hueRotation}deg)`,
        }}
      />

      <div
        style={{ filter: `hue-rotate(${hueRotation}deg)` }}
        className="absolute inset-0"
      >
        <DotsShader
          className="absolute inset-0"
          squareSize={3}
          gridGap={3}
          color="rgb(167, 139, 250)"
          maxOpacity={0.5}
          flickerChance={0.3}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[76vh] max-w-5xl flex-col items-center justify-center gap-7 px-6 py-24 text-center">
        <div className="flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
          <Sparkles className="size-4" /> Powered by YouCam Clothes VTO v4
        </div>
        <div>
          <h1 className="text-balance text-5xl font-bold tracking-[-0.04em] text-white sm:text-7xl">
            {title || "See the look before you cart it."}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-8 text-slate-300 sm:text-xl">
            {description ||
              "FitFront turns product pages into a private virtual fitting room—try a style, compare the result, and keep shopping with confidence."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 bg-white px-7 text-slate-950 hover:bg-violet-100">
            <LocalizedClientLink href="/store">
              <ShoppingBag /> Shop try-on styles
            </LocalizedClientLink>
          </Button>
          <div className="flex items-center justify-center gap-2 px-4 text-sm text-slate-300">
            <ShieldCheck className="size-4 text-emerald-300" /> No photo stored by FitFront
          </div>
        </div>
        <div className="grid w-full max-w-3xl grid-cols-3 gap-3 pt-4 text-left text-xs text-slate-300 sm:text-sm">
          {["Choose any try-on outfit", "Use the demo or your photo", "Compare, select, and cart"].map(
            (step, index) => (
              <div key={step} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <span className="mb-2 block text-violet-300">0{index + 1}</span>
                {step}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import Reveal from "./Reveal.jsx";
import ctaImage from "../../assets/krishibond2.jpeg";

export default function CTASection() {
  return (
    <section className="border-t border-ink/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal>
          <div className="relative rounded-stub bg-canopy-600 text-paper grid lg:grid-cols-2 items-center overflow-visible">
            <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-canopy-500/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 right-1/3 w-72 h-72 rounded-full bg-harvest-400/20 blur-2xl" />

            <div className="relative px-6 sm:px-12 py-14 sm:py-16 text-center lg:text-left">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold">
                Join KrishiBond Today
              </h2>
              <p className="mt-3 text-canopy-50 max-w-md mx-auto lg:mx-0">
                Whether you grow it or need it — start your first assured
                contract in minutes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-stub px-6 py-3 text-sm font-semibold bg-paper text-canopy-700 hover:bg-canopy-50 transition-colors"
                >
                  Register Now <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-stub px-6 py-3 text-sm font-semibold border border-paper/40 text-paper hover:bg-canopy-500 transition-colors"
                >
                  <Search className="w-4 h-4" /> Explore Marketplace
                </Link>
              </div>
            </div>

            {/* Layered showcase card - the process/proof visual, overlapping the banner edge */}
            <div className="relative px-6 sm:px-10 pb-12 lg:pb-0 lg:pr-10">
              <div className="relative lg:-mr-6 lg:translate-y-6">
                <div className="pointer-events-none absolute -top-6 -right-6 w-40 h-40 rounded-3xl bg-harvest-300/30 blur-xl rotate-6 hidden lg:block" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-4 ring-paper/20 rotate-0 lg:rotate-1 hover:rotate-0 hover:scale-[1.02] transition-all duration-500">
                  <img
                    src={ctaImage}
                    alt="KrishiBond assured contract farming process overview: agreement, cultivation, monitoring, collection, and payment, shown alongside a sample contract on a mobile app screen"
                    className="w-full h-56 sm:h-72 lg:h-64 object-cover object-top"
                    loading="lazy"
                    width="1484"
                    height="1058"
                  />
                </div>
                {/* Small decorative accent card peeking from behind, completing the layered look */}
                <div className="hidden lg:block absolute -bottom-5 -left-5 w-28 h-20 rounded-xl bg-harvest-400 -z-10" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import React from 'react';
import { Button } from './UI/Button';
import { ArrowRight } from 'lucide-react';

export const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="relative p-12 lg:p-24 rounded-[40px] overflow-hidden group">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary to-accent transition-all duration-700 group-hover:scale-105" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready to Grow Your Business?
              </h2>
              <p className="text-xl text-white/80 mb-0">
                Book a free demo and see how HAMIX can help you scale.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Button variant="cyan" size="lg" className="px-12 group">
                Book a Demo Now
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

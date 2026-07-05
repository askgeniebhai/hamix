import React from 'react';
import { Button } from './UI/Button';
import { ArrowRight, Play, CheckCircle2, Shield, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const Hero = () => {
  return (
    <section className="relative pt-40 pb-24 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 -z-10" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 -z-10" />

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              One AI Platform.<br />
              Every Business.<br />
              <span className="text-gradient">Limitless Growth.</span>
            </h1>
            <p className="text-xl text-white/60 mb-10 max-w-lg leading-relaxed">
              HAMIX helps you find new customers, automate outreach, and turn leads into revenue — all on autopilot.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 mb-12">
              <Button size="lg" className="group w-full sm:w-auto">
                Book a Demo
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <button className="flex items-center gap-3 text-white font-semibold hover:text-primary transition-colors group">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-primary transition-colors">
                    <Play className="w-4 h-4 fill-white group-hover:fill-primary transition-colors" />
                </div>
                See How It Works
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                    { icon: CheckCircle2, text: 'No Credit Card Required' },
                    { icon: Clock, text: '14 Day Free Trial' },
                    { icon: Zap, text: 'Quick Setup' },
                    { icon: Shield, text: 'Secure & Reliable' }
                ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center sm:items-start gap-2">
                        <item.icon className="w-5 h-5 text-primary" />
                        <span className="text-xs text-white/50 font-medium">{item.text}</span>
                    </div>
                ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {/* Abstract Orb Visualization */}
            <div className="relative w-full aspect-square flex items-center justify-center">
                <div className="absolute w-[80%] h-[80%] rounded-full border border-primary/30 animate-[pulse_4s_infinite]" />
                <div className="absolute w-[60%] h-[60%] rounded-full border border-accent/20 animate-[pulse_6s_infinite]" />
                <div className="absolute w-full h-full rounded-full border border-white/5 animate-[spin_20s_linear_infinite]" />
                <div className="absolute w-full h-full rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]" />

                <div className="w-40 h-40 bg-background border border-white/10 rounded-full flex items-center justify-center purple-glow z-10 shadow-[0_0_100px_rgba(109,40,217,0.3)]">
                    <span className="text-7xl font-black italic tracking-tighter text-white">H</span>
                </div>

                {/* Orbiting particles simulation */}
                <div className="absolute top-1/4 right-0 w-4 h-4 bg-primary rounded-full blur-sm animate-bounce" />
                <div className="absolute bottom-1/4 left-0 w-3 h-3 bg-accent rounded-full blur-sm animate-pulse" />
            </div>
          </motion.div>
        </div>

        {/* Ticker Section */}
        <div className="mt-32 pt-16 border-t border-white/5">
            <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-white/30 mb-10">Trusted by growing businesses across India</p>
            <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20 opacity-40 grayscale">
                <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6" />
                    <span className="font-bold">NFS</span>
                    <span className="text-[10px]">Neela Security Force</span>
                </div>
                <div className="font-bold tracking-tight">UrbanStays <span className="font-normal text-[10px] block opacity-60">Real Estate</span></div>
                <div className="font-bold tracking-tight">Royal Café <span className="font-normal text-[10px] block opacity-60">Restaurant</span></div>
                <div className="font-bold tracking-tight text-xl italic">SunCare <span className="font-normal text-[10px] block opacity-60">Hospital</span></div>
                <div className="font-bold tracking-tight">BrightKids <span className="font-normal text-[10px] block opacity-60">School</span></div>
                <div className="text-primary font-bold">and 500+ more</div>
            </div>
        </div>
      </div>
    </section>
  );
};

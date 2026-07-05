import React from 'react';
import { Home, ShoppingCart, Hospital, School, Utensils, UserCheck, Briefcase, Plus } from 'lucide-react';

export const SolutionsSection = () => {
  const industries = [
    { icon: Home, name: 'Real Estate' },
    { icon: ShoppingCart, name: 'Retail Stores' },
    { icon: Hospital, name: 'Hospitals' },
    { icon: School, name: 'Schools' },
    { icon: Utensils, name: 'Restaurants' },
    { icon: UserCheck, name: 'Consultants' },
    { icon: Briefcase, name: 'Agencies' },
    { icon: Plus, name: '& More' },
  ];

  return (
    <section id="solutions" className="py-32 bg-white/[0.02]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4 block">Built for every industry</span>
            <h2 className="text-4xl font-bold">Tailored Solutions for Local Businesses</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {industries.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                        <item.icon className="w-6 h-6 text-white/40 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-semibold text-white/40 group-hover:text-white transition-colors">{item.name}</span>
                </div>
            ))}
        </div>

        <div className="mt-20">
            <div className="glass p-12 flex flex-col md:flex-row items-center gap-12">
                <div className="text-4xl text-primary font-serif">“</div>
                <div className="flex-1">
                    <p className="text-xl text-white/80 italic mb-8">
                        HAMIX transformed the way we find and engage customers. Our leads and revenue have grown faster than ever before.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <Utensils className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold">Royal Café</h4>
                            <p className="text-xs text-white/40">Restaurant • ★★★★★</p>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

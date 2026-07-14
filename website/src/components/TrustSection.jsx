import React, { useState, useEffect } from 'react';

const AnimatedCounter = ({ value, label }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    const duration = 2000;
    let timer = setInterval(() => {
      start += Math.ceil(end / 100);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, duration / 100);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="text-center">
      <div className="text-5xl font-black text-white mb-2">{count.toLocaleString()}+</div>
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">{label}</div>
    </div>
  );
};

export const TrustSection = () => {
  const stats = [
    { value: '5000', label: 'Businesses Connected' },
    { value: '250000', label: 'Leads Processed' },
    { value: '15000', label: 'Campaigns Created' },
    { value: '120000', label: 'Hours Saved' },
  ];

  return (
    <section className="py-32 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
          {stats.map((stat, idx) => (
            <AnimatedCounter key={idx} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
};

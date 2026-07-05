import React from 'react';
import { Shield, Mail, Phone, ArrowRight } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background pt-24 pb-12 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 lg:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold tracking-tighter">HAMIX</span>
            </div>
            <p className="text-white/50 mb-8 max-w-xs">
              AI-powered business operating system. Helping businesses find customers, automate outreach, and grow revenue with the power of AI.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-all group cursor-pointer">
                <span className="text-white/50 group-hover:text-white font-bold">in</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-all group cursor-pointer">
                <span className="text-white/50 group-hover:text-white font-bold">ig</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-all group cursor-pointer">
                <span className="text-white/50 group-hover:text-white font-bold">x</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-all group cursor-pointer">
                <span className="text-white/50 group-hover:text-white font-bold">fb</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-all group cursor-pointer">
                <span className="text-white/50 group-hover:text-white font-bold">yt</span>
              </div>
            </div>
            <p className="text-white/30 text-xs mt-4">@askgeniebhai</p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">Solutions</a></li>
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">AI Advisor</a></li>
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <a href="tel:8310457215" className="text-white/50 hover:text-white transition-colors">8310457215</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <a href="mailto:hello.geniebhai@gmail.com" className="text-white/50 hover:text-white transition-colors">hello.geniebhai@gmail.com</a>
              </li>
            </ul>
            <div className="mt-8">
                <h4 className="text-white font-bold mb-4">Stay Updated</h4>
                <div className="relative">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-6 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                    <button className="absolute right-2 top-1.5 bg-primary p-1.5 rounded-full hover:bg-primary-dark transition-all">
                        <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">Guides</a></li>
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">Webinars</a></li>
              <li><a href="#" className="text-white/50 hover:text-white transition-colors">API</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-white/30 text-sm">© {currentYear} HAMIX. All rights reserved.</p>
          <div className="flex items-center gap-8 text-sm">
            <a href="#" className="text-white/30 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/30 hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

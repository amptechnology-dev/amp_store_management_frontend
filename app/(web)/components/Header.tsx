'use client';

import React from 'react';
import { Button } from 'primereact/button';
import Link from 'next/link';

interface HeaderProps {
  onLoginClick: () => void;
}

export default function Header({ onLoginClick }: HeaderProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md">
              AMP
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">AMP Shopping</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Best Deals Daily</p>
            </div>
          </div>
          <Link href="#">
            <Button
              label="Login"
              icon="pi pi-sign-in"
              onClick={onLoginClick}
              className="w-auto"
              style={{
                background: 'linear-gradient(120deg, #fbbf24, #f59e0b)',
                border: 'none',
                color: '#fff',
                fontWeight: '600',
              }}
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}

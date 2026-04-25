import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface InteractiveScaleProps {
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  units?: string[];
  onChange?: (value: number, unit: string) => void;
  label?: string;
}

const InteractiveScale: React.FC<InteractiveScaleProps> = ({
  min = 100,
  max = 220,
  step = 1,
  defaultValue = 160,
  unit: initialUnit = 'cm',
  units = ['cm', 'pol'],
  onChange,
  label = 'Arraste para selecionar'
}) => {
  const [currentUnit, setCurrentUnit] = useState(initialUnit);
  const [value, setValue] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Constants for the ruler
  const itemWidth = 10; // pixels per step
  const range = max - min;
  const totalWidth = (range / step) * itemWidth;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const newValue = Math.round(scrollLeft / itemWidth) * step + min;
    const clampedValue = Math.min(Math.max(newValue, min), max);
    setValue(clampedValue);
    onChange?.(clampedValue, currentUnit);
  };

  useEffect(() => {
    if (scrollRef.current) {
      const initialScroll = (defaultValue - min) / step * itemWidth;
      scrollRef.current.scrollLeft = initialScroll;
    }
  }, []);

  return (
    <div className="w-full flex flex-col items-center space-y-8 select-none">
      {/* Unit Toggle */}
      {units && units.length > 1 && (
        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
          {units.map((u) => (
            <button
              key={u}
              onClick={() => setCurrentUnit(u)}
              className={`px-6 py-1.5 rounded-full text-sm font-black transition-all ${
                currentUnit === u 
                ? 'bg-emerald-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      {/* Value Display */}
      <div className="flex items-baseline gap-1">
        <span className="text-7xl font-black text-slate-900 tracking-tighter">
          {value}
        </span>
        <span className="text-2xl font-black text-slate-300 uppercase tracking-tight">
          {currentUnit}
        </span>
      </div>

      {/* Ruler Container */}
      <div className="relative w-full max-w-md h-40 flex flex-col items-center justify-center">
        {/* Center Indicator */}
        <div className="absolute top-0 bottom-0 w-1 bg-emerald-500 z-10 rounded-full flex flex-col items-center">
          <div className="w-4 h-4 bg-emerald-500 rounded-full -mt-2" />
          <div className="flex-1" />
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-emerald-500" />
        </div>

        {/* Scrollable Ruler */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full overflow-x-auto no-scrollbar flex items-center px-[50%] h-full cursor-grab active:cursor-grabbing"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          <div 
            className="flex items-end h-24 relative" 
            style={{ width: totalWidth, minWidth: totalWidth }}
          >
            {Array.from({ length: (max - min) / step + 1 }).map((_, i) => {
              const val = min + i * step;
              const isMajor = val % 10 === 0;
              const isMedium = val % 5 === 0;
              
              return (
                <div 
                  key={val}
                  className="flex flex-col items-center justify-end shrink-0"
                  style={{ width: itemWidth, scrollSnapAlign: 'center' }}
                >
                  {isMajor && (
                    <span className="text-[10px] font-black text-slate-400 mb-6 absolute -translate-y-12">
                      {val}
                    </span>
                  )}
                  <div className={`
                    w-px rounded-full bg-slate-200 transition-colors
                    ${isMajor ? 'h-12 bg-slate-300' : isMedium ? 'h-8' : 'h-4'}
                  `} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-sm font-bold text-slate-400 animate-pulse">
        {label}
      </p>

      {/* Info Box */}
      <div className="w-full bg-slate-50 border border-slate-100 p-5 rounded-[2rem] flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-700 leading-snug">
          Esta informação é essencial para calcular os resultados personalizados para o seu perfil.
        </p>
      </div>
    </div>
  );
};

export default InteractiveScale;

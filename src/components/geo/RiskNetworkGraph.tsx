/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RefObject } from 'react';
import { HelpCircle, Maximize, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface RiskNetworkGraphProps {
  svgRef: RefObject<SVGSVGElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  dimensions: { width: number; height: number };
}

export default function RiskNetworkGraph({ svgRef, containerRef, dimensions }: RiskNetworkGraphProps) {
  return (
    <div className="lg:col-span-2 card bg-[#0b0f19] border-slate-900 p-5 flex flex-col justify-between relative text-slate-100 overflow-hidden">

      {/* Legend controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800/80 pb-3 mb-4 z-10 relative">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 border border-red-500"></span>
            <span className="text-slate-300">محافظة/مدينة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-slate-300">هوية مشتبه بها جداً</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-300">هوية متوسطة المخاطر</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500"></span>
            <span className="text-slate-300">منفذ التحقق المركزي</span>
          </div>
        </div>

        {/* View Status */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-[11px] text-slate-400 font-bold">بيانات حية من قاعدة البيانات</span>
        </div>
      </div>

      {/* D3 Canvas wrapper with resizing elements */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden bg-slate-950/80 border border-slate-900 flex items-center justify-center min-h-[360px] cursor-grab"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full block"
        />

        {/* Float overlays: Navigation zoom controls */}
        <div className="absolute left-3 bottom-3 flex flex-col gap-1.5 z-20">
          <button
            type="button"
            onClick={() => window.zoomInGraph?.()}
            className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
            title="تكبير"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={() => window.zoomOutGraph?.()}
            className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
            title="تصغير"
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={() => window.zoomResetGraph?.()}
            className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
            title="إعادة التمركز"
          >
            <Maximize size={18} />
          </button>
          <button
            type="button"
            onClick={() => window.zoomRestartPhysics?.()}
            className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
            title="تنشيط الجاذبية"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Interactive Help Hint overlay label */}
        <div className="absolute right-3 top-3 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono select-none">
          <HelpCircle size={10} className="text-secondary" />
          <span>جرّب سحب العقد وتحريكها بيدك بالماوس</span>
        </div>
      </div>
    </div>
  );
}
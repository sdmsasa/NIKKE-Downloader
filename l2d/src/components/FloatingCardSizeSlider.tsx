import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Sliders, RotateCcw } from 'lucide-react';

interface FloatingCardSizeSliderProps {
  cardSize: number; // 120 ~ 320 px
  onChangeCardSize: (size: number) => void;
  onResetCardSize: () => void;
  disabled?: boolean;
}

export const FloatingCardSizeSlider: React.FC<FloatingCardSizeSliderProps> = ({
  cardSize,
  onChangeCardSize,
  onResetCardSize,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (disabled) return null;

  const handleZoomOut = () => {
    onChangeCardSize(Math.max(120, cardSize - 20));
  };

  const handleZoomIn = () => {
    onChangeCardSize(Math.min(320, cardSize + 20));
  };

  // Label for current size
  const getSizeLabel = () => {
    if (cardSize <= 135) return '아주 작게';
    if (cardSize <= 165) return '작게';
    if (cardSize <= 200) return '보통';
    if (cardSize <= 250) return '크게';
    return '아주 크게';
  };

  return (
    <div className="fixed right-4 bottom-8 z-40 flex flex-col items-end gap-2 select-none animate-in fade-in slide-in-from-right-4 duration-200">
      
      {/* Expanded Control Box */}
      {isOpen && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#1c1c1c]/95 backdrop-blur-md border border-[#333333] shadow-2xl shadow-black/80 w-64 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>카드 크기 조절</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-bold text-orange-400">
              {getSizeLabel()} ({cardSize}px)
            </span>
          </div>

          {/* Slider Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] text-neutral-300 hover:text-white transition-colors"
              title="축소"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={120}
              max={320}
              step={10}
              value={cardSize}
              onChange={(e) => onChangeCardSize(Number(e.target.value))}
              className="flex-1 accent-orange-500 bg-[#282828] h-1.5 rounded-lg cursor-pointer"
            />

            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] text-neutral-300 hover:text-white transition-colors"
              title="확대"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-5 gap-1 pt-1 border-t border-[#2a2a2a] text-[10px]">
            {[
              { label: 'XS', val: 130 },
              { label: 'S', val: 155 },
              { label: 'M', val: 185 },
              { label: 'L', val: 230 },
              { label: 'XL', val: 290 }
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => onChangeCardSize(preset.val)}
                className={`py-1 rounded font-medium transition-all ${
                  Math.abs(cardSize - preset.val) <= 15
                    ? 'bg-orange-500 text-white font-bold'
                    : 'bg-[#282828] hover:bg-[#333333] text-neutral-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Reset button */}
          <div className="flex justify-end pt-1">
            <button
              onClick={onResetCardSize}
              className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>기본 크기로 초기화 (185px)</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full backdrop-blur-md border shadow-xl shadow-black/70 transition-all duration-200 ${
          isOpen
            ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/25 scale-105'
            : 'bg-[#1c1c1c]/90 hover:bg-[#262626] text-neutral-200 border-[#333333] hover:border-neutral-500'
        }`}
        title="카드 크기 조절"
      >
        <Sliders className={`w-4 h-4 ${isOpen ? 'rotate-90' : ''} transition-transform duration-200`} />
        <span className="text-xs font-semibold">
          {isOpen ? '크기 닫기' : `크기: ${getSizeLabel()}`}
        </span>
      </button>

    </div>
  );
};

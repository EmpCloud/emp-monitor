import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";

function ProductivitySlider({ minValue, maxValue, onMinChange, onMaxChange }) {
    const { t } = useTranslation();
    const handleMinChange = useCallback(
        (e) => {
            const val = Math.min(Number(e.target.value), maxValue - 1);
            onMinChange(Math.max(0, val));
        },
        [maxValue, onMinChange]
    );

    const handleMaxChange = useCallback(
        (e) => {
            const val = Math.max(Number(e.target.value), minValue + 1);
            onMaxChange(Math.min(100, val));
        },
        [minValue, onMaxChange]
    );

    return (
        <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("productivityTracker")}
            </label>
            <div className="relative pt-8">
                {/* Min tooltip */}
                <div
                    className="absolute top-0 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none"
                    style={{
                        left: `${minValue}%`,
                        transform: "translateX(-50%)",
                    }}
                >
                    {minValue}
                </div>

                {/* Max tooltip */}
                <div
                    className="absolute top-0 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none"
                    style={{
                        left: `${maxValue}%`,
                        transform: "translateX(-50%)",
                    }}
                >
                    {maxValue}
                </div>

                {/* Track background */}
                <div className="relative h-2 rounded-full bg-slate-200">
                    {/* Active range fill */}
                    <div
                        className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-sky-300"
                        style={{
                            left: `${minValue}%`,
                            width: `${maxValue - minValue}%`,
                        }}
                    />
                </div>

                {/* Min range input */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={minValue}
                    onChange={handleMinChange}
                    className="absolute inset-0 top-8 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                />

                {/* Max range input */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={maxValue}
                    onChange={handleMaxChange}
                    className="absolute inset-0 top-8 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                />

                {/* Labels */}
                <div className="flex justify-between mt-3">
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                        0
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                        100
                    </span>
                </div>
            </div>
        </div>
    );
}

export default React.memo(ProductivitySlider);

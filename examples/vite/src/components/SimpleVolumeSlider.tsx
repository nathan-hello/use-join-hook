import { useVolume } from "@/hooks/use-volume";
import { useState, useRef, useEffect } from "react";

export function SimpleVolumeSlider({ className }: { className?: string; }) {
    const volume = useVolume({
        choices: [
            { id: 1, mute: true, name: "Room Speakers" },
            { id: 2, mute: false, name: "Teams Volume" }
        ]
    });

    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = parseInt(event.target.value);
        const rounded = Math.floor(value / 5) * 5;
        volume.level.update.manual(rounded);
        if (volume.mute.state && rounded > 0) {
            volume.mute.update(false);
        }
    }

    function updateVolumeFromPosition(clientY: number) {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const clickY = clientY - rect.top;
        const height = rect.height;
        const percentage = Math.max(0, Math.min(100, ((height - clickY) / height) * 100));
        const rounded = Math.floor(percentage / 5) * 5;
        volume.level.update.manual(rounded);
        if (volume.mute.state && rounded > 0) {
            volume.mute.update(false);
        }
    }

    function handleMouseDown(e: React.MouseEvent) {
        e.preventDefault();
        setIsDragging(true);
        updateVolumeFromPosition(e.clientY);
    }

    function handleMouseMove(e: MouseEvent) {
        if (isDragging) {
            updateVolumeFromPosition(e.clientY);
        }
    }

    function handleMouseUp() {
        setIsDragging(false);
    }

    function handleClick(e: React.MouseEvent) {
        if (!isDragging) {
            updateVolumeFromPosition(e.clientY);
        }
    }

    // Touch event handlers
    function handleTouchStart(e: React.TouchEvent) {
        e.preventDefault();
        setIsDragging(true);
        const touch = e.touches[0];
        updateVolumeFromPosition(touch.clientY);
    }

    function handleTouchMove(e: TouchEvent) {
        if (isDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            updateVolumeFromPosition(touch.clientY);
        }
    }

    function handleTouchEnd() {
        setIsDragging(false);
    }

    // Add global mouse and touch event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [isDragging]);

    function handleVolumeUp() {
        volume.level.update.increment();
    }

    function handleVolumeDown() {
        volume.level.update.decrement();
    }

    function handleMuteToggle() {
        volume.mute.toggle();
    }

    return (
        <div className={`flex  flex-col items-center p-2 bg-white border border-gray-200 shadow-md rounded-xl gap-y-2 m-auto w-[40%] h-[75%] ${className || ''}`}>
            <div className="mb-4 w-full">
                <select
                    className="px-4 py-2 w-full text-xl font-bold text-center text-gray-700 bg-white rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={volume.device.state?.id || ""}
                    onChange={(e) => {
                        const selected = volume.device.choices.find(c => c.id === parseInt(e.target.value));
                        if (selected) {
                            volume.device.update(selected);
                        }
                    }}
                >
                    {volume.device.choices.map(choice => (
                        <option key={choice.id} value={choice.id}>
                            {choice.name}
                        </option>
                    ))}
                </select>
            </div>

            <button
                className="flex justify-center items-center w-16 h-16 bg-white rounded-sm border border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleVolumeUp}
                aria-label="Volume Up"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>

            <div className="flex relative flex-col justify-center items-center h-64">
                <div className="py-2 mx-auto my-auto mb-4 text-lg font-medium text-gray-700">
                    {volume.mute.state ? "Muted" : `${volume.level.state}%`}
                </div>

                <div
                    ref={sliderRef}
                    className="relative w-6 h-full cursor-pointer select-none"
                    onMouseDown={handleMouseDown}
                    onClick={handleClick}
                    onTouchStart={handleTouchStart}
                >
                    {/* Background track */}
                    <div className="absolute inset-0 w-6 bg-gray-200 rounded-full"></div>

                    {/* Filled track */}
                    <div
                        className="absolute bottom-0 w-6 bg-blue-500 rounded-full transition-all duration-200"
                        style={{
                            height: `${volume.mute.state ? 0 : volume.level.state}%`,
                            minHeight: '4px'
                        }}
                    />

                    {/* Slider thumb */}
                    <div
                        className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"
                        style={{
                            bottom: `${volume.mute.state ? 0 : volume.level.state}%`,
                            left: '50%',
                            transform: 'translateX(-50%) translateY(50%)'
                        }}
                    />

                    {/* Hidden range input for keyboard navigation */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={volume.mute.state ? 0 : volume.level.state}
                        onChange={handleVolumeChange}
                        className="sr-only"
                        aria-label="Volume slider"
                    />
                </div>
            </div>

            <button
                className="flex justify-center items-center mt-2 w-16 h-16 bg-white rounded-sm border border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleVolumeDown}
                aria-label="Volume Down"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
            </button>

            {volume.device.state?.mute && (
                <button
                    className={`w-16 h-16 border border-gray-400 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center ${volume.mute.state
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700'
                        }`}
                    onClick={handleMuteToggle}
                    aria-label={volume.mute.state ? "Unmute" : "Mute"}
                >
                    {volume.mute.state ? (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
} 
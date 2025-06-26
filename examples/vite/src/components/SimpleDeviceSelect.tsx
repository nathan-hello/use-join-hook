import { useState, useRef, useEffect } from "react";

export type TDevice = { id: number; name: string; };

export function SimpleDeviceSelect<T extends TDevice>({
    device,
    handleChange,
    choices
}: {
    device: T | undefined,
    handleChange: (n: T) => void;
    choices: T[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (choices === undefined) {
        return (
            <button className="flex justify-between px-4 py-2 mb-4 w-full font-bold text-center text-gray-700 truncate bg-white rounded-md border border-gray-300 cursor-not-allowed">
                <span className="mx-auto">No Device Found</span>
            </button>
        );
    }

    if (choices.length === 1) {
        return (
            <button className="flex justify-between px-4 py-2 mb-4 w-full font-bold text-center text-gray-700 truncate bg-white rounded-md border border-gray-300">
                <span className="mx-auto">{device ? device.name : "No Device Found"}</span>
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="flex justify-between px-4 py-2 mb-4 w-full text-xl font-bold text-center text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="mx-auto">{device ? device.name : "Choose device"}</span>
                <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="overflow-y-auto absolute z-10 mt-1 w-full max-h-60 bg-white rounded-md border border-gray-300 shadow-lg">
                    {choices.map(choice => (
                        <button
                            key={`dk-${choice.id}`}
                            className={`w-full py-4 px-4 text-center font-semibold border-b border-gray-200 last:border-none hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${device?.id === choice.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                            onClick={() => {
                                handleChange(choice);
                                setIsOpen(false);
                            }}
                        >
                            {choice.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
} 
import { Volume2, VolumeX, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useVolume } from "@/hooks/use-volume";
import { DeviceSelect } from "@/components/DeviceSelect";

export function VolumeSlider({ className }: { className?: string; }) {

    const volume = useVolume({ choices: [{ id: 1, mute: true, name: "Room Speakers" }, { id: 2, mute: false, name: "Teams Volume" }] });

    function handleVolumeChange(v: number[]) {
        const num = v.at(0) ?? 0;
        const rounded = Math.floor(num / 5) * 5;
        volume.level.update.manual(rounded);
        if (volume.mute.state && rounded > 0) {
            volume.mute.update(false);
        }
    };

    return (
        <div className={cn(
            "flex h-full flex-col items-center w-full p-2 bg-white border border-gray-200 shadow-md rounded-xl gap-y-2",
            "m-auto w-[40%] h-[75%]"
        )}>
            <DeviceSelect device={volume.device.state} handleChange={volume.device.update} choices={volume.device.choices} />
            {/* <h2 className="mb-2 text-lg font-semibold text-center text-gray-800">{label}</h2> */}
            <Button
                variant="outline"
                size="icon"
                className="w-16 h-16 border-gray-400 rounded-sm"
                onClick={() => volume.level.update.increment()}
                aria-label="Volume Up"
            >
                <Plus className="w-8 h-8" />
            </Button>

            <div className="relative flex flex-col items-center justify-center h-64">
                <div className="py-2 mx-auto my-auto mb-4 text-lg font-medium text-gray-700">
                    {volume.mute.state ? "Muted" : `${volume.level.state}%`}
                </div>
                <Slider
                    value={[volume.mute.state ? 0 : volume.level.state]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    orientation="vertical"
                    className="flex-col-reverse w-6 h-full "
                >
                </Slider>
            </div>

            <Button
                variant="outline"
                size="icon"
                className="w-16 h-16 mt-2 border-gray-400 rounded-sm "
                onClick={() => volume.level.update.decrement()}
                aria-label="Volume Down"
            >
                <Minus className="w-8 h-8" />
            </Button>

            {volume.device.state?.mute &&
                <Button
                    variant={volume.mute.state ? "destructive" : "outline"}
                    size="icon"
                    className="w-16 h-16 border-gray-400 rounded-sm"
                    onClick={() => volume.mute.toggle()}
                    aria-label={volume.mute.state ? "Unmute" : "Mute"}
                >
                    {volume.mute.state ? (
                        <VolumeX className="w-8 h-8" />
                    ) : (
                        <Volume2 className="w-8 h-8" />
                    )}
                </Button>
            }

        </div>
    );
};


import { Volume2, VolumeX, Plus, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useJoin } from "use-join";
import { J } from "@/utils/joins";

export function VolumeControl({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [up, pubUp] = useJoin(J.Audio.Control.Volume.Up);
  const [down, pubDown] = useJoin(J.Audio.Control.Volume.Down);
  const [volume, setVolume] = useJoin(J.Audio.Control.Volume.Level);
  const [isMuted, setIsMuted] = useJoin(J.Audio.Control.Mute);

  console.table({ up, down, volume, isMuted });

  const handleVolumeChange = (newValue: number[]) => {
    setVolume(newValue[0]);
  };

  const handleMuteToggle = () => {
    setIsMuted(true);
  };

  const increaseVolume = () => {
    pubUp(true);

  };

  const decreaseVolume = () => {
    pubDown(true);
  };

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)} {...props}>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={decreaseVolume} disabled={volume === 0}>
          <Minus className="h-4 w-4" />
          <span className="sr-only">Decrease volume</span>
        </Button>
        <Button variant="outline" size="icon" onClick={handleMuteToggle}>
          {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
        </Button>
        <Button variant="outline" size="icon" onClick={increaseVolume} disabled={volume === 100}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">Increase volume</span>
        </Button>
      </div>
      <Slider
        className="w-[200px]"
        value={[isMuted ? 0 : volume]}
        max={100}
        step={1}
        onValueChange={handleVolumeChange}
      />
      <div className="text-center">Volume: {isMuted ? "Muted" : `${volume}%`}</div>
    </div>
  );
}


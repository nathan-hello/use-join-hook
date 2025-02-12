import { J } from "@/utils/joins";
import { useJoin } from "use-join";

function useVolume() {
    const [, pubUp] = useJoin(J.Audio.Control.Volume.Up);
    const [, pubDown] = useJoin(J.Audio.Control.Volume.Down);
    const [level, pubLevel] = useJoin(J.Audio.Control.Volume.Level);
    const [mute, pubMute] = useJoin(J.Audio.Control.Mute);

    const [inUse, pubInUse] = useJoin(J.Audio.Management.InUse);

    const [, pubGlobalMute] = useJoin(J.Audio.Control.GlobalMute);


}
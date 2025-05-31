import { J } from "@/utils/joins";
import { useJoin } from "use-join";

type TVolume = {
  id: number;
  name: string;
  mute: boolean;
};
const VOLUME_UNDEFINED: TVolume = {
  id: 0,
  mute: false,
  name: "No Device Found",
};

export function useVolume({ choices }: { choices: TVolume[] }) {
  const [vol, pubVol] = useJoin(J.Audio.Control.Level);
  const [mute, pubMute] = useJoin(J.Audio.Control.Mute);
  const [inUse, pubInUse] = useJoin(J.Audio.Management.InUse);

  function toggleMute() {
    pubMute(true);
  }

  function changeMute(b: boolean) {
    // If the `mute` is already high, it will be true.
    // A subequent call to mute to set it high will be
    // true == true, likewise for setting it low when
    // mute is already low. This only works because the
    // other end of pubMute is a toggle in the SMW program.
    if (b === mute) {
      return;
    }
    toggleMute();
  }

  function volUp() {
    changeMute(false);
    pubVol((v) => v + 5);
  }

  function volDown() {
    changeMute(false);
    if (vol < 5) {
      pubVol(0);
    } else {
      pubVol((v) => v - 5);
    }
  }

  function manualVol(v: number) {
    if (Math.abs(vol - v) > 5) {
      pubVol(v);
    }
  }

  const device =
    inUse === 0 ? VOLUME_UNDEFINED : choices.find((v) => v.id === inUse);
  if (!device) {
    throw Error(
      `Unknown volume of id ${inUse} choices: ${JSON.stringify(choices)}`,
    );
  }

  function update(v: TVolume) {
    pubInUse(v.id);
  }

  return {
    device: { state: device, update: update, choices: choices },
    level: {
      state: vol,
      update: { manual: manualVol, increment: volUp, decrement: volDown },
    },
    mute: { state: mute, update: changeMute, toggle: toggleMute },
  };
}

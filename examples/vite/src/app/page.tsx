import { VolumeControl } from "@/components/VolumeSlider";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-3xl font-bold">Volume Control</h1>
      <VolumeControl />
    </main>
  );
}


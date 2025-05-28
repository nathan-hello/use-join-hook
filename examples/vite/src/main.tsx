import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { VolumeSlider } from '@/components/VolumeSlider';
import { useVolume } from '@/hooks/use-volume';

function App() {

  const volume = useVolume({ choices: [{ id: 1, mute: true, name: "Room Speakers" }, { id: 2, mute: false, name: "Teams Volume" }] });

  return (
    <main className="flex flex-col w-screen h-screen text-3xl text-gray-800">
      <h1 className="my-auto mb-8 text-3xl font-bold text-center">Volume Control</h1>
      <VolumeSlider volume={volume} className='m-auto w-[20%] h-[75%]' />
    </main>
  );
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { VolumeSlider } from '@/components/VolumeSlider';
import { useVolume } from '@/hooks/use-volume';
import { JoinParamsProvider, useJoin } from 'use-join';
import { J, MockControlSystem } from '@/utils/joins';

function App() {

  const volume = useVolume({ choices: [{ id: 1, mute: true, name: "Room Speakers" }, { id: 2, mute: false, name: "Teams Volume" }] });

  const [strings, pubStrings] = useJoin(J.ManyStrings);

  return (
    <main className="flex flex-row justify-between w-screen h-screen text-3xl text-gray-800">
      <div className='flex flex-col w-1/2 m-auto bg-red-500'>
        {strings.map((s, i) => (
          <div className='flex flex-col'>
            <span className='truncate'> Reversed: {s}</span>
            <input className='border-white' onChange={(e) => pubStrings((p) => {
              const copy = [...strings];
              copy[i] = e.target.value;
              return copy;
            })} />
          </div>
        ))}
      </div>
      <div className='flex flex-col w-1/2 h-full'>
        <h1 className="my-auto mb-8 text-3xl font-bold text-center">Volume Control</h1>
        <VolumeSlider volume={volume} className='m-auto w-[40%] h-[75%]' />
      </div>
    </main>
  );
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JoinParamsProvider params={MockControlSystem}>
      <App />
    </JoinParamsProvider>
  </StrictMode>,
);

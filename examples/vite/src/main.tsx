import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { SimpleVolumeSlider } from '@/components/SimpleVolumeSlider';
import { useJoin, JoinParamsProvider, BlockUntilCsigSync } from 'use-join';
import { J, joinParams } from '@/utils/joins';

function App() {
  const [strings, pubStrings] = useJoin(J.ManyStrings);
  const [id, pubId] = useJoin(J.Id);

  return (
    <main className="flex flex-row justify-between px-8 w-screen h-screen text-3xl text-gray-800 bg-white">
      <div className='flex flex-col mx-auto w-1/4'>
        {strings.map((s, i) => (
          <div
            key={`strings-${i}`}
            className='flex flex-col m-auto'>
            <span className='truncate'> Reversed: {s}</span>
            <input
              type='text'
              placeholder='Enter text...'
              className="p-2 placeholder-gray-400 text-black rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => pubStrings((p) => {
                const arr: (string | undefined)[] = new Array(p.length).fill(undefined);
                arr[i] = e.target.value;
                return arr;
              })} />
          </div>
        ))}
      </div>
      <div className='flex flex-col w-1/2 h-full'>
        <h1 className="my-auto mb-8 text-3xl font-bold text-center">Volume Control</h1>
        <SimpleVolumeSlider />
      </div>
      <div className='flex flex-col my-auto w-1/4'>
        <h1 className="my-auto mb-8 text-3xl font-bold text-center">ID: "{id}"</h1>
        <input
          type='text'
          placeholder='Enter ID...'
          className="p-2 placeholder-gray-400 text-black rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onChange={(e) => pubId(Number(e.target.value))}
        />
      </div>
    </main>
  );
}


await BlockUntilCsigSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JoinParamsProvider params={joinParams}>
      <App />
    </JoinParamsProvider>
  </StrictMode>,
);


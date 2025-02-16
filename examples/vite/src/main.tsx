import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { MocksProvider } from "use-join";
import { JMocks } from '@/utils/joins';
import { VolumeControl } from '@/components/volume-control';

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-3xl font-bold">Volume Control</h1>
      <VolumeControl />
    </main>
  );
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MocksProvider mocks={JMocks}>
      <App />
    </MocksProvider>
  </StrictMode>,
);

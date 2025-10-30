import { createRoot } from 'react-dom/client';
import { NxWelcome } from '../../../web/src/app/nx-welcome.tsx';

function App() {
  return (
    <>
      <NxWelcome title="desktop" />
    </>
  );
}

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(<App />);

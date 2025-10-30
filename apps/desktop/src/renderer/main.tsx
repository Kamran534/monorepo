import { createRoot } from 'react-dom/client';
import NxWelcome from '../../../web/src/app/nx-welcome';

function App() {
  return (
    <>
      <NxWelcome title="@monorepo/desktop" />
    </>
  );
}

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(<App />);

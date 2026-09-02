import ReactDOM from 'react-dom/client';
import './index.css';

async function createApp() {
  if (import.meta.env.DEV && import.meta.env.VITE_WHITEBOARD_FIXTURE) {
    const [{ default: createAppFactory }, { createDevelopmentFixtureInvoke }] = await Promise.all([
      import('./AppFactory.jsx'),
      import('./testing/createDevelopmentFixtureInvoke'),
    ]);
    return createAppFactory(createDevelopmentFixtureInvoke(import.meta.env.VITE_WHITEBOARD_FIXTURE));
  }
  return (await import('./App.js')).default;
}

createApp().then((App) => {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
});

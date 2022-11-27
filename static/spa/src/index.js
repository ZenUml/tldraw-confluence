import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function importBuildTarget() {
  if (localStorage.getItem('no-bridge')) {
    return import('./MockApp');
  } else {
    return import('./App');
  }
}
importBuildTarget().then(({default: App}) => {
  ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
})

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function importBuildTarget() {
  if (localStorage.getItem('no-bridge')) {
    return import('./MockApp.js');
  } else {
    return import('./App.js');
  }
}
importBuildTarget().then(({default: App}) => {
  ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
})

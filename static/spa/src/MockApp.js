import React from 'react';
import AppFactory from "./AppFactory";

const invoke = function () {
  console.warn('No bridge available. Mock App should only be used for development.');
  return new Promise((resolve) => {
    resolve(0);
  })
}

const App = AppFactory(invoke);
export default App;

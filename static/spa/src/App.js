import React from 'react';
import {invoke} from "@forge/bridge";
import AppFactory from "./AppFactory.jsx";

const App = AppFactory(invoke);
export default App;

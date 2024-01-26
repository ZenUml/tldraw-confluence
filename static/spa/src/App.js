import {invoke, view} from "@forge/bridge";
import AppFactory from "./AppFactory";

const App = AppFactory(invoke, view);
export default App;

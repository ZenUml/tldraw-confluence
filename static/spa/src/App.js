import {invoke, view} from "@forge/bridge";
import AppFactory from "./AppFactory.jsx";

const App = AppFactory(invoke, () => view.getContext());
export default App;

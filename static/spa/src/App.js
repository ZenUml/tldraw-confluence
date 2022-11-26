import React from 'react';
import {Tldraw} from '@tldraw/tldraw';
// import {Card} from "./Styles";
// import {invoke} from "@forge/bridge";
// import {defaultDocument} from "./defaultDocument";

function App() {
  // const [isFetched, setIsFetched] = React.useState(false);
  // const rInitialDocument = React.useRef(
  //   defaultDocument
  // )
  // if(!isFetched) {
  //   invoke('get-all').then((doc) => {
  //     console.debug('[App] get-all', doc, doc.id);
  //
  //     if(doc && doc.id) {
  //       console.debug('[App] get-all', doc);
  //       rInitialDocument.current = doc;
  //       setIsFetched(true);
  //     }
  //   });
  // }
  // function onPersist(app) {
  //   console.log('persist document', app.document);
  //   invoke('update', app.document);
  // }
  return (
    <div style={{height: '400px'}}>
      <Tldraw />
    </div>
  );
}

export default App;

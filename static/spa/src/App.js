import React from 'react';
import {Tldraw} from '@tldraw/tldraw';
import {Card} from "./Styles";
import {invoke} from "@forge/bridge";
import {defaultDocument} from "./defaultDocument";

function App() {
  const [isFetched, setIsFetched] = React.useState(false);
  const rInitialDocument = React.useRef(
    defaultDocument
  )
  if(!isFetched) {
    invoke('get-all').then((doc) => {
      if(doc) {
        console.debug('[App] get-all', doc);
        rInitialDocument.current = doc;
        setIsFetched(true);
      }
    });
  }
  function onPersist(app) {
    console.log('persist document', app.document);
    invoke('update', app.document);
  }
  return (
    <Card>
      <Tldraw showMenu={false} onPersist={onPersist} document={rInitialDocument.current}/>
    </Card>
  );
}

export default App;

import React from "react";
import {defaultDocument} from "./defaultDocument";
import {Card} from "./Styles";
import {Tldraw} from "@tldraw/tldraw";

export default function(invoke) {
  return function App() {
    const [isFetched, setIsFetched] = React.useState(false);
    const rInitialDocument = React.useRef(
        defaultDocument
    )
    if(!isFetched) {
      invoke('get-all').then((doc) => {
        console.debug('[App] get-all', doc, doc.id);

        if(doc && doc.id) {
          console.debug('[App] get-all', doc);
          rInitialDocument.current = doc;
          setIsFetched(true);
        }
      });
    }
    function onPersist(app) {
      if (JSON.stringify(app.document) === JSON.stringify(rInitialDocument.current)) {
        console.debug('[App] onPersist skipped');
        return;
      }
      console.log('persist document d', app.document);
      invoke('update', app.document);
    }
    return (
        <Card style={{height: '400px'}}>
          <Tldraw onPersist={onPersist} document={rInitialDocument.current} />
        </Card>
    );
  }

}

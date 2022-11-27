import React from "react";
import {defaultDocument} from "./defaultDocument";
import {Tldraw} from "@tldraw/tldraw";
import {Rnd} from "react-rnd";

const style = {
  display: "flex",
  border: "solid 1px #ddd",
  background: "#f0f0f0",
  height: '400px',
  position: 'relative',
  marginBottom: '10px',
};

export default function (invoke) {
  return function App() {
    const [isFetched, setIsFetched] = React.useState(false);
    const [height, setHeight] = React.useState(400);
    const rInitialDocument = React.useRef(
        defaultDocument
    )
    if (!isFetched) {
      invoke('get-all').then((doc) => {
        console.debug('[App] get-all', doc, doc.id);

        if (doc && doc.id) {
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
        <div>
          <Rnd
              enableResizing={{bottom: true, right: true}}
              disableDragging={true}
              style={style}
              size={{height: `${height}px`, width: '100%'}}

              onResizeStop={(e, direction, ref, delta, position) => {
                console.log('ref.style.height', ref.style.height);
                const h = Number(ref.style.height.slice(0, -2));
                console.log('setting height', h);
                setHeight(h);
              }}
          >
            <div>
              <Tldraw onPersist={onPersist} document={rInitialDocument.current}/>
            </div>
          </Rnd>
        </div>
    );
  }

}

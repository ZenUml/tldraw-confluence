import React from "react";
import {defaultDocument} from "./defaultDocument";
import {Tldraw} from "@tldraw/tldraw";
import {Rnd} from "react-rnd";
import Debug from "./Debug/Debug";

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
    const [currentDocument, setCurrentDocument] = React.useState(defaultDocument);

    if (!isFetched) {
      invoke('get-all').then((doc) => {
        console.debug('[App] get-all', doc, doc.id);

        if (doc && doc.id) {
          console.debug('[App] get-all', doc);
          // TODO: allow assets when we have a way to upload them
          // This also fix the issue that data cannot be correctly migrated
          const fixedDoc = Object.assign({}, doc, {assets: {}});

          setCurrentDocument(fixedDoc);
          setIsFetched(true);
          if(doc.viewport?.height) {
            setHeight(doc.viewport.height);
          }
        }
      });
    }

    function onPersist(app) {
      if (JSON.stringify(app.document) === JSON.stringify(currentDocument)) {
        console.debug('[App] onPersist skipped');
        return;
      }
      app.document.viewport = {height}
      console.debug('persisting document - app.document is', app.document);

      const merged = Object.assign(app.document, {viewport: {height}});
      console.log('persist document - merged', merged);
      invoke('update', merged);
      setCurrentDocument(merged);
    }

    function onPersistViewport(h) {
      console.log('persist viewport with height', h);
      const merged = Object.assign(currentDocument, {viewport: {height: h}});
      console.log('persist document', merged);
      invoke('update', merged);
      setCurrentDocument(merged);
    }

    return (
        <div>
          <Rnd
              enableResizing={{bottom: true, right: true}}
              disableDragging={true}
              className="flex flex-col"
              style={style}
              size={{height: `${height}px`, width: '100%'}}

              onResizeStop={(e, direction, ref, delta, position) => {
                console.log('ref.style.height', ref.style.height);
                const h = Number(ref.style.height.slice(0, -2));
                console.log('setting height', h);
                setHeight(h);
                onPersistViewport(h);
              }}
          >
            <Debug />
            <div className="relative flex flex-grow">
              <Tldraw showMultiplayerMenu={false} disableAssets={true} onPersist={onPersist} document={currentDocument}/>
            </div>
          </Rnd>
        </div>
    );
  }

}

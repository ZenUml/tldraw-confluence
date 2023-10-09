import React from "react";
import {defaultDocument} from "./defaultDocument";
import {Tldraw} from "@tldraw/tldraw";
import {Rnd} from "react-rnd";
import Debug from "./Debug/Debug";
import {compress, decompress} from './compress';
import mixpanel from 'mixpanel-browser';

mixpanel.init('0c62cea9ed2247f4824bf196f6817941', { debug: true, track_pageview: true, persistence: 'localStorage' });

const style = {
  display: "flex",
  border: "solid 1px #ddd",
  background: "#f0f0f0",
  height: '400px',
  position: 'relative',
  marginBottom: '10px',
};

function decompressIfNecessary(doc) {
  if(doc.compressedJson) {
    const decompressedJson = decompress(doc.compressedJson);
    return JSON.parse(decompressedJson);
  }
  return doc;
}

function compressDoc(doc) {
  const compressedJson = compress(JSON.stringify(doc));
  console.debug('[App] compressDoc', compressedJson);
  return {compressedJson: compressedJson};
}

export default function (invoke) {
  return function App() {
    const [isFetched, setIsFetched] = React.useState(false);
    const [height, setHeight] = React.useState(400);
    const [currentDocument, setCurrentDocument] = React.useState(defaultDocument);

    if (!isFetched) {
      invoke('get-all').then((doc) => {
        console.debug('[App] get-all', doc);
        doc = decompressIfNecessary(doc);
        if (doc && doc.id) {
          console.debug('[App] get-all', doc);
          // TODO: allow assets when we have a way to upload them
          // This also fix the issue that data cannot be correctly migrated
          const fixedDoc = Object.assign({}, doc, {assets: {}});
          console.debug('[App] get-all - fixed doc:', doc);

          setCurrentDocument(fixedDoc);
          setIsFetched(true);
          if(doc.viewport?.height) {
            setHeight(fixedDoc.viewport.height);
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
      saveToBackend(merged);
      setCurrentDocument(merged);
      mixpanel.track('Document Persisted', {
        'Viewport Height': height
      });
    }

    function onPersistViewport(h) {
      console.log('persist viewport with height', h);
      const merged = Object.assign(currentDocument, {viewport: {height: h}});
      console.log('persist document', merged);
      saveToBackend(merged);
      setCurrentDocument(merged);
      mixpanel.track('Viewport resize', {
        'Viewport Height': height
      });
    }

    function saveToBackend(doc) {
      invoke('update', compressDoc(doc));
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

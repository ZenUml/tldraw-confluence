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

export default function (invoke, view) {
  return function App() {
    const [isFetched, setIsFetched] = React.useState(false);
    const [height, setHeight] = React.useState(400);
    const [currentDocument, setCurrentDocument] = React.useState(defaultDocument);
    const [allDoc, setAllDoc] = React.useState(defaultDocument);
    let context;
    const getContext = async () => context || (context = await view.getContext());

    if (!isFetched) {
      Promise.all([invoke('get-all'), getContext()]).then(([doc, context]) => {
        console.debug('[App] get-all - doc:', doc, ', context:', context);
        const decompressed = decompressIfNecessary(doc);
        setAllDoc(decompressed);
        console.debug('[App] get-all - decompressed doc:', decompressed);

        //decompressed.spaces is a new storage format introduced in Jan 2024
        const singleDoc = decompressed && decompressed.spaces && decompressed.spaces[context.extension.space.id]?.contents[context.extension.content.id] || decompressed;

        if (singleDoc && singleDoc.id) {
          console.debug('[App] get-all - resolved doc:', singleDoc);
          // TODO: allow assets when we have a way to upload them
          // This also fix the issue that data cannot be correctly migrated
          const fixedDoc = Object.assign({}, singleDoc, {assets: {}});
          console.debug('[App] get-all - fixed doc:', singleDoc);

          setCurrentDocument(fixedDoc);
          setIsFetched(true);
          if(doc.viewport?.height) {
            setHeight(fixedDoc.viewport.height);
          }
        }
      });
    }

    async function onPersist(app) {
      if (JSON.stringify(app.document) === JSON.stringify(currentDocument)) {
        console.debug('[App] onPersist skipped');
        return;
      }
      app.document.viewport = {height}
      console.debug('persisting document - app.document is', app.document);

      const merged = Object.assign(app.document, {viewport: {height}});
      console.log('persist document - merged', merged);
      await saveToBackend(merged);
      setCurrentDocument(merged);
      mixpanel.track('Document Persisted', {
        'Viewport Height': height
      });
    }

    async function onPersistViewport(h) {
      console.log('persist viewport with height', h);
      const merged = Object.assign(currentDocument, {viewport: {height: h}});
      console.log('persist document', merged);
      await saveToBackend(merged);
      setCurrentDocument(merged);
      mixpanel.track('Viewport resize', {
        'Viewport Height': height
      });
    }

    async function saveToBackend(doc) {
      const {extension: {content: content, space: space}} = await getContext();
      let newDoc = allDoc;
      if(!newDoc.spaces) {
        newDoc = {spaces: {[space.id]: {contents: {[content.id]: doc}}}};
      } else {
        if(!newDoc.spaces[space.id]) {
          newDoc.spaces[space.id] = {contents: {}};
        }
        newDoc.spaces[space.id].contents[content.id] = doc;
        setAllDoc(newDoc);
      }

      console.log('saveToBackend:', newDoc);
      invoke('update', compressDoc(newDoc));
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

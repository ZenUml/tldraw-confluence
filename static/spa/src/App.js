import React from 'react';
import {Tldraw} from '@tldraw/tldraw';
import {Card} from "./Styles";

function App() {
  function onChange(app) {
    console.log('document', app.document);
  }
  return (
    <Card>
      <Tldraw showMenu={false} onChange={onChange} />
    </Card>
  );
}

export default App;

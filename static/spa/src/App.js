import React, { useEffect, useState} from 'react';
import { invoke } from '@forge/bridge';
import {Tldraw} from '@tldraw/tldraw';

// Atlaskit
import Spinner from '@atlaskit/spinner';

// Custom Styles
import {
  Card, ScrollContainer, LoadingContainer
} from './Styles';

function App() {
  const [todos, setTodos] = useState(null);
  const [isFetched, setIsFetched] = useState(false);

  if (!isFetched) {
    setIsFetched(true);
    invoke('get-all').then(setTodos);
  }
  useEffect(() => {
    if (!todos) return;
    if (!todos.find(todo => todo.isSaving || todo.isDeleting)) return;

    Promise.all(
      todos.map((todo) => {
        if (todo.isSaving && !todo.id) {
          return invoke('create', { label: todo.label, isChecked: false })
        }
        if (todo.isSaving && todo.id) {
          return invoke('update', { id: todo.id, label: todo.label, isChecked: todo.isChecked })
        }
        if (todo.isDeleting && todo.id) {
          return invoke('delete', { id: todo.id }).then(() => false);
        }
        return todo;
      })
    )
    .then(saved => saved.filter(a => a))
    .then(setTodos)
  }, [todos]);

  if (!todos) {
    return (
      <Card>
        <LoadingContainer>
          <Spinner size="large" />
        </LoadingContainer>
      </Card>
    );
  }
  return (
    <Card>
      <ScrollContainer>
        <Tldraw/>
      </ScrollContainer>
    </Card>
  );
}

export default App;

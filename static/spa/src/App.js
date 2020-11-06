import React, { useEffect, useState, Fragment } from 'react';
import { invoke } from '@forge/bridge';

// Atlaskit
import { LoadingButton as Button } from '@atlaskit/button';
import CloseIcon from '@atlaskit/icon/glyph/editor/close';
import TrashIcon from '@atlaskit/icon/glyph/editor/remove';
import { Checkbox } from '@atlaskit/checkbox';
import Textfield from '@atlaskit/textfield';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';

// Custom Styles
import {
  Card, Row, Icon, IconContainer, Status, SummaryActions, SummaryCount, SummaryFooter,
  ScrollContainer, Form, LoadingContainer
} from './Styles';

function App() {
  const [data, setData] = useState(null);
  const [input, setInput] = useState('');
  const [isFetched, setIsFetched] = useState(false);
  const [isDeleteAllShowing, setDeleteAllShowing] = useState(false);
  const [isDeletingAll, setDeletingAll] = useState(false);

  if (!isFetched) {
    setIsFetched(true);
    setTimeout(() => {
      invoke('get-all').then(setData);
    }, 500)
  }

  const createTodo = async (label) => {
    const newTodo = { label, isChecked: false };
    const newData = [...data, { ...newTodo, isSaving: true }];

    setData(newData);
  }

  const toggleTodo = ({ id }) => {
    setData(
      data.map(todo => {
        if (todo.id === id) {
          return { ...todo, isChecked: !todo.isChecked, isSaving: true };
        }
        return todo;
      })
    )
  }

  const deleteTodo = ({ id }) => {
    setData(
      data.map(todo => {
        if (todo.id === id) {
          return { ...todo, isDeleting: true };
        }
        return todo;
      })
    )
  }

  const deleteAllTodos = async () => {
    setDeletingAll(true);

    await invoke('delete-all');

    setData([]);
    setDeleteAllShowing(false);
    setDeletingAll(false);
  }

  useEffect(() => {
    if (!data) return;
    if (!data.find(todo => todo.isSaving || todo.isDeleting)) return;

    Promise.all(
      data.map((todo) => {
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
    .then(setData)
  }, [data]);

  return (
    <Card>
      {data ? (
        <Fragment>
          <ScrollContainer>
            {data.map((item, i) => (
              <Row isChecked={item.isChecked} key={item.label}>
                <Checkbox
                  isChecked={item.isChecked}
                  label={item.label}
                  name={item.label}
                  onChange={() => toggleTodo(item)}
                />
                <Status>
                  {(item.isSaving || item.isDeleting) ? <Spinner size="medium" /> : null}
                  {item.isChecked ? <Lozenge appearance="new">Done</Lozenge> : null}
                  <Button size="small" spacing="none" onClick={() => deleteTodo(item)}>
                    <IconContainer><Icon><CloseIcon /></Icon></IconContainer>
                  </Button>
                </Status>
              </Row>
            ))}
            <Row isCompact>
              <Form onSubmit={(e) => {
                e.preventDefault();
                createTodo(input);
                setInput('');
              }}>
                <Textfield
                  appearance="subtle"
                  placeholder="Add a todo +"
                  value={input}
                  onChange={({ target }) => setInput(target.value)}
                />
              </Form>
            </Row>
          </ScrollContainer>
          <SummaryFooter>
            <SummaryCount>
              <Lozenge>{data.filter(todo => todo.isChecked).length}/{data.length} Completed</Lozenge>
            </SummaryCount>
            <SummaryActions>
              {isDeleteAllShowing ? (
                <Button
                  appearance="danger"
                  spacing="compact"
                  isLoading={isDeletingAll}
                  isDisabled={isDeletingAll}
                  onClick={deleteAllTodos}
                >
                  Delete All
                </Button>
              ) : (
                <Button appearance="subtle" spacing="none" onClick={() => setDeleteAllShowing(true)}>
                  <IconContainer><Icon><TrashIcon /></Icon></IconContainer>
                </Button>
              )}
            </SummaryActions>
          </SummaryFooter>
        </Fragment>
      ) : (
        <LoadingContainer>
          <Spinner size="large" />
        </LoadingContainer>
      )}
    </Card>
  );
}

export default App;

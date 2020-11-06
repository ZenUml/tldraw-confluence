import React, { useEffect, useState, Fragment } from 'react';
import { LoadingButton as Button } from '@atlaskit/button';
import CloseIcon from '@atlaskit/icon/glyph/editor/close';
import TrashIcon from '@atlaskit/icon/glyph/editor/remove';
import { Checkbox } from '@atlaskit/checkbox';
import Textfield from '@atlaskit/textfield';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import { invoke } from '@forge/bridge';
import styled from 'styled-components';

const Card = styled.div`
  position: relative;
  text-decoration: none;
  background: rgb(255, 255, 255);
  box-shadow: rgba(9, 30, 66, 0.1) 0px 1px 1px, rgba(9, 30, 66, 0.31) 0px 0px 1px;
  border-radius: 4px;
  margin: 4px 1px;
  height: calc(100vh - 10px);
  box-sizing: border-box;
`;

const Status = styled.span`
  float: right;
  align-items: center;
  display: inline-flex;
  margin-top: -24px;

  & > span {
    margin-left: 8px;
  }
`;

const Form = styled.form`
  padding: 8px 0;
`;

const LoadingContainer = styled.div`
  justify-content: center;
  display: flex;
  align-items: center;
  height: 100%;
`;

const Row = styled.div`
  transition: .3s ease all;
  padding: 8px;
  border-bottom: 1px solid #efefef;

  button {
    opacity: 0;
    transition: .2s ease all;
    margin-left: 8px;
  }

  &:hover {
    button {
      opacity: 1;
    }
  }

  ${props => `
    ${props.isChecked ? 'text-decoration: line-through;' : ''}
    ${props.isCompact ? 'padding: 0 6px;' : ''}
    ${props.isCompact ? 'border: 0;' : ''}
  `}
`;

const IconContainer = styled.span`
  position: relative;
  height: 20px;
  width: 24px;
  align-self: center;
  display: inline-flex;
  flex-wrap: nowrap;
  max-width: 100%;
  position: relative;
`;

const Icon = styled.span`
  position: absolute;
`;

const ScrollContainer = styled.div`
  overflow: auto;
  max-height: calc(100% - 40px);
`;

const SummaryFooter = styled.div`
  width: 100%;
  height: 40px;
  bottom: 0;
  left: 0;
  position: absolute;
  background: #f7f7f7;
  border-top: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SummaryCount = styled.div`
  padding: 0 12px;
`;

const SummaryActions = styled.div`
  padding: 8px;
`;

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
    }, 2000)
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

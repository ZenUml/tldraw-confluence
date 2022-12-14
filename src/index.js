import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import ForgeUI, {
  MacroConfig,
  render,
  TextField}
  from '@forge/ui';

const resolver = new Resolver();

const getUniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

const getListKeyFromContext = (context) => {
  console.log(context);
  const { localId: id } = context;
  return id.split('/')[id.split('/').length - 1];
}

const getAll = async (listId) => {
  return await storage.get(listId) || [];
}

resolver.define('get-all', ({ context }) => {
  const listKey = getListKeyFromContext(context);
  console.debug(`get-all load for ${listKey}`);
  return getAll(listKey);
});

resolver.define('create', async ({ payload, context }) => {
  const listId = getListKeyFromContext(context);
  const records = await getAll(listId);
  const id = getUniqueId();

  const newRecord = {
    id,
    ...payload,
  };

  await storage.set(getListKeyFromContext(context), [...records, newRecord]);

  return newRecord;
});

resolver.define('update', async ({ payload, context }) => {
  const listKey = getListKeyFromContext(context);
  console.debug(`update document ${listKey}`, payload);
  await storage.set(listKey, payload);
  return payload;
});

resolver.define('delete', async ({ payload, context }) => {
  const listId = getListKeyFromContext(context);
  let records = await getAll(listId);

  records = records.filter(item => item.id !== payload.id)

  await storage.set(getListKeyFromContext(context), records);

  return payload;
});

resolver.define('delete-all', ({ context }) => {
  return storage.set(getListKeyFromContext(context), []);
});

export const handler = resolver.getDefinitions();

const Config = () => {

  return (
    <MacroConfig>
      <TextField name="name" label="Diagram title" placeholder="Untitled Diagram" description="You need to publish this page to start drawing diagrams" isRequired="true"/>
    </MacroConfig>
  );
}

export const config = render(
  <Config />
)

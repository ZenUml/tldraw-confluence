import Resolver from '@forge/resolver';
import { storage as forgeStorage } from '@forge/api';
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

// Create a wrapper around storage to avoid internal API issues
const safeStorage = {
  async get(key) {
    try {
      return await forgeStorage.get(key) || [];
    } catch (error) {
      console.error(`Error in storage.get for ${key}:`, error);
      return [];
    }
  },
  async set(key, value) {
    try {
      return await forgeStorage.set(key, value);
    } catch (error) {
      console.error(`Error in storage.set for ${key}:`, error);
      throw error;
    }
  }
};

const getAll = async (listId) => {
  return await safeStorage.get(listId);
}

resolver.define('get-all', async ({ context }) => {
  const listKey = getListKeyFromContext(context);
  console.debug(`get-all load for ${listKey}`);
  return await getAll(listKey);
});

resolver.define('create', async ({ payload, context }) => {
  const listId = getListKeyFromContext(context);
  const records = await getAll(listId);
  const id = getUniqueId();

  const newRecord = {
    id,
    ...payload,
  };

  await safeStorage.set(getListKeyFromContext(context), [...records, newRecord]);

  return newRecord;
});

resolver.define('update', async ({ payload, context }) => {
  const listKey = getListKeyFromContext(context);
  console.debug(`update document ${listKey}`, payload);
  await safeStorage.set(listKey, payload);
  return payload;
});

resolver.define('delete', async ({ payload, context }) => {
  const listId = getListKeyFromContext(context);
  let records = await getAll(listId);

  records = records.filter(item => item.id !== payload.id)

  await safeStorage.set(getListKeyFromContext(context), records);

  return payload;
});

resolver.define('delete-all', async ({ context }) => {
  return safeStorage.set(getListKeyFromContext(context), []);
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

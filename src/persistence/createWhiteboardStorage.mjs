import { Filter, FilterConditions, kvs } from '@forge/kvs';

const ENTITY_NAME = 'whiteboard-state';

function acquireFilter(condition) {
  if (condition.kind === 'missing-revision') {
    return new Filter().and('revision', FilterConditions.notExists());
  }
  return new Filter()
    .and('state', FilterConditions.equalTo('confirmed'))
    .and('revision', FilterConditions.equalTo(condition.revision));
}
function finalizeFilter(condition) {
  return new Filter()
    .and('state', FilterConditions.equalTo('pending'))
    .and('revision', FilterConditions.equalTo(condition.revision))
    .and('writeId', FilterConditions.equalTo(condition.writeId));
}

function acquireConditionStillMatches(current, condition) {
  if (condition.kind === 'missing-revision') {
    return current === undefined || current?.revision === undefined;
  }
  return current?.state === 'confirmed' && current?.revision === condition.revision;
}

function finalizeConditionStillMatches(current, condition) {
  return current?.state === 'pending'
    && current?.revision === condition.revision
    && current?.writeId === condition.writeId;
}

async function conditionalSet({
  kvsClient,
  entity,
  key,
  value,
  filter,
  conditionStillMatches,
  alreadyApplied,
}) {
  try {
    await kvsClient
      .transact()
      .set(key, value, { entityName: ENTITY_NAME, conditions: filter })
      .execute();
    return true;
  } catch (transactionError) {
    let current;
    try {
      current = await entity.get(key);
    } catch {
      throw transactionError;
    }
    if (alreadyApplied?.(current)) return true;
    if (!conditionStillMatches(current)) return false;
    throw transactionError;
  }
}

export function createWhiteboardStorage(kvsClient = kvs) {
  const entity = kvsClient.entity(ENTITY_NAME);
  return {
    documentStore: {
      get: (key) => kvsClient.get(key),
      set: (key, value) => kvsClient.set(key, value),
    },
    journalStore: {
      get: (key) => entity.get(key),
      acquire: (key, pending, condition) => conditionalSet({
        kvsClient,
        entity,
        key,
        value: pending,
        filter: acquireFilter(condition),
        conditionStillMatches: (current) => acquireConditionStillMatches(current, condition),
      }),
      finalize: (key, confirmed, condition) => conditionalSet({
        kvsClient,
        entity,
        key,
        value: confirmed,
        filter: finalizeFilter(condition),
        conditionStillMatches: (current) => finalizeConditionStillMatches(current, condition),
        alreadyApplied: (current) => current?.state === 'confirmed'
          && current?.revision === confirmed.revision
          && current?.currentToken === confirmed.currentToken
          && current?.writeId === confirmed.writeId,
      }),
    },
  };
}

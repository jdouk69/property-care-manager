// Send only edited fields; imported provider metadata remains in storage.
export function resourcePatch(record, values) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) =>
    !['id', 'created_date', 'updated_date', 'created_by'].includes(key) &&
    value !== undefined && JSON.stringify(value) !== JSON.stringify(record[key])
  ));
}

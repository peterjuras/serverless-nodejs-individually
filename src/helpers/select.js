export function select(...values) {
  return values.find(value => value !== undefined);
}

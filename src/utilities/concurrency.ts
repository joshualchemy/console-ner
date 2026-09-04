export async function mapConcurrent<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++;
      const value = values[index];
      if (value !== undefined) results[index] = await mapper(value, index);
    }
  }

  const count = Math.min(Math.max(1, Math.floor(concurrency)), values.length);
  await Promise.all(Array.from({ length: count }, () => worker()));
  return results;
}

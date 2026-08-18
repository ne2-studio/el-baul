import { describe, expect, it, vi } from 'vitest';
import { withOptimisticUpdate } from './withOptimisticUpdate';

describe('withOptimisticUpdate', () => {
  it('applies the optimistic value before awaiting the operation, and leaves it applied on success', async () => {
    let value = 'initial';
    const applied: string[] = [];

    await withOptimisticUpdate({
      getSnapshot: () => value,
      applyOptimistic: () => {
        value = 'optimistic';
        applied.push(value);
      },
      rollback: (previous) => { value = previous; },
      operation: async () => {
        expect(value).toBe('optimistic');
      },
    });

    expect(value).toBe('optimistic');
  });

  it('rolls back to the snapshot and rethrows when the operation fails', async () => {
    let value = 'initial';
    const error = new Error('boom');

    await expect(withOptimisticUpdate({
      getSnapshot: () => value,
      applyOptimistic: () => { value = 'optimistic'; },
      rollback: (previous) => { value = previous; },
      operation: async () => { throw error; },
    })).rejects.toThrow(error);

    expect(value).toBe('initial');
  });

  it('skips rollback (but still rethrows) when another call already wrote a newer value over this one', async () => {
    let value = 'initial';
    const error = new Error('boom');

    const failingCall = withOptimisticUpdate({
      getSnapshot: () => value,
      applyOptimistic: () => { value = 'call-a-optimistic'; },
      rollback: (previous) => { value = previous; },
      operation: () => new Promise((_, reject) => {
        // A second, concurrent optimistic call applies its own value on the same slice while
        // this call is still in flight — its rollback must not clobber it.
        value = 'call-b-optimistic';
        reject(error);
      }),
    });

    await expect(failingCall).rejects.toThrow(error);
    expect(value).toBe('call-b-optimistic');
  });

  it('works without an applyOptimistic step (operation-only rollback)', async () => {
    let value = 'initial';
    const error = new Error('boom');

    await expect(withOptimisticUpdate({
      getSnapshot: () => value,
      rollback: (previous) => { value = previous; },
      operation: async () => { throw error; },
    })).rejects.toThrow(error);

    expect(value).toBe('initial');
  });

  it('does not call rollback at all when the operation succeeds', async () => {
    const rollback = vi.fn();

    await withOptimisticUpdate({
      getSnapshot: () => 'v',
      applyOptimistic: () => undefined,
      rollback,
      operation: async () => undefined,
    });

    expect(rollback).not.toHaveBeenCalled();
  });
});

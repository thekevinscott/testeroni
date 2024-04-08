import { describe, test, expect, } from 'vitest';
import { UMDBundler } from './UMDBundler.js';

describe('UMDBundler', () => {
  test('it splits a filename', () => {
    const input = '/code/contortionist/./packages/contort/dist/index.umd.cjs';
    expect(UMDBundler.getTargetFileName(input)).toEqual('_code_contortionist_._packages_contort_dist_index.umd.cjs')
  });
});

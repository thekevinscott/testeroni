import { describe, test, expect } from 'vitest';
import { hoistImports } from './hoist-imports.js';
describe('refactor-imports', () => {
  test('it hoists imports to top', () => {
    expect(hoistImports(`
    (async () => {
      const script = async function() {
          import Contortionist from 'contort';
          const contortionist = new Contortionist({
            model: {
              protocol: 'llama.cpp',
              endpoint: 'http://localhost:49643/completion',
            },
          });
          const result = await contortionist.execute('prompt', {
            n: 10,
          });
          return result;
           };
      const data = await script();
    })();
    `)).toBe(`import Contortionist from 'contort';
      (async () => {
      const script = async function() {
          const contortionist = new Contortionist({
            model: {
              protocol: 'llama.cpp',
              endpoint: 'http://localhost:49643/completion',
            },
          });
          const result = await contortionist.execute('prompt', {
            n: 10,
          });
          return result;
           };
      const data = await script();
    })();
    `)

  });
});

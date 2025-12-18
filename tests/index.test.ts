import { add, greet } from '../src/utils';

describe('Dummy Tests', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(add(1, 2)).toBe(3);
  });

  test('greets user', () => {
    expect(greet('World')).toBe('Hello, World!');
  });
});

import { expect, test } from 'vitest';

test('verse ref splits', () => {
	const [b, c, v] = '43.17.14'.split('.').map(Number);
	expect(b).toBe(43);
	expect(c).toBe(17);
	expect(v).toBe(14);
});

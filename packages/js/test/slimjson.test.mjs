import test from 'node:test';
import assert from 'node:assert/strict';
import { pack, unpack, isSlimDocument, lazy } from '../dist/index.js';

test('SlimJSON - Packing uniform objects', () => {
  const users = [
    { id: 1, name: 'Budi', city: 'Jakarta' },
    { id: 2, name: 'Siti', city: 'Bandung' }
  ];

  const slim = pack(users);

  assert.equal(slim.__slim__, '1.0');
  assert.deepEqual(slim.cols, ['id', 'name', 'city']);
  assert.deepEqual(slim.rows, [
    [1, 'Budi', 'Jakarta'],
    [2, 'Siti', 'Bandung']
  ]);
});

test('SlimJSON - Packing empty array', () => {
  const slim = pack([]);
  assert.equal(slim.__slim__, '1.0');
  assert.deepEqual(slim.cols, []);
  assert.deepEqual(slim.rows, []);
});

test('SlimJSON - Packing heterogeneous objects with union of keys', () => {
  const products = [
    { id: 101, title: 'Headphones', price: 99.99 },
    { id: 102, title: 'Mouse', discount: 0.1 },
    { id: 103, title: 'Keyboard', price: 49.5, discount: 0.05 }
  ];

  const slim = pack(products);
  assert.deepEqual(slim.cols, ['id', 'title', 'price', 'discount']);
  assert.deepEqual(slim.rows, [
    [101, 'Headphones', 99.99, null],
    [102, 'Mouse', null, 0.1],
    [103, 'Keyboard', 49.5, 0.05]
  ]);
});

test('SlimJSON - Packing with explicit columns and metadata', () => {
  const items = [
    { a: 1, b: 2, c: 3 },
    { a: 4, b: 5, c: 6 }
  ];

  const slim = pack(items, {
    columns: ['c', 'a'],
    meta: { source: 'unit-test', total: 2 }
  });

  assert.deepEqual(slim.cols, ['c', 'a']);
  assert.deepEqual(slim.rows, [
    [3, 1],
    [6, 4]
  ]);
  assert.deepEqual(slim.meta, { source: 'unit-test', total: 2 });
});

test('SlimJSON - Unpacking and roundtrip fidelity', () => {
  const original = [
    { customer_name: 'Budi', address: 'Jakarta', active: true, balance: 1500.5 },
    { customer_name: 'Siti', address: 'Bandung', active: false, balance: null }
  ];

  const slim = pack(original);
  const unpacked = unpack(slim);

  assert.deepEqual(unpacked, original);
});

test('SlimJSON - Validation with isSlimDocument', () => {
  assert.equal(isSlimDocument(null), false);
  assert.equal(isSlimDocument({}), false);
  assert.equal(isSlimDocument({ __slim__: '1.0', cols: [] }), false);
  assert.equal(isSlimDocument({ __slim__: '1.0', cols: ['a'], rows: [[1]] }), true);
});

test('SlimJSON - Strict dimension checking', () => {
  const invalidDoc = {
    __slim__: '1.0',
    cols: ['col1', 'col2'],
    rows: [
      ['val1', 'val2'],
      ['val1'] // Missing second column
    ]
  };

  assert.throws(
    () => unpack(invalidDoc),
    /SlimJSON dimension mismatch at row 1/
  );

  // Lenient mode should not throw
  const lenientResult = unpack(invalidDoc, { lenient: true });
  assert.equal(lenientResult.length, 2);
  assert.deepEqual(lenientResult[0], { col1: 'val1', col2: 'val2' });
  assert.deepEqual(lenientResult[1], { col1: 'val1', col2: undefined });
});

test('SlimJSON - Zero-copy lazy reader', () => {
  const slim = {
    __slim__: '1.0',
    cols: ['id', 'user_name', 'email'],
    rows: [
      [1, 'alex', 'alex@example.com'],
      [2, 'sarah', 'sarah@example.com']
    ]
  };

  const list = lazy(slim);

  assert.equal(list.length, 2);
  assert.equal(list[0].id, 1);
  assert.equal(list[0].user_name, 'alex');
  assert.equal(list[0].email, 'alex@example.com');
  assert.equal(list[1].user_name, 'sarah');

  // Check property enumeration
  assert.deepEqual(Object.keys(list[0]), ['id', 'user_name', 'email']);
  assert.equal('user_name' in list[0], true);
  assert.equal('unknown_prop' in list[0], false);

  // Check toJSON on row
  assert.deepEqual(list[0].toJSON(), { id: 1, user_name: 'alex', email: 'alex@example.com' });

  // Check toArray on list
  const allUnpacked = list.toArray();
  assert.deepEqual(allUnpacked, [
    { id: 1, user_name: 'alex', email: 'alex@example.com' },
    { id: 2, user_name: 'sarah', email: 'sarah@example.com' }
  ]);

  // Array methods like map and filter
  const names = list.map((item) => item.user_name);
  assert.deepEqual(names, ['alex', 'sarah']);
});

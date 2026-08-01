import assert from 'node:assert/strict';
import test from 'node:test';
import { inclusiveTotal } from './totals.mjs';

test('counts both endpoints', () => assert.equal(inclusiveTotal(3, 5), 3));

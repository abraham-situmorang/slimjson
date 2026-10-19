export { pack } from './pack.js';
export { unpack, isSlimDocument } from './unpack.js';
export { lazy } from './lazy.js';
export type {
  SlimDocument,
  PackOptions,
  UnpackOptions
} from './types.js';
export type { LazyList, LazyRow } from './lazy.js';

// Default export providing all methods under a single namespace
import { pack } from './pack.js';
import { unpack, isSlimDocument } from './unpack.js';
import { lazy } from './lazy.js';

const slimjson = {
  pack,
  unpack,
  isSlimDocument,
  lazy
};

export default slimjson;

import { getState as loadState, setState as persistState } from "../db.js";

export async function getState(key) {
  return loadState(key);
}

export async function setState(key, value) {
  return persistState(key, value);
}

import { useSyncExternalStore } from "react";

let model: string | undefined = undefined;
const listeners = new Set<() => void>();

const setModel = (m: string) => {
  model = m;
  state = { model, setModel };
  listeners.forEach((l) => l());
};

type LLMState = { model: string | undefined; setModel: (m: string) => void };
let state: LLMState = { model, setModel };

export const useLLMStore = <T,>(sel: (s: LLMState) => T): T =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(state),
    () => sel(state),
  );

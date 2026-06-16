import { beforeEach, vi } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'mocked-uuid',
  },
});

const idbKeyvalMock = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  clear: vi.fn(),
  entries: vi.fn(),
  values: vi.fn(),
};

vi.mock('idb-keyval', () => idbKeyvalMock);

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  idbKeyvalMock.get.mockResolvedValue(undefined);
  idbKeyvalMock.set.mockResolvedValue(undefined);
  idbKeyvalMock.del.mockResolvedValue(undefined);
});

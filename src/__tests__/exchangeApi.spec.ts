import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exchangeApi } from '@/api/exchangeApi';
import { itemApi } from '@/api/itemApi';
import { ExchangeStatus } from '@/constants/exchange';
import { ItemCondition, ItemStatus } from '@/constants/item';
import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';

vi.mock('@/api/itemApi', () => ({
  itemApi: {
    list: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  },
}));

const mockItem1: Item = {
  id: 'item_1',
  user_id: 'user_a',
  title: '我的物品',
  description: '',
  category: '数码',
  condition: ItemCondition.GOOD,
  images: [],
  status: ItemStatus.AVAILABLE,
  location: '上海',
  created_at: new Date().toISOString(),
};

const mockItem2: Item = {
  id: 'item_2',
  user_id: 'user_b',
  title: '对方物品',
  description: '',
  category: '书籍',
  condition: ItemCondition.LIKE_NEW,
  images: [],
  status: ItemStatus.AVAILABLE,
  location: '杭州',
  created_at: new Date().toISOString(),
};

const mockExchange: Exchange = {
  id: 'exchange_1',
  from_user_id: 'user_a',
  to_user_id: 'user_b',
  from_item_id: 'item_1',
  to_item_id: 'item_2',
  status: ExchangeStatus.PENDING,
  message: 'test',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('exchangeApi.transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(itemApi.setStatus).mockResolvedValue({} as Item);
    vi.mocked(itemApi.detail).mockImplementation(async (id) => {
      if (id === 'item_1') return mockItem1;
      if (id === 'item_2') return mockItem2;
      return undefined;
    });
    localStorage.clear();
  });

  describe('状态流转合法性', () => {
    it('PENDING 可以流转到 ACCEPTED', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.PENDING };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      const result = await exchangeApi.transition(exchange.id, ExchangeStatus.ACCEPTED);
      expect(result.status).toBe(ExchangeStatus.ACCEPTED);
    });

    it('PENDING 可以流转到 REJECTED', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.PENDING };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      const result = await exchangeApi.transition(exchange.id, ExchangeStatus.REJECTED);
      expect(result.status).toBe(ExchangeStatus.REJECTED);
    });

    it('ACCEPTED 可以流转到 COMPLETED', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.ACCEPTED };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      const result = await exchangeApi.transition(exchange.id, ExchangeStatus.COMPLETED);
      expect(result.status).toBe(ExchangeStatus.COMPLETED);
    });

    it('PENDING 不能直接流转到 COMPLETED', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.PENDING };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      await expect(exchangeApi.transition(exchange.id, ExchangeStatus.COMPLETED)).rejects.toThrow(
        '当前状态不允许该操作',
      );
    });

    it('REJECTED 不能再流转', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.REJECTED };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      await expect(exchangeApi.transition(exchange.id, ExchangeStatus.ACCEPTED)).rejects.toThrow(
        '当前状态不允许该操作',
      );
    });

    it('COMPLETED 不能再流转', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.COMPLETED };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      await expect(exchangeApi.transition(exchange.id, ExchangeStatus.PENDING)).rejects.toThrow(
        '当前状态不允许该操作',
      );
    });
  });

  describe('完成后双方物品状态更新', () => {
    it('COMPLETED 状态时，双方物品都应标记为 EXCHANGED', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.ACCEPTED };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      await exchangeApi.transition(exchange.id, ExchangeStatus.COMPLETED);

      expect(itemApi.setStatus).toHaveBeenCalledTimes(2);
      expect(itemApi.setStatus).toHaveBeenCalledWith('item_1', ItemStatus.EXCHANGED);
      expect(itemApi.setStatus).toHaveBeenCalledWith('item_2', ItemStatus.EXCHANGED);
    });

    it('ACCEPTED 状态时，不应更新物品状态', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.PENDING };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      await exchangeApi.transition(exchange.id, ExchangeStatus.ACCEPTED);

      expect(itemApi.setStatus).not.toHaveBeenCalled();
    });

    it('REJECTED 状态时，不应更新物品状态', async () => {
      const exchange: Exchange = { ...mockExchange, status: ExchangeStatus.PENDING };
      localStorage.setItem('reswap:exchanges', JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 1e9,
        payload: [exchange],
      }));

      await exchangeApi.transition(exchange.id, ExchangeStatus.REJECTED);

      expect(itemApi.setStatus).not.toHaveBeenCalled();
    });
  });
});

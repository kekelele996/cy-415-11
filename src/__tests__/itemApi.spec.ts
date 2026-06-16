import { beforeEach, describe, expect, it, vi } from 'vitest';

import { itemApi } from '@/api/itemApi';
import { ItemCondition, ItemStatus } from '@/constants/item';
import type { Item, ItemDraft } from '@/models/item';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

describe('itemApi.create location 字段', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('应使用 draft 中用户输入的 location，而不是种子数据的 location', async () => {
    const draft: ItemDraft = {
      user_id: 'user_me',
      title: '测试物品',
      description: '',
      category: '数码',
      condition: ItemCondition.GOOD,
      images: [],
      location: '北京 · 朝阳',
      status: ItemStatus.AVAILABLE,
    };

    const result = await itemApi.create(draft);

    expect(result.location).toBe('北京 · 朝阳');
  });

  it('不应覆盖为 seedItems[0] 的 location（杭州·西湖）', async () => {
    const draft: ItemDraft = {
      user_id: 'user_me',
      title: '测试物品',
      description: '',
      category: '数码',
      condition: ItemCondition.GOOD,
      images: [],
      location: '广州 · 天河',
      status: ItemStatus.AVAILABLE,
    };

    const result = await itemApi.create(draft);

    expect(result.location).toBe('广州 · 天河');
    expect(result.location).not.toBe('杭州 · 西湖');
  });

  it('保存到 localStorage 的 location 也应该是用户输入的值', async () => {
    const draft: ItemDraft = {
      user_id: 'user_me',
      title: '测试物品',
      description: '',
      category: '数码',
      condition: ItemCondition.GOOD,
      images: [],
      location: '深圳 · 南山',
      status: ItemStatus.AVAILABLE,
    };

    await itemApi.create(draft);

    const savedRaw = localStorage.getItem('reswap:items');
    expect(savedRaw).not.toBeNull();
    if (savedRaw) {
      const saved = JSON.parse(savedRaw);
      const items = saved.payload as Item[];
      expect(items[0].location).toBe('深圳 · 南山');
    }
  });
});

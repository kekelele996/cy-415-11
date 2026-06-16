import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { itemApi } from '@/api/itemApi';
import { ItemCondition, ItemStatus } from '@/constants/item';
import type { Item } from '@/models/item';
import { useItemStore } from '@/stores/itemStore';

vi.mock('@/api/itemApi', () => ({
  itemApi: {
    list: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  },
}));

vi.mock('@/utils/message', () => ({
  message: vi.fn(),
}));

vi.mock('@/utils/validators', () => ({
  validateItemDraft: vi.fn(() => null),
}));

function makeItem(id: string, userId: string, status: ItemStatus, title: string): Item {
  return {
    id,
    user_id: userId,
    title,
    description: '',
    category: '数码',
    condition: ItemCondition.GOOD,
    images: [],
    status,
    location: '上海',
    created_at: new Date().toISOString(),
  };
}

describe('itemStore.availableMyItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('只返回当前用户的 AVAILABLE 物品，不包含其他用户的物品', () => {
    const pinia = createTestingPinia();
    const store = useItemStore(pinia);

    store.items = [
      makeItem('item_1', 'user_me', ItemStatus.AVAILABLE, '我的可用物品1'),
      makeItem('item_2', 'user_me', ItemStatus.AVAILABLE, '我的可用物品2'),
      makeItem('item_3', 'user_other', ItemStatus.AVAILABLE, '别人的可用物品'),
      makeItem('item_4', 'user_me', ItemStatus.OFFLINE, '我的已下架物品'),
      makeItem('item_5', 'user_me', ItemStatus.EXCHANGED, '我的已交换物品'),
      makeItem('item_6', 'user_other', ItemStatus.OFFLINE, '别人的已下架物品'),
    ];

    const result = store.availableMyItems('user_me');
    const ids = result.map((i) => i.id);

    expect(ids).toContain('item_1');
    expect(ids).toContain('item_2');
    expect(ids).not.toContain('item_3');
    expect(ids).not.toContain('item_4');
    expect(ids).not.toContain('item_5');
    expect(ids).not.toContain('item_6');
    expect(result).toHaveLength(2);
  });

  it('不混入他人的 AVAILABLE 物品（原 bug：使用 || 导致的问题）', () => {
    const pinia = createTestingPinia();
    const store = useItemStore(pinia);

    store.items = [
      makeItem('mine', 'user_me', ItemStatus.AVAILABLE, '我的物品'),
      makeItem('other_avail', 'user_other', ItemStatus.AVAILABLE, '他人的可用物品'),
      makeItem('other_offline', 'user_other', ItemStatus.OFFLINE, '他人的已下架物品'),
    ];

    const result = store.availableMyItems('user_me');
    const ids = result.map((i) => i.id);

    expect(ids).toEqual(['mine']);
    expect(ids).not.toContain('other_avail');
    expect(ids).not.toContain('other_offline');
  });

  it('不返回当前用户的 OFFLINE 物品', () => {
    const pinia = createTestingPinia();
    const store = useItemStore(pinia);

    store.items = [
      makeItem('avail', 'user_me', ItemStatus.AVAILABLE, '可用物品'),
      makeItem('offline', 'user_me', ItemStatus.OFFLINE, '已下架物品'),
    ];

    const result = store.availableMyItems('user_me');
    expect(result.map((i) => i.id)).toEqual(['avail']);
  });

  it('不返回当前用户的 EXCHANGED 物品', () => {
    const pinia = createTestingPinia();
    const store = useItemStore(pinia);

    store.items = [
      makeItem('avail', 'user_me', ItemStatus.AVAILABLE, '可用物品'),
      makeItem('exchanged', 'user_me', ItemStatus.EXCHANGED, '已交换物品'),
    ];

    const result = store.availableMyItems('user_me');
    expect(result.map((i) => i.id)).toEqual(['avail']);
  });

  it('当前用户没有可用物品时返回空数组', () => {
    const pinia = createTestingPinia();
    const store = useItemStore(pinia);

    store.items = [
      makeItem('offline', 'user_me', ItemStatus.OFFLINE, '已下架物品'),
      makeItem('exchanged', 'user_me', ItemStatus.EXCHANGED, '已交换物品'),
      makeItem('other_avail', 'user_other', ItemStatus.AVAILABLE, '他人的可用物品'),
    ];

    const result = store.availableMyItems('user_me');
    expect(result).toEqual([]);
  });

  it('物品列表为空时返回空数组', () => {
    const pinia = createTestingPinia();
    const store = useItemStore(pinia);
    store.items = [];

    const result = store.availableMyItems('user_me');
    expect(result).toEqual([]);
  });
});

describe('itemApi.create 发布地点', () => {
  it('应使用用户传入的 location，而不是种子数据的 location', async () => {
    vi.mocked(itemApi.list).mockResolvedValue([]);
    vi.mocked(itemApi.create).mockImplementation(async (draft) => ({
      ...draft,
      id: 'test',
      created_at: new Date().toISOString(),
      status: draft.status ?? ItemStatus.AVAILABLE,
    } as Item));

    const pinia = createTestingPinia({ stubActions: false });
    const store = useItemStore(pinia);

    const published = await store.publish({
      user_id: 'user_me',
      title: '测试物品',
      description: '',
      category: '数码',
      condition: ItemCondition.GOOD,
      images: [],
      location: '北京 · 朝阳',
    });

    expect(itemApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        location: '北京 · 朝阳',
      }),
    );
    expect(published?.location).toBe('北京 · 朝阳');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import ExchangeCard from '@/components/common/ExchangeCard.vue';
import { ExchangeStatus } from '@/constants/exchange';
import { ItemCondition, ItemStatus } from '@/constants/item';
import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';
import type { User } from '@/models/user';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/utils/formatters', () => ({
  formatDate: vi.fn((v: string) => v),
  formatExchangeStatus: vi.fn((v: string) => v),
  formatStatusMessage: vi.fn(() => ''),
  statusToneClass: vi.fn(() => ''),
}));

const mockItems: Item[] = [
  {
    id: 'item_from',
    user_id: 'user_from',
    title: '发起方物品',
    description: '',
    category: '数码',
    condition: ItemCondition.GOOD,
    images: [],
    status: ItemStatus.AVAILABLE,
    location: '上海',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'item_to',
    user_id: 'user_to',
    title: '接收方物品',
    description: '',
    category: '书籍',
    condition: ItemCondition.LIKE_NEW,
    images: [],
    status: ItemStatus.AVAILABLE,
    location: '杭州',
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

const mockUsers: User[] = [
  {
    id: 'user_from',
    nickname: '发起用户',
    avatar: '',
    phone: '',
    location: '上海',
    credit_score: 100,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'user_to',
    nickname: '接收用户',
    avatar: '',
    phone: '',
    location: '杭州',
    credit_score: 90,
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

function createExchange(status: ExchangeStatus): Exchange {
  return {
    id: 'exchange_1',
    from_user_id: 'user_from',
    to_user_id: 'user_to',
    from_item_id: 'item_from',
    to_item_id: 'item_to',
    status,
    message: '',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

function mountWithUser(userId: string | null, exchange: Exchange) {
  const pinia = createTestingPinia();
  const authStore = useAuthStore();
  if (userId) {
    authStore.currentUser = mockUsers.find((u) => u.id === userId) ?? null;
  } else {
    authStore.currentUser = null;
  }
  authStore.users = mockUsers;
  return mount(ExchangeCard, {
    props: {
      exchange,
      items: mockItems,
      users: mockUsers,
    },
    global: {
      plugins: [pinia],
    },
  });
}

describe('ExchangeCard 按钮权限逻辑', () => {
  describe('PENDING 状态', () => {
    it('接收方应看到同意/拒绝按钮，不应看到完成按钮', () => {
      const wrapper = mountWithUser('user_to', createExchange(ExchangeStatus.PENDING));
      const buttons = wrapper.findAll('button');
      const buttonTexts = buttons.map((b) => b.text().trim());
      expect(buttonTexts).toContain('同意');
      expect(buttonTexts).toContain('拒绝');
      expect(buttonTexts).not.toContain('完成');
    });

    it('发起方不应看到任何操作按钮', () => {
      const wrapper = mountWithUser('user_from', createExchange(ExchangeStatus.PENDING));
      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });

    it('无关用户不应看到任何操作按钮', () => {
      const wrapper = mountWithUser('other_user', createExchange(ExchangeStatus.PENDING));
      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('ACCEPTED 状态', () => {
    it('发起方应看到完成按钮，不应看到同意/拒绝按钮', () => {
      const wrapper = mountWithUser('user_from', createExchange(ExchangeStatus.ACCEPTED));
      const buttons = wrapper.findAll('button');
      const buttonTexts = buttons.map((b) => b.text().trim());
      expect(buttonTexts).toContain('完成');
      expect(buttonTexts).not.toContain('同意');
      expect(buttonTexts).not.toContain('拒绝');
    });

    it('接收方不应看到任何操作按钮', () => {
      const wrapper = mountWithUser('user_to', createExchange(ExchangeStatus.ACCEPTED));
      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('REJECTED 状态', () => {
    it('发起方不应看到任何操作按钮', () => {
      const wrapper = mountWithUser('user_from', createExchange(ExchangeStatus.REJECTED));
      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });

    it('接收方不应看到任何操作按钮', () => {
      const wrapper = mountWithUser('user_to', createExchange(ExchangeStatus.REJECTED));
      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('COMPLETED 状态', () => {
    it('发起方不应看到任何操作按钮', () => {
      const wrapper = mountWithUser('user_from', createExchange(ExchangeStatus.COMPLETED));
      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });

    it('接收方不应看到任何操作按钮', () => {
      const wrapper = mountWithUser('user_to', createExchange(ExchangeStatus.COMPLETED));
      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('未登录用户', () => {
    it('任何状态下都不应看到操作按钮', () => {
      const statuses = [
        ExchangeStatus.PENDING,
        ExchangeStatus.ACCEPTED,
        ExchangeStatus.REJECTED,
        ExchangeStatus.COMPLETED,
      ];
      for (const status of statuses) {
        const wrapper = mountWithUser(null, createExchange(status));
        const buttons = wrapper.findAll('button');
        expect(buttons).toHaveLength(0);
      }
    });
  });
});

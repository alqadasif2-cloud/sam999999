/**
 * Sami Offline-First Local Cache Service
 * Provides instant data retrieval from disk/localStorage, user-isolated caching,
 * persistent image thumbnail caching, and background synchronization state.
 */

import { CommunityChannel, ChatMessage, PrivateMessage } from '../data/chat';
import { UserAccount } from '../data/auth';
import { SubscriptionPlan } from '../types/subscription';

const CACHE_PREFIX = 'sami_cache_v2';
const IMAGE_CACHE_PREFIX = 'sami_img_cache_v2_';

function getUserCacheKey(userId: number | string | null | undefined, key: string): string {
  const uid = userId ? String(userId) : 'guest';
  return `${CACHE_PREFIX}_u${uid}_${key}`;
}

export const LocalCacheService = {
  // =========================================================================
  // CHANNELS
  // =========================================================================
  getChannels(userId: number | string | null | undefined): CommunityChannel[] {
    try {
      const raw = localStorage.getItem(getUserCacheKey(userId, 'channels'));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setChannels(userId: number | string | null | undefined, channels: CommunityChannel[]): void {
    try {
      localStorage.setItem(getUserCacheKey(userId, 'channels'), JSON.stringify(channels));
    } catch (e) {
      console.warn('[LocalCache] Failed to save channels cache:', e);
    }
  },

  // =========================================================================
  // SUBSCRIPTION PLANS
  // =========================================================================
  getSubscriptionPlans(userId: number | string | null | undefined): SubscriptionPlan[] {
    try {
      const raw = localStorage.getItem(getUserCacheKey(userId, 'sub_plans'));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setSubscriptionPlans(userId: number | string | null | undefined, plans: SubscriptionPlan[]): void {
    try {
      localStorage.setItem(getUserCacheKey(userId, 'sub_plans'), JSON.stringify(plans));
    } catch (e) {
      console.warn('[LocalCache] Failed to save plans cache:', e);
    }
  },

  // =========================================================================
  // CHANNEL MESSAGES (Cached per channel, limit latest 50 to optimize storage)
  // =========================================================================
  getChannelMessages(userId: number | string | null | undefined, channelId: string): ChatMessage[] {
    try {
      const raw = localStorage.getItem(getUserCacheKey(userId, `msgs_${channelId}`));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setChannelMessages(userId: number | string | null | undefined, channelId: string, messages: ChatMessage[]): void {
    try {
      // Keep most recent 50 messages in fast disk cache
      const trimmed = messages.slice(-50);
      localStorage.setItem(getUserCacheKey(userId, `msgs_${channelId}`), JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[LocalCache] Failed to save channel messages cache:', e);
    }
  },

  // =========================================================================
  // PRIVATE MESSAGES
  // =========================================================================
  getPrivateMessages(userId: number | string | null | undefined, partnerId?: number | null): PrivateMessage[] {
    try {
      const keySuffix = partnerId ? `pms_${partnerId}` : 'pms_all';
      const raw = localStorage.getItem(getUserCacheKey(userId, keySuffix));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setPrivateMessages(userId: number | string | null | undefined, messages: PrivateMessage[], partnerId?: number | null): void {
    try {
      const keySuffix = partnerId ? `pms_${partnerId}` : 'pms_all';
      const trimmed = messages.slice(-60);
      localStorage.setItem(getUserCacheKey(userId, keySuffix), JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[LocalCache] Failed to save private messages cache:', e);
    }
  },

  // =========================================================================
  // COMMUNITY USERS
  // =========================================================================
  getUsers(userId: number | string | null | undefined): UserAccount[] {
    try {
      const raw = localStorage.getItem(getUserCacheKey(userId, 'community_users'));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setUsers(userId: number | string | null | undefined, users: UserAccount[]): void {
    try {
      localStorage.setItem(getUserCacheKey(userId, 'community_users'), JSON.stringify(users));
    } catch (e) {
      console.warn('[LocalCache] Failed to save users cache:', e);
    }
  },

  // =========================================================================
  // PERSISTENT IMAGE CACHE
  // Stores resolved URLs and base64 thumbnails in localStorage
  // =========================================================================
  getImage(cacheKey: string): string | null {
    try {
      if (!cacheKey) return null;
      return localStorage.getItem(`${IMAGE_CACHE_PREFIX}${encodeURIComponent(cacheKey)}`);
    } catch {
      return null;
    }
  },

  setImage(cacheKey: string, value: string): void {
    try {
      if (!cacheKey || !value) return;
      // Safeguard against storage quota: only cache strings under 400KB in localStorage
      if (value.length > 400000) return;
      localStorage.setItem(`${IMAGE_CACHE_PREFIX}${encodeURIComponent(cacheKey)}`, value);
    } catch (e) {
      // Storage full: evict older images
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(IMAGE_CACHE_PREFIX)) {
            keysToRemove.push(k);
            if (keysToRemove.length >= 10) break;
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
  },

  // =========================================================================
  // CACHE CLEANUP ON LOGOUT
  // Clear sensitive cached messages when logging out
  // =========================================================================
  clearUserSensitiveCache(userId: number | string): void {
    try {
      const prefix = `${CACHE_PREFIX}_u${userId}_`;
      const toDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          toDelete.push(key);
        }
      }
      toDelete.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  },
};

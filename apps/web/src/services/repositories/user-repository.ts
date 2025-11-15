/**
 * User Repository for Web App
 * Handles authentication and user data with online/offline support
 */

import { UserRepository as SharedUserRepository } from '@monorepo/shared-data-access';
import { BaseRepository } from './base-repository';
import { dataAccessService } from '../data-access.service';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  isActive: number;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  isOffline: boolean;
  error?: string;
}

export class WebUserRepository extends BaseRepository {
  private sharedUserRepo: SharedUserRepository | null = null;

  /**
   * Get or create the shared user repository
   * Lazy initialization ensures dataAccessService is ready
   */
  private async getSharedUserRepo(): Promise<SharedUserRepository> {
    if (!this.sharedUserRepo) {
      // Wait for data access service to be initialized
      let retries = 0;
      const maxRetries = 50; // Wait up to 5 seconds (50 * 100ms)
      
      while (retries < maxRetries) {
        try {
          // Try to access the service - if it throws, it's not ready
          dataAccessService.getLocalDb();
          dataAccessService.getApiClient();
          break; // Service is ready
        } catch {
          // Service not ready yet, wait a bit
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
      }

      if (retries >= maxRetries) {
        throw new Error('Data access service not initialized. Please wait for app initialization.');
      }

      try {
        this.sharedUserRepo = new SharedUserRepository(
          dataAccessService.getLocalDb(),
          dataAccessService.getApiClient()
        );
      } catch (error) {
        console.error('[WebUserRepository] Failed to initialize shared repository:', error);
        throw new Error('Data access service not initialized. Please wait for app initialization.');
      }
    }
    return this.sharedUserRepo;
  }

  /**
   * Login user with online/offline support
   * Tries server first, falls back to local if offline or server unavailable
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const sharedRepo = await this.getSharedUserRepo();
      
      // Always try online login first (shared repo will handle fallback)
      // Pass undefined for useServer to enable auto-detection with fallback
      console.log('[WebUserRepository] Attempting login (will try online first, then offline)...');
      const result = await sharedRepo.login({ username: email, password }, { useServer: undefined });

      if (result.success && result.user) {
        // Set auth token if available (online login)
        if (result.token) {
          dataAccessService.setAuthToken(result.token);
        }

        console.log(`[WebUserRepository] Login successful (${result.isOffline ? 'offline' : 'online'})`);
        
        // Map shared User to local User type, ensuring createdAt, updatedAt, and isActive are properly converted
        const sharedUser = result.user;
        const localUser: User = {
          id: sharedUser.id,
          username: sharedUser.username,
          email: sharedUser.email,
          firstName: sharedUser.firstName,
          lastName: sharedUser.lastName,
          roleId: sharedUser.roleId,
          isActive: sharedUser.isActive ? 1 : 0,
          passwordHash: sharedUser.passwordHash,
          createdAt: (sharedUser as { createdAt?: string }).createdAt || this.now(),
          updatedAt: (sharedUser as { updatedAt?: string }).updatedAt || this.now(),
        };
        
        return {
          success: true,
          user: localUser,
          token: result.token,
          isOffline: result.isOffline || false,
        };
      }

      // Login failed - return the error from shared repository
      return {
        success: false,
        isOffline: result.isOffline || false,
        error: result.error || 'Invalid credentials. Please check your username and password.',
      };
    } catch (error: unknown) {
      console.error('[WebUserRepository] Login error:', error);
      return {
        success: false,
        isOffline: true,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      if (this.isOnline()) {
        // Fetch from server
        const response = await this.getApi().get<User>(`/api/users/${userId}`);
        return response;
      } else {
        // Fetch from local DB
        const users = await this.getDb().query<User>('User', [{ id: userId }]);
        return users.length > 0 ? users[0] : null;
      }
    } catch (error) {
      console.error('[WebUserRepository] Get user failed:', error);
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    dataAccessService.clearAuthToken();
  }
}

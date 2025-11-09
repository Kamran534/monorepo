/**
 * User Repository for Web App
 * Handles authentication and user data with online/offline support
 */

import { DataSource, UserRepository as SharedUserRepository } from '@monorepo/shared-data-access';
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

  constructor() {
    super();
    // Lazy initialization - will be created when first needed
  }

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
        } catch (error) {
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
   * Tries server first, falls back to local if offline
   */
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      const sharedRepo = await this.getSharedUserRepo();
      
      // Determine if we should try server login
      const isOnline = this.isOnline();

      if (isOnline) {
        try {
          // Try online login
          console.log('[WebUserRepository] Attempting online login...');
          const result = await sharedRepo.login({ username, password }, { useServer: true });

          if (result.success && result.token && result.user) {
            // Set auth token for future API calls
            dataAccessService.setAuthToken(result.token);

            // Note: UserRepository.login already fetches and saves user data to local DB
            // No need to call fetchAndSaveOfflineUserData separately

            console.log('[WebUserRepository] Online login successful');
            return {
              success: true,
              user: result.user as User,
              token: result.token,
              isOffline: false,
            };
          }
          
          // If login succeeded but no token/user, something went wrong
          if (result.success && (!result.token || !result.user)) {
            console.error('[WebUserRepository] Login succeeded but missing token or user:', result);
            return {
              success: false,
              isOffline: false,
              error: 'Login succeeded but incomplete response from server',
            };
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Login failed';
          console.error('[WebUserRepository] Online login error:', {
            message: errorMsg,
            stack: error.stack,
            error,
          });
          
          // If it's an authentication error (401, 403) or invalid credentials, don't fall back to offline
          // Only fall back for network/server errors
          const isAuthError = errorMsg.includes('Invalid') || 
                             errorMsg.includes('credentials') || 
                             errorMsg.includes('401') || 
                             errorMsg.includes('403') ||
                             errorMsg.includes('unauthorized');
          
          if (isAuthError) {
            return {
              success: false,
              isOffline: false,
              error: 'Invalid credentials. Please check your username and password.',
            };
          }
          
          // For network/server errors, fall through to offline login
          console.warn('[WebUserRepository] Online login failed (network/server error), trying offline...');
        }
      }

      // Try offline login using shared repository
      console.log('[WebUserRepository] Attempting offline login...');
      const offlineResult = await sharedRepo.login({ username, password }, { useServer: false });

      if (offlineResult.success && offlineResult.user) {
        console.log('[WebUserRepository] Offline login successful');
        return {
          success: true,
          user: offlineResult.user as User,
          isOffline: true,
        };
      }

      // Offline login failed - return the error from shared repository
      return {
        success: false,
        isOffline: true,
        error: offlineResult.error || 'Invalid credentials. Please check your username and password.',
      };
    } catch (error: any) {
      console.error('[WebUserRepository] Login error:', error);
      return {
        success: false,
        isOffline: true,
        error: error.message || 'Login failed',
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

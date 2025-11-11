/**
 * User Repository
 * 
 * Handles user authentication and data access
 * Supports both online (API) and offline (local database) login
 */

import { LocalDbClient } from '../types';
import { HttpApiClient } from '../remote-api-client';

// Use bcryptjs for browser/Electron compatibility (pure JS, no native deps)
let bcrypt: any = null;
let bcryptLoaded = false;

async function loadBcrypt(): Promise<any> {
  if (bcryptLoaded && bcrypt) {
    return bcrypt;
  }

  try {
    // Try to load bcryptjs - it works in both Node.js and browsers (pure JS implementation)
    // @ts-ignore - bcryptjs might not be installed in all environments
    const bcryptModule = await import('bcryptjs');
    bcrypt = bcryptModule.default || bcryptModule;
    bcryptLoaded = true;
    console.log('[UserRepository] ✓ bcryptjs loaded via dynamic import');
    return bcrypt;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn('[UserRepository] ⚠️ bcryptjs not available:', errorMsg);
    bcryptLoaded = true; // Mark as loaded to prevent retry
    return null;
  }
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName?: string;
  employeeCode?: string;
  isActive: boolean;
  passwordHash?: string; // Only in local DB, never returned
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  isOffline?: boolean;
}

export interface LoginOptions {
  /**
   * Whether to use server for login
   * If false, will skip server login and use local database directly
   * If undefined, will check server availability automatically
   */
  useServer?: boolean;
}

export class UserRepository {
  private localDb: LocalDbClient;
  private apiClient: HttpApiClient;

  constructor(localDb: LocalDbClient, apiClient: HttpApiClient) {
    this.localDb = localDb;
    this.apiClient = apiClient;
  }

  /**
   * Login user
   * 
   * Behavior:
   * - If useServer is false, directly uses offline login
   * - If useServer is true, tries online login first, falls back to offline on failure
   * - If useServer is undefined, checks server availability and user preference
   */
  async login(credentials: LoginCredentials, options?: LoginOptions): Promise<LoginResult> {
    const { username, password } = credentials;
    const { useServer } = options || {};

    // If explicitly disabled, use offline login directly
    if (useServer === false) {
      console.log('[UserRepository] Server login disabled, using offline login');
      return await this.loginOffline(username, password);
    }

    // Check if server should be used
    let shouldUseServer = useServer === true;
    
    if (useServer === undefined) {
      // Auto-detect: Always try server first, don't check availability upfront
      // This ensures we attempt the server even if availability check fails
      console.log('[UserRepository] Auto-mode: Will try server first, then fallback to offline');
      shouldUseServer = true; // Always try server first in auto mode
    } else {
      console.log('[UserRepository] Server usage explicitly set:', useServer);
      shouldUseServer = useServer;
    }

    // Try online login if server should be used
    if (shouldUseServer) {
      console.log('[UserRepository] Attempting online login...');
      try {
        const result = await this.loginOnline(username, password);
        if (result.success && result.user && result.token) {
          console.log('[UserRepository] Online login successful');
          console.log('[UserRepository] Auth token is set, fetching user data from server...');
          
          // Auth token is now set in apiClient, fetch and save full user data
          // Await it to ensure it completes
          try {
            console.log('[UserRepository] Starting fetchAndSaveUserDataToLocal for userId:', result.user.id);
            await this.fetchAndSaveUserDataToLocal(result.user.id);
            console.log('[UserRepository] ✅✅✅ User data fetch and save completed successfully');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('[UserRepository] ⚠️⚠️⚠️ User data fetch/save FAILED (non-fatal):', {
              error: errorMsg,
              stack: errorStack,
              userId: result.user.id,
            });
            // Don't re-throw - login succeeded, user can still use the app online
            // Offline login won't work until user data is synced, but online login is fine
            console.warn('[UserRepository] Login succeeded but user data not saved to local DB. Offline login may not work.');
          }
          
          return result;
        } else {
          console.warn('[UserRepository] Online login returned unsuccessful result');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn('[UserRepository] Online login failed, trying offline:', errorMsg);
        // Continue to offline login below
      }
    } else {
      console.log('[UserRepository] Skipping online login (server explicitly disabled)');
    }

    // Fall back to offline login
    return await this.loginOffline(username, password);
  }

  /**
   * Login online via API
   */
  private async loginOnline(username: string, password: string): Promise<LoginResult> {
    try {
      console.log('[UserRepository] Calling /api/auth/login');
      const response = await this.apiClient.post<{
        success: boolean;
        data: {
          user: {
            id: string;
            username: string;
            email: string;
            roleId: string;
            roleName: string;
            firstName: string;
            lastName: string;
            employeeCode?: string;
          };
          token: string;
        };
      }>('/api/auth/login', { email: username, password });
      
      console.log('[UserRepository] Login API response:', {
        success: response.success,
        hasData: !!response.data,
        hasUser: !!response.data?.user,
        hasToken: !!response.data?.token,
        fullResponse: JSON.stringify(response, null, 2),
      });

      if (response.success && response.data) {
        const { user, token } = response.data;

        // Set auth token for future API calls
        this.apiClient.setAuthToken(token);

        console.log('[UserRepository] Parsed user data:', {
          id: user.id,
          username: user.username,
          email: user.email,
          roleId: user.roleId,
        });

        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId,
            roleName: user.roleName,
            employeeCode: user.employeeCode,
            isActive: true,
          },
          token,
          isOffline: false,
        };
      }

      console.warn('[UserRepository] Invalid response structure:', response);
      return {
        success: false,
        error: 'Invalid response from server',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[UserRepository] Online login exception:', {
        message: errorMsg,
        stack: errorStack,
        error,
      });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Login offline from local database
   */
  async loginOffline(usernameOrEmail: string, password: string): Promise<LoginResult> {
    try {
      console.log('[UserRepository] ========== OFFLINE LOGIN ATTEMPT ==========');
      console.log('[UserRepository] Searching for user:', usernameOrEmail);
      console.log('[UserRepository] Database type:', this.localDb.constructor.name);
      
      // Query user from local database (supports both username and email)
      const users = await this.localDb.query<User & { passwordHash: string }>(
        `SELECT * FROM User WHERE username = ? OR email = ? LIMIT 1`,
        [usernameOrEmail, usernameOrEmail]
      );

      console.log('[UserRepository] Query result:', {
        userCount: users.length,
        foundUser: users.length > 0 ? {
          id: users[0].id,
          username: users[0].username,
          email: users[0].email,
          hasPasswordHash: !!users[0].passwordHash,
          passwordHashLength: users[0].passwordHash?.length || 0,
          isActive: users[0].isActive,
        } : null,
      });

      if (users.length === 0) {
        console.log('[UserRepository] ✗ User not found in local database');
        return {
          success: false,
          error: 'User not found in local database. Please login online first to sync your credentials.',
          isOffline: true,
        };
      }

      const user = users[0];

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'User account is inactive',
          isOffline: true,
        };
      }

      // Verify password
      if (!user.passwordHash) {
        return {
          success: false,
          error: 'Password not set for offline login',
          isOffline: true,
        };
      }

      // Load bcryptjs if not already loaded
      const bcryptModule = await loadBcrypt();
      if (!bcryptModule) {
        return {
          success: false,
          error: 'Password verification not available (bcryptjs not installed). Please install bcryptjs for offline login support.',
          isOffline: true,
        };
      }

      // Verify password using bcryptjs (works in both Node.js and browsers)
      console.log('[UserRepository] Verifying password with bcryptjs...');
      const isValidPassword = await bcryptModule.compare(password, user.passwordHash);
      console.log('[UserRepository] Password verification result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('[UserRepository] ✗ Password verification failed');
        return {
          success: false,
          error: 'Invalid password',
          isOffline: true,
        };
      }
      
      console.log('[UserRepository] ✓ Password verified successfully');

      // Get role name if available
      let roleName: string | undefined;
      if (user.roleId) {
        try {
          const roles = await this.localDb.query<{ name: string }>(
            `SELECT name FROM Role WHERE id = ? LIMIT 1`,
            [user.roleId]
          );
          if (roles.length > 0) {
            roleName = roles[0].name;
          }
        } catch (error) {
          console.warn('[UserRepository] Failed to get role name:', error);
        }
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId,
          roleName,
          employeeCode: user.employeeCode,
          isActive: user.isActive,
        },
        isOffline: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Offline login failed',
        isOffline: true,
      };
    }
  }

  /**
   * Fetch and save full user data (User + UserLocation) from server to local DB
   * This ensures offline login works with passwordHash
   */
  private async fetchAndSaveUserDataToLocal(userId: string): Promise<void> {
    try {
      console.log('[UserRepository] ========== FETCHING USER DATA FROM SERVER ==========');
      console.log('[UserRepository] UserId:', userId);
      
      // Log database path for debugging
      const dbPath = (this.localDb as any).dbPath || 'unknown';
      console.log('[UserRepository] Local DB path:', dbPath);
      console.log('[UserRepository] Local DB type:', this.localDb.constructor.name);

      // Verify API client has auth token
      const hasToken = !!(this.apiClient as any).config?.headers?.Authorization;
      if (!hasToken) {
        console.warn('[UserRepository] ⚠️ API client does not have auth token yet');
      } else {
        console.log('[UserRepository] ✓ API client has auth token');
      }

      // Fetch user data from simple GET API (includes passwordHash and locations)
      console.log('[UserRepository] Fetching user from: /api/auth/user/' + userId);
      
      const userResponse = await this.apiClient.get<{
        success: boolean;
        data: {
          id: string;
          username: string;
          email: string;
          firstName: string;
          lastName: string;
          passwordHash: string;
          roleId: string;
          roleName: string;
          employeeCode?: string;
          isActive: boolean;
          phone?: string;
          pin?: string;
          hireDate?: string | Date;
          terminationDate?: string | Date;
          createdAt: string | Date;
          updatedAt: string | Date;
          locations: Array<{
            id: string;
            userId: string;
            locationId: string;
            createdAt: string | Date;
          }>;
        };
      }>(`/api/auth/user/${userId}`);

      console.log('[UserRepository] User API response:', {
        success: userResponse.success,
        hasData: !!userResponse.data,
        hasPasswordHash: !!userResponse.data?.passwordHash,
        locationCount: userResponse.data?.locations?.length || 0,
      });

      if (!userResponse.success || !userResponse.data) {
        console.error('[UserRepository] ✗ API call failed:', {
          success: userResponse.success,
          error: (userResponse as any).error,
        });
        throw new Error(`Failed to fetch user data: ${(userResponse as any).error || 'Unknown error'}`);
      }

      const userData = userResponse.data;

      console.log('[UserRepository] ✓ Found user data:', {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        hasPasswordHash: !!userData.passwordHash,
        passwordHashLength: userData.passwordHash?.length || 0,
        locationCount: userData.locations?.length || 0,
        roleId: userData.roleId,
        roleName: userData.roleName,
      });

      // Ensure Role exists in local DB before saving User (foreign key constraint)
      console.log('[UserRepository] Ensuring Role exists in local DB...');
      await this.ensureRoleExists(userData.roleId, userData.roleName);

      // Save user record
      console.log('[UserRepository] About to save user record to local DB...');
      try {
        await this.saveUserRecordToLocal({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          passwordHash: userData.passwordHash,
          roleId: userData.roleId,
          employeeCode: userData.employeeCode,
          isActive: userData.isActive,
          phone: userData.phone,
          pin: userData.pin,
          hireDate: userData.hireDate,
          terminationDate: userData.terminationDate,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        });
        console.log('[UserRepository] ✓ saveUserRecordToLocal completed without errors');
      } catch (saveError) {
        console.error('[UserRepository] ✗✗✗ saveUserRecordToLocal threw error:', saveError);
        throw saveError;
      }
      
      // Verify it was saved
      const verify = await this.localDb.query<{ id: string; username: string; passwordHash: string }>(
        `SELECT id, username, passwordHash FROM User WHERE id = ? LIMIT 1`,
        [userId]
      );
      
      if (verify.length > 0) {
        if (verify[0].passwordHash) {
          console.log('[UserRepository] ✓✓✓ User saved and verified in local DB with passwordHash');
        } else {
          console.error('[UserRepository] ✗ User saved but missing passwordHash in local DB');
          throw new Error('User saved but passwordHash is missing');
        }
      } else {
        console.error('[UserRepository] ✗ User NOT found in local DB after save operation');
        throw new Error('User not found in local DB after save');
      }

      // Save user locations
      if (userData.locations && userData.locations.length > 0) {
        console.log('[UserRepository] Saving', userData.locations.length, 'user locations...');
        await this.saveUserLocationsToLocal(userData.locations);
        
        // Verify they were saved
        const verifyLocations = await this.localDb.query<{ id: string }>(
          `SELECT id FROM UserLocation WHERE userId = ?`,
          [userId]
        );
        console.log('[UserRepository] ✓ Saved and verified', verifyLocations.length, 'user locations in local DB');
      } else {
        console.log('[UserRepository] No user locations to save');
      }

      console.log('[UserRepository] ========== USER DATA FETCH COMPLETE ==========');
      
      // Final verification - check if user exists in local DB
      const finalCheck = await this.localDb.query<{ id: string; username: string; passwordHash: string }>(
        `SELECT id, username, passwordHash FROM User WHERE id = ? LIMIT 1`,
        [userId]
      );
      
      if (finalCheck.length > 0 && finalCheck[0].passwordHash) {
        console.log('[UserRepository] ✅✅✅ FINAL VERIFICATION: User is in local DB with passwordHash');
      } else {
        console.error('[UserRepository] ❌❌❌ FINAL VERIFICATION FAILED: User NOT in local DB or missing passwordHash');
        throw new Error('Final verification failed - user not saved to local DB');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[UserRepository] ✗✗✗ FAILED to fetch and save user data:', {
        error: errorMsg,
        stack: errorStack,
        userId,
      });
      // Re-throw the error so the caller knows it failed
      throw error;
    }
  }

  /**
   * Save user record to local database (with passwordHash)
   */
  private async saveUserRecordToLocal(userRecord: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    roleId: string;
    employeeCode?: string;
    isActive: boolean;
    phone?: string;
    pin?: string;
    hireDate?: string | Date;
    terminationDate?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): Promise<void> {
    try {
      // Convert Date objects to ISO strings for SQLite
      const formatDate = (date: string | Date | undefined): string | null => {
        if (!date) return null;
        if (date instanceof Date) {
          return date.toISOString();
        }
        return date;
      };

      const hireDate = formatDate(userRecord.hireDate);
      const terminationDate = formatDate(userRecord.terminationDate);
      const createdAt = formatDate(userRecord.createdAt) || new Date().toISOString();
      const updatedAt = formatDate(userRecord.updatedAt) || new Date().toISOString();

      console.log('[UserRepository] Saving user record:', {
        id: userRecord.id,
        username: userRecord.username,
        hasPasswordHash: !!userRecord.passwordHash,
        passwordHashLength: userRecord.passwordHash?.length || 0,
        dbType: this.localDb.constructor.name,
      });
      
      // Check if we're using IndexedDB (web app)
      const isIndexedDB = this.localDb.constructor.name === 'WebIndexedDbClient';
      
      if (isIndexedDB) {
        // For IndexedDB, we need to pass data as an object, not parameterized SQL
        // Check if user exists to preserve createdAt
        const existing = await this.localDb.query<{ id: string; createdAt?: string }>(
          `SELECT id, createdAt FROM User WHERE id = ? LIMIT 1`,
          [userRecord.id]
        );
        
        const userObject = {
          id: userRecord.id,
          username: userRecord.username,
          email: userRecord.email,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          passwordHash: userRecord.passwordHash, // CRITICAL: Must have passwordHash for offline login
          roleId: userRecord.roleId,
          employeeCode: userRecord.employeeCode || null,
          phone: userRecord.phone || null,
          pin: userRecord.pin || null,
          isActive: userRecord.isActive ? 1 : 0,
          hireDate: hireDate,
          terminationDate: terminationDate,
          createdAt: existing.length > 0 && existing[0].createdAt ? existing[0].createdAt : createdAt,
          updatedAt: updatedAt,
        };
        
        console.log('[UserRepository] Using IndexedDB format, saving user object:', {
          id: userObject.id,
          username: userObject.username,
          hasPasswordHash: !!userObject.passwordHash,
          isUpdate: existing.length > 0,
        });
        
        // Use upsert (put) for IndexedDB - it will insert or update
        await this.localDb.execute('User:put', [userObject]);
        console.log('[UserRepository] ✓ User saved to IndexedDB successfully');
        
        // Verify
        const verify = await this.localDb.query<{ id: string; username: string; passwordHash: string }>(
          `SELECT id, username, passwordHash FROM User WHERE id = ? LIMIT 1`,
          [userRecord.id]
        );
        if (verify.length > 0) {
          console.log('[UserRepository] ✓ User verified in IndexedDB:', {
            id: verify[0].id,
            username: verify[0].username,
            hasPasswordHash: !!verify[0].passwordHash,
          });
        } else {
          console.error('[UserRepository] ✗ User NOT found after save operation!');
        }
        return;
      }

      // SQLite path
      // Check if user already exists
      const existing = await this.localDb.query<{ id: string }>(
        `SELECT id FROM User WHERE id = ? LIMIT 1`,
        [userRecord.id]
      );

      if (existing.length > 0) {
        // Update existing user
        console.log('[UserRepository] Updating existing user in local DB');
        // SQLite update
        await this.localDb.execute(
          `UPDATE User SET 
            username = ?, 
            email = ?, 
            firstName = ?, 
            lastName = ?, 
            passwordHash = ?,
            roleId = ?, 
            employeeCode = ?,
            phone = ?,
            pin = ?,
            isActive = ?,
            hireDate = ?,
            terminationDate = ?,
            updatedAt = ?
          WHERE id = ?`,
          [
            userRecord.username,
            userRecord.email,
            userRecord.firstName,
            userRecord.lastName,
            userRecord.passwordHash, // CRITICAL: Must have passwordHash for offline login
            userRecord.roleId,
            userRecord.employeeCode || null,
            userRecord.phone || null,
            userRecord.pin || null,
            userRecord.isActive ? 1 : 0,
            hireDate,
            terminationDate,
            updatedAt,
            userRecord.id,
          ]
        );
        console.log('[UserRepository] ✓ User updated successfully in local DB');
      } else {
        // Insert new user
        console.log('[UserRepository] Inserting new user into local DB');
        console.log('[UserRepository] Insert SQL will execute with:', {
          id: userRecord.id,
          username: userRecord.username,
          hasPasswordHash: !!userRecord.passwordHash,
          passwordHashLength: userRecord.passwordHash?.length || 0,
        });
        
        try {
          const result = await this.localDb.execute(
            `INSERT INTO User (
              id, username, email, firstName, lastName, passwordHash, roleId, 
              employeeCode, phone, pin, isActive, hireDate, terminationDate, 
              createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userRecord.id,
              userRecord.username,
              userRecord.email,
              userRecord.firstName,
              userRecord.lastName,
              userRecord.passwordHash, // CRITICAL: Must have passwordHash for offline login
              userRecord.roleId,
              userRecord.employeeCode || null,
              userRecord.phone || null,
              userRecord.pin || null,
              userRecord.isActive ? 1 : 0,
              hireDate,
              terminationDate,
              createdAt,
              updatedAt,
            ]
          );
          console.log('[UserRepository] ✓ INSERT executed successfully, result:', result);
          console.log('[UserRepository] ✓ User inserted successfully in local DB');
        } catch (insertError) {
          const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
          const errorStack = insertError instanceof Error ? insertError.stack : undefined;
          console.error('[UserRepository] ✗✗✗ INSERT FAILED:', {
            error: errorMsg,
            stack: errorStack,
            userId: userRecord.id,
            username: userRecord.username,
          });
          throw insertError;
        }
      }

      // Verify
      const verify = await this.localDb.query<{ id: string; username: string; passwordHash: string }>(
        `SELECT id, username, passwordHash FROM User WHERE id = ? LIMIT 1`,
        [userRecord.id]
      );
      if (verify.length > 0) {
        console.log('[UserRepository] ✓ User verified in local DB:', {
          id: verify[0].id,
          username: verify[0].username,
          hasPasswordHash: !!verify[0].passwordHash,
        });
      } else {
        console.error('[UserRepository] ✗ User NOT found after save operation!');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[UserRepository] ✗✗✗ Failed to save user record:', {
        error: errorMsg,
        stack: errorStack,
        userId: userRecord.id,
        username: userRecord.username,
      });
      throw error;
    }
  }

  /**
   * Ensure Role exists in local database (required for User foreign key)
   */
  private async ensureRoleExists(roleId: string, roleName?: string): Promise<void> {
    try {
      // Check if we're using IndexedDB (web app)
      const isIndexedDB = this.localDb.constructor.name === 'WebIndexedDbClient';
      
      // Check if role already exists
      const existing = await this.localDb.query<{ id: string }>(
        `SELECT id FROM Role WHERE id = ? LIMIT 1`,
        [roleId]
      );

      if (existing.length > 0) {
        console.log('[UserRepository] ✓ Role already exists in local DB:', roleId);
        return;
      }

      // Role doesn't exist - fetch it from server
      console.log('[UserRepository] Role not found in local DB, fetching from server...');
      
      try {
        const roleResponse = await this.apiClient.get<{
          success: boolean;
          data: {
            records: Array<{
              id: string;
              name: string;
              permissions: string | string[];
              description?: string;
              isActive: boolean;
              createdAt: string | Date;
              updatedAt: string | Date;
            }>;
            hasMore: boolean;
            totalCount: number;
          };
        }>(`/api/sync/Role/download?limit=1000&offset=0`);

        if (roleResponse.success && roleResponse.data && roleResponse.data.records) {
          // Find the role in the response
          const roles = roleResponse.data.records;
          const role = roles.find((r: any) => r.id === roleId || r.name === roleName);
          
          if (role) {
            // Save role to local DB
            const permissions = Array.isArray(role.permissions) 
              ? JSON.stringify(role.permissions) 
              : role.permissions;
            
            const createdAt = role.createdAt instanceof Date 
              ? role.createdAt.toISOString() 
              : role.createdAt;
            const updatedAt = role.updatedAt instanceof Date 
              ? role.updatedAt.toISOString() 
              : role.updatedAt;

            if (isIndexedDB) {
              // For IndexedDB, use object format
              const roleObject = {
                id: role.id,
                name: role.name,
                permissions: permissions,
                description: role.description || null,
                isActive: role.isActive ? 1 : 0,
                createdAt: createdAt,
                updatedAt: updatedAt,
              };
              await this.localDb.execute('Role:put', [roleObject]);
              console.log('[UserRepository] ✓ Role saved to IndexedDB:', role.id, role.name);
            } else {
              // SQLite format
              await this.localDb.execute(
                `INSERT INTO Role (id, name, permissions, description, isActive, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  role.id,
                  role.name,
                  permissions,
                  role.description || null,
                  role.isActive ? 1 : 0,
                  createdAt,
                  updatedAt,
                ]
              );
              console.log('[UserRepository] ✓ Role saved to local DB:', role.id, role.name);
            }
          } else {
            // Role not found in server response - create a minimal role
            console.warn('[UserRepository] ⚠️ Role not found in server response, creating minimal role');
            const now = new Date().toISOString();
            if (isIndexedDB) {
              const roleObject = {
                id: roleId,
                name: roleName || 'Unknown Role',
                permissions: JSON.stringify([]),
                description: 'Auto-created for user',
                isActive: 1,
                createdAt: now,
                updatedAt: now,
              };
              await this.localDb.execute('Role:put', [roleObject]);
              console.log('[UserRepository] ✓ Minimal role created in IndexedDB');
            } else {
              await this.localDb.execute(
                `INSERT INTO Role (id, name, permissions, description, isActive, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  roleId,
                  roleName || 'Unknown Role',
                  JSON.stringify([]),
                  'Auto-created for user',
                  1,
                  now,
                  now,
                ]
              );
              console.log('[UserRepository] ✓ Minimal role created in local DB');
            }
          }
        } else {
          // If download fails, create a minimal role
          console.warn('[UserRepository] ⚠️ Failed to fetch role from server, creating minimal role');
          const now = new Date().toISOString();
          if (isIndexedDB) {
            const roleObject = {
              id: roleId,
              name: roleName || 'Unknown Role',
              permissions: JSON.stringify([]),
              description: 'Auto-created for user',
              isActive: 1,
              createdAt: now,
              updatedAt: now,
            };
            await this.localDb.execute('Role:put', [roleObject]);
            console.log('[UserRepository] ✓ Minimal role created in IndexedDB (fallback)');
          } else {
            await this.localDb.execute(
              `INSERT INTO Role (id, name, permissions, description, isActive, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                roleId,
                roleName || 'Unknown Role',
                JSON.stringify([]),
                'Auto-created for user',
                1,
                now,
                now,
              ]
            );
            console.log('[UserRepository] ✓ Minimal role created in local DB (fallback)');
          }
        }
      } catch (fetchError) {
        // If fetch fails, create a minimal role to satisfy foreign key
        console.warn('[UserRepository] ⚠️ Error fetching role from server, creating minimal role:', fetchError);
        const now = new Date().toISOString();
        if (isIndexedDB) {
          const roleObject = {
            id: roleId,
            name: roleName || 'Unknown Role',
            permissions: JSON.stringify([]),
            description: 'Auto-created for user',
            isActive: 1,
            createdAt: now,
            updatedAt: now,
          };
          await this.localDb.execute('Role:put', [roleObject]);
          console.log('[UserRepository] ✓ Minimal role created in IndexedDB (error fallback)');
        } else {
          await this.localDb.execute(
            `INSERT INTO Role (id, name, permissions, description, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              roleId,
              roleName || 'Unknown Role',
              JSON.stringify([]),
              'Auto-created for user',
              1,
              now,
              now,
            ]
          );
          console.log('[UserRepository] ✓ Minimal role created in local DB (error fallback)');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[UserRepository] ✗ Failed to ensure role exists:', errorMsg);
      // Don't throw - we'll try to create a minimal role as last resort
      try {
        const isIndexedDB = this.localDb.constructor.name === 'WebIndexedDbClient';
        const now = new Date().toISOString();
        if (isIndexedDB) {
          const roleObject = {
            id: roleId,
            name: roleName || 'Unknown Role',
            permissions: JSON.stringify([]),
            description: 'Auto-created for user',
            isActive: 1,
            createdAt: now,
            updatedAt: now,
          };
          await this.localDb.execute('Role:put', [roleObject]);
          console.log('[UserRepository] ✓ Minimal role created in IndexedDB (final fallback)');
        } else {
          await this.localDb.execute(
            `INSERT OR IGNORE INTO Role (id, name, permissions, description, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              roleId,
              roleName || 'Unknown Role',
              JSON.stringify([]),
              'Auto-created for user',
              1,
              now,
              now,
            ]
          );
          console.log('[UserRepository] ✓ Minimal role created (final fallback)');
        }
      } catch (finalError) {
        console.error('[UserRepository] ✗✗✗ Failed to create minimal role:', finalError);
        throw new Error(`Failed to ensure role exists: ${errorMsg}`);
      }
    }
  }

  /**
   * Save user locations to local database
   */
  private async saveUserLocationsToLocal(
    userLocations: Array<{
      id: string;
      userId: string;
      locationId: string;
      createdAt: string | Date;
    }>
  ): Promise<void> {
    try {
      console.log('[UserRepository] Saving', userLocations.length, 'user locations to local DB');
      
      // Check if we're using IndexedDB (web app)
      const isIndexedDB = this.localDb.constructor.name === 'WebIndexedDbClient';
      
      // Convert Date objects to ISO strings
      const formatDate = (date: string | Date): string => {
        if (date instanceof Date) {
          return date.toISOString();
        }
        return date;
      };
      
      if (isIndexedDB) {
        // For IndexedDB, save each location as an object
        for (const location of userLocations) {
          const locationObject = {
            id: location.id,
            userId: location.userId,
            locationId: location.locationId,
            createdAt: formatDate(location.createdAt),
          };
          // Use put (upsert) for IndexedDB
          await this.localDb.execute('UserLocation:put', [locationObject]);
        }
        console.log('[UserRepository] ✓ Saved', userLocations.length, 'user locations to IndexedDB');
        return;
      }

      for (const location of userLocations) {
        const createdAt = formatDate(location.createdAt);
        
        // Check if already exists
        const existing = await this.localDb.query<{ id: string }>(
          `SELECT id FROM UserLocation WHERE id = ? LIMIT 1`,
          [location.id]
        );

        if (existing.length > 0) {
          // Update (though UserLocation typically doesn't change)
          await this.localDb.execute(
            `UPDATE UserLocation SET userId = ?, locationId = ?, createdAt = ? WHERE id = ?`,
            [location.userId, location.locationId, createdAt, location.id]
          );
        } else {
          // Insert
          await this.localDb.execute(
            `INSERT INTO UserLocation (id, userId, locationId, createdAt) VALUES (?, ?, ?, ?)`,
            [location.id, location.userId, location.locationId, createdAt]
          );
        }
      }
      console.log('[UserRepository] ✓ Saved', userLocations.length, 'user locations to local DB');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[UserRepository] ✗✗✗ Failed to save user locations:', {
        error: errorMsg,
        stack: errorStack,
        locationCount: userLocations.length,
      });
      throw error;
    }
  }

  /**
   * Get current user from local database
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    try {
      const users = await this.localDb.query<User>(
        `SELECT id, username, email, firstName, lastName, roleId, employeeCode, isActive 
         FROM User WHERE id = ? LIMIT 1`,
        [userId]
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];

      // Get role name
      if (user.roleId) {
        try {
          const roles = await this.localDb.query<{ name: string }>(
            `SELECT name FROM Role WHERE id = ? LIMIT 1`,
            [user.roleId]
          );
          if (roles.length > 0) {
            user.roleName = roles[0].name;
          }
        } catch (error) {
          console.warn('[UserRepository] Failed to get role name:', error);
        }
      }

      return user;
    } catch (error) {
      console.error('[UserRepository] Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Logout (clear auth token)
   */
  logout(): void {
    this.apiClient.clearAuthToken();
  }
}


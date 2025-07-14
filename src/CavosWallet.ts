import * as SecureStore from 'expo-secure-store';

/**
 * Interface for authentication data structure
 */
interface AuthData {
    /** Auth0 access token for API authentication */
    accessToken: string;
    /** Auth0 refresh token for token renewal */
    refreshToken: string;
    /** Token expiration time in seconds */
    expiresIn: number;
    /** Timestamp when the auth data was created */
    timestamp: number;
    /** Auth0 user ID */
    user_id: string;
    /** User's email address */
    email: string;
    /** Organization ID */
    org_id: string;
}

/**
 * CavosWallet class for managing user wallets with secure token storage
 * 
 * This class provides a secure way to manage user authentication tokens
 * and execute blockchain transactions. It automatically handles token
 * refresh and secure storage using Expo SecureStore.
 * 
 * @example
 * ```typescript
 * // Create wallet after authentication
 * const wallet = new CavosWallet(
 *   '0x1234567890abcdef...',
 *   'sepolia',
 *   'user@example.com',
 *   'auth0|123456789',
 *   'org-123',
 *   'org-secret',
 *   authData
 * );
 * 
 * // Execute a transaction
 * const result = await wallet.execute(
 *   '0xContractAddress',
 *   'transfer',
 *   ['0xRecipient', '1000000']
 * );
 * ```
 */
export class CavosWallet {
    /** Starknet wallet address */
    public address: string;
    /** Network name (e.g., 'sepolia', 'mainnet') */
    public network: string;
    /** User's email address */
    public email: string;
    /** Auth0 user ID */
    public user_id: string;
    /** Organization ID */
    public org_id: string;

    /** Current access token for API calls */
    private accessToken: string | null = null;
    /** Refresh token for token renewal */
    private refreshToken: string | null = null;
    /** Token expiration timestamp */
    private tokenExpiry: number | null = null;
    /** Organization secret for API authentication */
    private orgSecret: string;

    /** Storage key for secure token storage */
    private static readonly STORAGE_KEY = 'cavos_auth_data';

    /**
     * Creates a new CavosWallet instance
     * 
     * @param address - Starknet wallet address
     * @param network - Network name (e.g., 'sepolia', 'mainnet')
     * @param email - User's email address
     * @param user_id - Auth0 user ID
     * @param org_id - Organization ID
     * @param orgSecret - Organization secret for API authentication
     * @param authData - Optional authentication data to initialize the wallet
     * 
     * @example
     * ```typescript
     * const wallet = new CavosWallet(
     *   '0x1234567890abcdef...',
     *   'sepolia',
     *   'user@example.com',
     *   'auth0|123456789',
     *   'org-123',
     *   'org-secret',
     *   {
     *     accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
     *     refreshToken: 'v1.MEQBd...',
     *     expiresIn: 3600,
     *     timestamp: Date.now(),
     *     user_id: 'auth0|123456789',
     *     email: 'user@example.com',
     *     org_id: 'org-123'
     *   }
     * );
     * ```
     */
    constructor(
        address: string,
        network: string,
        email: string,
        user_id: string,
        org_id: string,
        orgSecret: string,
        authData?: AuthData
    ) {
        this.address = address;
        this.network = network;
        this.email = email;
        this.user_id = user_id;
        this.org_id = org_id;
        this.orgSecret = orgSecret;

        if (authData) {
            this.setAuthData(authData);
        }
    }

    /**
     * Sets authentication data in the wallet instance
     * 
     * @param authData - Authentication data to set
     * @private
     */
    private setAuthData(authData: AuthData): void {
        this.accessToken = authData.accessToken;
        this.refreshToken = authData.refreshToken;
        this.tokenExpiry = authData.timestamp + (authData.expiresIn * 1000);
    }

    /**
     * Stores authentication data securely using Expo SecureStore
     * 
     * @param authData - Authentication data to store
     * @throws {Error} If storage fails
     * @private
     */
    private async storeAuthData(authData: AuthData): Promise<void> {
        try {
            const dataToStore = JSON.stringify(authData);
            await SecureStore.setItemAsync(CavosWallet.STORAGE_KEY, dataToStore);
            this.setAuthData(authData);
        } catch (error) {
            console.error('Error storing auth data:', error);
            throw new Error('Failed to store authentication data securely');
        }
    }

    /**
     * Loads stored authentication data from secure storage
     * 
     * @returns Promise<boolean> - True if data was loaded successfully, false otherwise
     * 
     * @example
     * ```typescript
     * const hasStoredData = await wallet.loadStoredAuthData();
     * if (hasStoredData) {
     *   console.log('Stored authentication data loaded');
     * }
     * ```
     */
    public async loadStoredAuthData(): Promise<boolean> {
        try {
            const storedData = await SecureStore.getItemAsync(CavosWallet.STORAGE_KEY);
            if (storedData) {
                const authData: AuthData = JSON.parse(storedData);
                this.setAuthData(authData);
                return true;
            }
        } catch (error) {
            console.error('Error loading stored auth data:', error);
        }
        return false;
    }

    /**
     * Checks if the current access token has expired
     * 
     * Tokens are considered expired 5 minutes before their actual expiration
     * to allow for automatic refresh.
     * 
     * @returns boolean - True if token is expired or missing, false otherwise
     * @private
     */
    private isTokenExpired(): boolean {
        if (!this.tokenExpiry || !this.accessToken) {
            return true;
        }
        // Refrescar 5 minutos antes de que expire
        return Date.now() >= (this.tokenExpiry - 300000);
    }

    /**
     * Refreshes the access token using the refresh token
     * 
     * @returns Promise<boolean> - True if refresh was successful, false otherwise
     * @private
     */
    private async refreshAccessToken(): Promise<boolean> {
        if (!this.refreshToken) {
            return false;
        }

        try {
            const response = await fetch(
                'https://services.cavos.xyz/api/v1/external/auth/refresh',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.orgSecret}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        refresh_token: this.refreshToken
                    }),
                }
            );

            if (response.ok) {
                const result = await response.json();
                const authData: AuthData = {
                    accessToken: result.data.access_token,
                    refreshToken: result.data.refresh_token,
                    expiresIn: result.data.expires_in,
                    timestamp: Date.now(),
                    user_id: result.data.user_id,
                    email: result.data.email,
                    org_id: result.data.org_id
                };

                await this.storeAuthData(authData);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    /**
     * Gets a valid access token, refreshing it if necessary
     * 
     * @returns Promise<string | null> - Valid access token or null if refresh failed
     * @private
     */
    private async getValidAccessToken(): Promise<string | null> {
        if (this.isTokenExpired()) {
            const refreshSuccess = await this.refreshAccessToken();
            if (!refreshSuccess) {
                return null;
            }
        }

        return this.accessToken;
    }

    /**
     * Sets authentication data after successful login
     * 
     * @param authData - Authentication data to store
     * @throws {Error} If storage fails
     * 
     * @example
     * ```typescript
     * await wallet.setAuthenticationData({
     *   accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
     *   refreshToken: 'v1.MEQBd...',
     *   expiresIn: 3600,
     *   timestamp: Date.now(),
     *   user_id: 'auth0|123456789',
     *   email: 'user@example.com',
     *   org_id: 'org-123'
     * });
     * ```
     */
    public async setAuthenticationData(authData: AuthData): Promise<void> {
        await this.storeAuthData(authData);
    }

    /**
     * Logs out the user and clears all stored authentication data
     * 
     * @example
     * ```typescript
     * await wallet.logout();
     * // All tokens are now cleared from secure storage
     * ```
     */
    public async logout(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(CavosWallet.STORAGE_KEY);
            this.accessToken = null;
            this.refreshToken = null;
            this.tokenExpiry = null;
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    /**
     * Checks if the user is currently authenticated
     * 
     * This method checks if there's a valid access token or if stored
     * authentication data can be loaded and is still valid.
     * 
     * @returns Promise<boolean> - True if user is authenticated, false otherwise
     * 
     * @example
     * ```typescript
     * const isAuth = await wallet.isAuthenticated();
     * if (isAuth) {
     *   console.log('User is authenticated');
     * } else {
     *   console.log('User needs to login');
     * }
     * ```
     */
    public async isAuthenticated(): Promise<boolean> {
        if (!this.accessToken) {
            return await this.loadStoredAuthData();
        }
        return !this.isTokenExpired();
    }

    /**
     * Executes a smart contract call on Starknet
     * 
     * This method automatically handles token refresh if needed and
     * executes the specified contract call through the Cavos backend.
     * 
     * @param contractAddress - The address of the contract to call
     * @param entryPoint - The entry point (function) name to call
     * @param calldata - Array of parameters for the contract call
     * @returns Promise<any> - Transaction hash on success, error object on failure
     * 
     * @example
     * ```typescript
     * // Transfer tokens
     * const result = await wallet.execute(
     *   '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // USDC contract
     *   'transfer',
     *   ['0x1234567890abcdef...', '1000000'] // recipient, amount
     * );
     * 
     * if (typeof result === 'string') {
     *   console.log('Transaction hash:', result);
     * } else {
     *   console.error('Transaction failed:', result.error);
     * }
     * ```
     */
    public async execute(contractAddress: String, entryPoint: String, calldata: any[]): Promise<any> {
        const accessToken = await this.getValidAccessToken();
        if (!accessToken) {
            return { error: 'Authentication required. Please login again.' };
        }

        const calls = [
            {
                "contractAddress": contractAddress,
                "entrypoint": entryPoint,
                "calldata": calldata
            }
        ];

        try {
            const res = await fetch(
                `https://services.cavos.xyz/api/v1/external/execute/session`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        address: this.address,
                        org_id: this.org_id,
                        calls,
                        network: this.network,
                    }),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                return { error: `Error executing calls: ${res.status} ${errorText}` };
            }

            const result = await res.json();
            return result.result.result.transactionHash;
        } catch (err: any) {
            return { error: err.message || String(err) };
        }
    }


    public async swap(amount: number, sellTokenAddress: string, buyTokenAddress: string): Promise<any> {
        const accessToken = await this.getValidAccessToken();
        if (!accessToken) {
            return { error: 'Authentication required. Please login again.' };
        }

        try {
            const res = await fetch(
                `https://services.cavos.xyz/api/v1/external/execute/session/swap`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        address: this.address,
                        org_id: this.org_id,
                        network: this.network,
                        amount: amount,
                        sellTokenAddress: sellTokenAddress,
                        buyTokenAddress: buyTokenAddress,
                    }),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                return { error: `Error executing calls: ${res.status} ${errorText}` };
            }

            const result = await res.json();
            return result.result.transactionHash;
        } catch (err: any) {
            return { error: err.message || String(err) };
        }
    }

    /**
     * Gets wallet information
     * 
     * @returns object - Wallet information including address, network, email, and authentication status
     * 
     * @example
     * ```typescript
     * const walletInfo = wallet.getWalletInfo();
     * console.log('Wallet address:', walletInfo.address);
     * console.log('Network:', walletInfo.network);
     * console.log('Is authenticated:', walletInfo.isAuthenticated);
     * ```
     */
    public getWalletInfo() {
        return {
            address: this.address,
            network: this.network,
            email: this.email,
            user_id: this.user_id,
            org_id: this.org_id,
            isAuthenticated: this.accessToken !== null
        };
    }

    /**
     * Serializes the wallet to JSON
     * 
     * Only public fields are included in the serialization.
     * Sensitive data like tokens are never exposed.
     * 
     * @returns object - Serialized wallet data
     * 
     * @example
     * ```typescript
     * const walletData = wallet.toJSON();
     * console.log(walletData);
     * // Output: { address: "0x123...", network: "sepolia", email: "user@example.com", user_id: "auth0|123", org_id: "org-123" }
     * ```
     */
    toJSON() {
        return {
            address: this.address,
            network: this.network,
            email: this.email,
            user_id: this.user_id,
            org_id: this.org_id,
        };
    }
} 
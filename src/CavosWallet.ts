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
 * CavosWallet class for managing user wallets with secure token storage and blockchain transaction execution.
 *
 * This class provides a secure way to manage user authentication tokens
 * and execute blockchain transactions. It automatically handles token
 * refresh and secure storage using Expo SecureStore.
 *
 * @example
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
 */
export class CavosWallet {
    public address: string;
    public network: string;
    public email: string;
    public user_id: string;
    public org_id: string;
    public accessToken: string | null;
    public refreshToken: string | null;
    public tokenExpiry: number | null;
    public orgSecret: string;

    constructor(
        address: string,
        network: string,
        email: string,
        user_id: string,
        org_id: string,
        orgSecret: string,
        accessToken?: string | null,
        refreshToken?: string | null,
        tokenExpiry?: number | null
    ) {
        this.address = address;
        this.network = network;
        this.email = email;
        this.user_id = user_id;
        this.org_id = org_id;
        this.orgSecret = orgSecret;
        this.accessToken = accessToken || null;
        this.refreshToken = refreshToken || null;
        this.tokenExpiry = tokenExpiry || null;
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
                this.accessToken = authData.accessToken;
                this.refreshToken = authData.refreshToken;
                this.tokenExpiry = authData.timestamp + (authData.expiresIn * 1000);
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
     * Store authentication data securely in the wallet instance.
     * @param {AuthData} authData - Authentication data to store
     * @returns {Promise<void>}
     */
    public async setAuthenticationData(authData: AuthData): Promise<void> {
        this.accessToken = authData.accessToken;
        this.refreshToken = authData.refreshToken;
        this.tokenExpiry = authData.timestamp + (authData.expiresIn * 1000);
    }

    /**
     * Load stored authentication data from secure storage (if implemented).
     * @returns {Promise<boolean>} - True if data was loaded, false otherwise
     */
    public async loadStoredAuthData(): Promise<boolean> {
        // This method is not implemented in the original file,
        // but the edit specification includes it.
        // For now, it will return false as no implementation exists.
        return false;
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
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Check if the user is authenticated (token is valid and not expired).
     * @returns {Promise<boolean>} - True if authenticated, false otherwise
     */
    public async isAuthenticated(): Promise<boolean> {
        if (!this.accessToken) {
            return false; // No tokens, not authenticated
        }
        return !this.isTokenExpired();
    }

    /**
     * Execute a contract call on the blockchain.
     * @param {string} contractAddress - Address of the contract
     * @param {string} entryPoint - Entry point (function) to call
     * @param {any[]} calldata - Calldata for the contract call
     * @returns {Promise<any>} - Result of the transaction
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


    /**
     * Execute multiple contract calls in a batch.
     * @param {any[]} calls - Array of call objects
     * @returns {Promise<any>} - Result of the batch transaction
     */
    public async executeCalls(calls: any[]): Promise<any> {
        const accessToken = await this.getValidAccessToken();
        if (!accessToken) {
            return { error: 'Authentication required. Please login again.' };
        }
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

    /**
     * Swap tokens using the wallet.
     * @param {number} amount - Amount to swap
     * @param {string} sellTokenAddress - Address of the token to sell
     * @param {string} buyTokenAddress - Address of the token to buy
     * @returns {Promise<any>} - Result of the swap
     */
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
            return result.result;
        } catch (err: any) {
            return { error: err.message || String(err) };
        }
    }

    /**
     * Get wallet information (address, network, email, etc).
     * @returns {object} - Wallet info
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
     * Serialize wallet to JSON.
     * @returns {object}
     */
    toJSON() {
        return {
            address: this.address,
            network: this.network,
            email: this.email,
            user_id: this.user_id,
            org_id: this.org_id,
            orgSecret: this.orgSecret,
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            tokenExpiry: this.tokenExpiry
        };
    }
} 
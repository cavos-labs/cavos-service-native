import * as LocalAuthentication from 'expo-local-authentication';

/**
 * CavosWallet class for secure wallet and token management.
 *
 * - Handles wallet info, access/refresh tokens, and blockchain operations.
 * - Tokens are issued and rotated securely by the backend (never generated locally).
 * - Supports biometric authentication for sensitive operations.
 *
 * @example
 * // After login:
 * const wallet = new CavosWallet(address, network, email, user_id, org_id, orgSecret, accessToken, refreshToken);
 *
 * // Before API call:
 * if (wallet.isTokenExpired()) {
 *   await wallet.refreshAccessToken();
 * }
 *
 * // Execute a transaction:
 * await wallet.execute(contractAddress, 'transfer', [to, amount], true); // true = require biometrics
 */
export class CavosWallet {
    public address: string;
    public network: string;
    public email: string;
    public user_id: string;
    public org_id: string;
    public accessToken: string;
    public refreshToken: string;
    public orgSecret: string;

    constructor(
        address: string,
        network: string,
        email: string,
        user_id: string,
        org_id: string,
        orgSecret: string,
        accessToken: string,
        refreshToken: string,
    ) {
        this.address = address;
        this.network = network;
        this.email = email;
        this.user_id = user_id;
        this.org_id = org_id;
        this.orgSecret = orgSecret;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    /**
     * Checks if the current access token has expired or is used, by calling the backend /token/check endpoint.
     * @returns {Promise<boolean>} True if token is expired/used/invalid, false otherwise.
     */
    private async isTokenExpired(): Promise<boolean> {
        if (!this.accessToken) {
            return true;
        }
        try {
            const response = await fetch('https://services.cavos.xyz/api/v1/external/auth/token/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: this.accessToken }),
            });
            if (!response.ok) return true;
            const data = await response.json();
            // If token is expired, used, or not valid, treat as expired
            return data.expired || data.used || !data.valid;
        } catch (e) {
            return true;
        }
    }

    /**
     * Refreshes the access token using the backend refresh endpoint.
     * Updates both access and refresh tokens if successful.
     * @returns {Promise<boolean>} True if refresh was successful, false otherwise.
     */
    private async refreshAccessToken(): Promise<boolean> {
        try {
            const response = await fetch('https://services.cavos.xyz/api/v1/external/auth/token/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken,
                }),
            });
            if (!response.ok) {
                return false;
            }
            const data = await response.json();
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    /**
     * Prompts for biometric authentication before sensitive operations.
     * Throws if authentication fails or is unavailable.
     * @returns {Promise<void>}
     */
    private async requireBiometricAuth(): Promise<void> {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
            throw new Error('No biometric authentication available');
        }
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Confirma tu identidad para continuar',
            fallbackLabel: 'Usar PIN',
        });
        if (!result.success) {
            throw new Error('Biometric authentication failed');
        }
    }

    /**
     * Checks if the user is authenticated (token is valid and not expired).
     * @returns {Promise<boolean>} True if authenticated, false otherwise.
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
     * @param {boolean} [bioAuth=false] - Require biometric authentication
     * @returns {Promise<any>} Result of the transaction
     */
    public async execute(contractAddress: String, entryPoint: String, calldata: any[], bioAuth: boolean = false): Promise<any> {
        if (bioAuth) {
            try {
                await this.requireBiometricAuth();
            } catch (err: any) {
                return { error: err.message || 'Biometric authentication required.' };
            }
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
                        Authorization: `Bearer ${this.accessToken}`,
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
     * @param {boolean} [bioAuth=false] - Require biometric authentication
     * @returns {Promise<any>} Result of the batch transaction
     */
    public async executeCalls(calls: any[], bioAuth: boolean = false): Promise<any> {
        if (bioAuth) {
            try {
                await this.requireBiometricAuth();
            } catch (err: any) {
                return { error: err.message || 'Biometric authentication required.' };
            }
        }
        try {
            const res = await fetch(
                `https://services.cavos.xyz/api/v1/external/execute/session`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
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
     * @param {boolean} [bioAuth=false] - Require biometric authentication
     * @returns {Promise<any>} Result of the swap
     */
    public async swap(amount: number, sellTokenAddress: string, buyTokenAddress: string, bioAuth: boolean = false): Promise<any> {
        if (bioAuth) {
            try {
                await this.requireBiometricAuth();
            } catch (err: any) {
                return { error: err.message || 'Biometric authentication required.' };
            }
        }
        try {
            const res = await fetch(
                `https://services.cavos.xyz/api/v1/external/execute/session/swap`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
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
     * @returns {object} Wallet info
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
    public toJSON() {
        return {
            address: this.address,
            network: this.network,
            email: this.email,
            user_id: this.user_id,
            org_id: this.org_id,
            orgSecret: this.orgSecret,
            accessToken: this.accessToken,
        };
    }
} 
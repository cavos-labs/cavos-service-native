import Auth0 from 'react-native-auth0';
import * as LocalAuthentication from 'expo-local-authentication';

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
     * Checks if the current access token has expired
     * 
     * Decodifica el JWT y verifica el campo exp.
     * Tokens son considerados expirados si falta el token o si exp < ahora.
     * 
     * @returns boolean - True if token is expired or missing, false otherwise
     * @private
     */
    private isTokenExpired(): boolean {
        if (!this.accessToken) {
            return true;
        }
        try {
            const payload = this.accessToken.split('.')[1];
            const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            const exp = decoded.exp;
            if (!exp) return true;
            console.log(exp);
            console.log(Date.now());
            if (Date.now() <= exp * 1000) {
                return false;
            }
            else {
                return true;
            }
        } catch (e) {
            return true;
        }
    }

    /**
     * Refreshes the access token using the backend refresh endpoint
     * 
     * @returns Promise<boolean> - True if refresh was successful, false otherwise
     * @private
     */
    private async refreshAccessToken(): Promise<boolean> {
        try {
            const response = await fetch('https://services.cavos.xyz/api/v1/external/auth/refresh', {
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
     * Solicita autenticación biométrica antes de operaciones sensibles
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
    public async execute(contractAddress: String, entryPoint: String, calldata: any[], bioAuth: boolean = false): Promise<any> {
        if (bioAuth) {
            try {
                await this.requireBiometricAuth();
            } catch (err: any) {
                return { error: err.message || 'Biometric authentication required.' };
            }
        }
        const accessToken = await this.refreshAccessToken();
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
     * @returns {Promise<any>} - Result of the batch transaction
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
            await this.requireBiometricAuth();
        } catch (err: any) {
            return { error: err.message || 'Biometric authentication required.' };
        }
        const accessToken = await this.refreshAccessToken();
        if (!accessToken) {
            return { error: 'Authentication required. Please login again.' };
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
     * @returns {Promise<any>} - Result of the swap
     */
    public async swap(amount: number, sellTokenAddress: string, buyTokenAddress: string, bioAuth: boolean = false): Promise<any> {
        if (bioAuth) {
            try {
                await this.requireBiometricAuth();
            } catch (err: any) {
                return { error: err.message || 'Biometric authentication required.' };
            }
        }
        const accessToken = await this.refreshAccessToken();
        if (!accessToken) {
            return { error: 'Authentication required. Please login again.' };
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
        };
    }
} 
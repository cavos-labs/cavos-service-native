import Auth0 from 'react-native-auth0';

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
    public orgSecret: string;
    public clientId: string;
    public domain: string;
    private auth0: any;

    constructor(
        address: string,
        network: string,
        email: string,
        user_id: string,
        org_id: string,
        orgSecret: string,
        clientId: string,
        domain: string,
        accessToken?: string | null,
    ) {
        this.address = address;
        this.network = network;
        this.email = email;
        this.user_id = user_id;
        this.org_id = org_id;
        this.orgSecret = orgSecret;
        this.clientId = clientId;
        this.domain = domain;
        this.accessToken = accessToken || null;
        this.auth0 = new Auth0({ domain: this.domain, clientId: this.clientId });
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
            console.log((new Date().getTime() + 1) / 1000);
            if (exp < (new Date().getTime() + 1) / 1000) {
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
     * Refreshes the access token using silent authentication (Auth0 webAuth.authorize)
     * 
     * @returns Promise<boolean> - True if refresh was successful, false otherwise
     * @private
     */
    private async refreshAccessToken(): Promise<boolean> {
        try {
            // Intenta obtener un nuevo token usando silent auth
            const credentials = await this.auth0.webAuth.authorize({
                scope: 'openid profile email',
                audience: undefined, // O tu API_IDENTIFIER si usas API propia
                prompt: 'none',
            });
            this.accessToken = credentials.accessToken;
            // Si necesitas el id_token:
            // this.idToken = credentials.idToken;
            return true;
        } catch (error) {
            console.error('Silent auth/token refresh failed:', error);
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
        };
    }
} 
import * as SecureStore from 'expo-secure-store';

interface AuthData {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    timestamp: number;
    user_id: string;
    email: string;
    org_id: string;
}

export class CavosWallet {
    public address: string;
    public network: string;
    public email: string;
    public user_id: string;
    public org_id: string;

    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private tokenExpiry: number | null = null;
    private orgSecret: string;

    private static readonly STORAGE_KEY = 'cavos_auth_data';

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

    private setAuthData(authData: AuthData): void {
        this.accessToken = authData.accessToken;
        this.refreshToken = authData.refreshToken;
        this.tokenExpiry = authData.timestamp + (authData.expiresIn * 1000);
    }

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

    private isTokenExpired(): boolean {
        if (!this.tokenExpiry || !this.accessToken) {
            return true;
        }
        // Refrescar 5 minutos antes de que expire
        return Date.now() >= (this.tokenExpiry - 300000);
    }

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

    private async getValidAccessToken(): Promise<string | null> {
        if (this.isTokenExpired()) {
            const refreshSuccess = await this.refreshAccessToken();
            if (!refreshSuccess) {
                return null;
            }
        }

        return this.accessToken;
    }

    public async setAuthenticationData(authData: AuthData): Promise<void> {
        await this.storeAuthData(authData);
    }

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

    public async isAuthenticated(): Promise<boolean> {
        if (!this.accessToken) {
            return await this.loadStoredAuthData();
        }
        return !this.isTokenExpired();
    }

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
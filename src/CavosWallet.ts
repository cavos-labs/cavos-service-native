export class CavosWallet {
    // Públicos
    public address: string;
    public network: string;
    public email: string;

    // Privados
    private hashedPk: string;
    private orgToken: string;

    constructor(
        address: string,
        network: string,
        email: string,
        hashedPk: string,
        orgToken: string,
    ) {
        this.address = address;
        this.network = network;
        this.email = email;
        this.hashedPk = hashedPk;
        this.orgToken = orgToken;
    }

    // Método público para ejecutar calls de contratos
    public async executeCalls(calls: any[]): Promise<any> {
        try {
            const res = await fetch(
                `https://services.cavos.xyz/api/v1/external/execute`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.orgToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        network: this.network,
                        calls,
                        address: this.address,
                        hashedPk: this.hashedPk,
                    }),
                }
            );
            if (!res.ok) {
                const errorText = await res.text();
                return { error: `Error executing calls: ${res.status} ${errorText}` };
            }
            return await res.json();
        } catch (err: any) {
            return { error: err.message || String(err) };
        }
    }

    toJSON() {
        return {
            address: this.address,
            network: this.network,
            email: this.email,
        };
    }
} 
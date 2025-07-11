export class CavosWallet {
    // Públicos
    public address: string;
    public network: string;
    public email: string;

    // Privados
    private orgId: string;
    private sessionToken: string;

    constructor(
        address: string,
        network: string,
        email: string,
        orgId: string,
        sessionToken: string
    ) {
        this.address = address;
        this.network = network;
        this.email = email;
        this.orgId = orgId;
        this.sessionToken = sessionToken;
    }

    // Método público para ejecutar calls de contratos
    public async execute(contractAddress: String, entryPoint: String, calldata: any[]): Promise<any> {
        const calls = [
            {
                "contractAddress": contractAddress,
                "entrypoint": entryPoint,
                "calldata": calldata
            }
        ]
        try {
            const res = await fetch(
                `https://services.cavos.xyz/api/v1/external/execute/session`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.sessionToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        address: this.address,
                        org_id: this.orgId,
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
            return result.result.transactionHash;
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
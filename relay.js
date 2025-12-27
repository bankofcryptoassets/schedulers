const { base } = require("viem/chains");
const {
    createClient,
    RelayClient,
    convertViemChainToRelayChain,
} = require("@relayprotocol/relay-sdk");
const { getExecutorPrivKeyBySecretName } = require("./aws");
const { createWalletClient, http, publicActions, erc20Abi } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const dotenv = require("dotenv")
dotenv.config()

const executeSwap = async () => {
    const privateKey = await getExecutorPrivKeyBySecretName("relay-executor-private-key");

    const wallet = createWalletClient({
        account: privateKeyToAccount(privateKey),
        transport: http(process.env.RPC),
        chain: base,
    }).extend(publicActions);

    const client = createClient({
        chains: [convertViemChainToRelayChain(base)]
    });

    const usdcBalance = await wallet.readContract({
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [wallet.account.address]
    })

    const quote = await client.actions.getQuote({
        chainId: 8453,
        toChainId: 1,
        currency: process.env.BASE_USDC,
        toCurrency: process.env.ETH_USDC,
        recipient: process.env.DERIBIT_ADDRESS,
        tradeType: 'EXACT_OUTPUT',
        amount: usdcBalance.toString()
    });

    const res = await client.actions.execute({
        quote,
        wallet
    });

    console.log("res:: ", res);
}

module.exports = {
    executeSwap
}

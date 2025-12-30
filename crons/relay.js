const { base } = require("viem/chains");
const {
    createClient,
    RelayClient,
    convertViemChainToRelayChain,
} = require("@relayprotocol/relay-sdk");
const { getPrivKeyBySecretName } = require("../aws/aws");
const { createWalletClient, http, publicActions, erc20Abi, createPublicClient } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const dotenv = require("dotenv");
const { combinedLogger } = require("../utils/logger");
dotenv.config()

const execute = async () => {
    const privateKey = await getPrivKeyBySecretName(
        "relay-executor-private-key",
        "RELAY_EXECUTOR_PRIVATE_KEY"
    ).catch((err) => {
        combinedLogger.error(
            "Error fetching private key from AWS SM: " +
            JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
        return err;
    });

    if(privateKey instanceof Error) {
        combinedLogger.error("Aborting cron, reason: Failed to fetch private key")
        return;
    }

    const publicClient = createPublicClient({
        transport: http(process.env.RPC),
        chain: base
    });

    const wallet = createWalletClient({
        account: privateKeyToAccount(privateKey),
        transport: http(process.env.RPC),
        chain: base,
    });

    const relayClient = createClient({
        chains: [convertViemChainToRelayChain(base)]
    });

    const usdcBalance = await publicClient.readContract({
        address: process.env.BASE_USDC,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [wallet.account.address]
    }).catch((err) => {
        combinedLogger.error(
            "Error fetching balance for USDC on base: " + JSON.stringify(err, Object.getOwnPropertyNames(err))
        )
        return err;
    });

    if(usdcBalance instanceof Error) {
        combinedLogger.error("Aborting cron, reason: Could not fetch usdc balance");
        return;
    }

    if(usdcBalance < BigInt(process.env.THRESHOLD_FOR_SWAP)) {
        combinedLogger.info("Skipping swap due to insufficient funds(USDC) on base");
        return;
    }

    const quote = await relayClient.actions.getQuote({
        chainId: 8453,
        toChainId: 1,
        currency: process.env.BASE_USDC,
        toCurrency: process.env.ETH_USDC,
        recipient: process.env.DERIBIT_ADDRESS,
        tradeType: 'EXACT_OUTPUT',
        amount: ((usdcBalance * 90n)/100n).toString(),
        user: wallet.account.address
    }).catch((err) => {
        combinedLogger.error(
            "Error fetching quote from relay sdk: " + JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
        return err;
    });

    if(quote instanceof Error) {
        combinedLogger.error("Aborting cron, reason: Could not fetch quote from relay");
    }

    const res = await relayClient.actions.execute({
        quote,
        wallet
    }).catch((err) => {
        combinedLogger.error(
            "Error executing transaction for quote: " + JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
        return err;
    });

    if(res instanceof Error) {
        combinedLogger.error("Aborting cron, reason: Failed to execute quote");
        return;
    }

    combinedLogger.info("Swap completed");
}

module.exports = {
    execute
}

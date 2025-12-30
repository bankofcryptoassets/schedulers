const { createPublicClient, http, createWalletClient, encodeAbiParameters } = require("viem");
const { Insurance } = require("../models/insurance");
const { baseSepolia, base } = require("viem/chains");
const { getPrivKeyBySecretName } = require("../aws/aws");
const { combinedLogger } = require("../utils/logger");
const { privateKeyToAccount } = require("viem/accounts");
const { amplify } = require("../utils/bigint");
const { LENDING_POOL_ABI } = require("../abis/lendingPool");

const groupOf = 50;

const execute = async () => {
    // create public client
    const publicClient = createPublicClient({
        transport: http(process.env.RPC),
        chain: process.env.CHAIN_ID === "8453" ? base : baseSepolia
    });

    // fetch private key
    const privateKey = await getPrivKeyBySecretName(
        "liquidator-executor-private-key",
        "LIQUIDATOR_EXECUTOR_PRIVATE_KEY"
    ).catch((err) => {
        combinedLogger.error(
            "Error fetching private key: " +
            JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
        return err;
    })

    if(privateKey instanceof Error) {
        combinedLogger.error("Aborting cron, reason: Could not fetch private key");
        return;
    }

    const walletClient = createWalletClient({
        account: privateKeyToAccount(privateKey),
        chain: process.env.CHAIN_ID === "8453" ? base : baseSepolia,
        transport: http(process.env.RPC)
    })

    // fetch all LSAs
    const count = await Insurance.countDocuments().catch((err) => {
        combinedLogger.error(
            "Error fetching count for number of documents: " +
            JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
        return err;
    });

    if(count instanceof Error) {
        combinedLogger.error("Aborting cron, reason: Could not fetch count for number of documents");
        return;
    }

    for(let i=0;i<=count/groupOf;i+=1) {
        const lsas = await Insurance.find().limit(groupOf).skip(i*groupOf).lean().catch((err) => {
            combinedLogger.error(
                "Error fetching insurances: " +
                JSON.stringify(err, Object.getOwnPropertyNames(err))
            );
            return err;
        });

        if(lsas instanceof Error) {
            combinedLogger.error("Aborting cron, reason: Could not fetch LSAs");
            return;
        }

        for(const j of lsas) {
            const liquidationType = await publicClient.readContract({
                abi: LENDING_POOL_ABI,
                address: process.env.ADDR_LENDING_POOL,
                functionName: "checkTypeOfLiquidation",
                args: [j.lsa],
            }).catch((err) => {
                combinedLogger.error(
                    `Error fetching liquidation type for LSA: ${j.lsa}, error: ` +
                    JSON.stringify(err, Object.getOwnPropertyNames(err))
                );
                return err;
            });

            if(liquidationType instanceof Error) {
                combinedLogger.error(
                    "Aborting liquidation for LSA: " + j.lsa + " reason: Could not fetch liquidation type"
                );
                continue;
            }

            if(liquidationType === 0) {
                continue;
            }

            const gasPrice = await publicClient.getGasPrice();
            const amplifiedGasPrice = amplify(gasPrice, process.env.GAS_PRICE_MARKUP)

            if(liquidationType === 1) {
                const hash = await walletClient.writeContract({
                    abi: LENDING_POOL_ABI,
                    address: process.env.ADDR_LENDING_POOL,
                    functionName: "liquidationCall",
                    args: [
                        process.env.ADDR_CBBTC,
                        process.env.ADDR_USDC,
                        j.lsa,
                        0n, // TODO: what has to be the debt to cover ?
                        false // TODO: should this be true/false
                    ],
                    maxPriorityFeePerGas: amplifiedGasPrice/4n,
                    maxFeePerGas: amplifiedGasPrice,
                }).catch((err) => {
                    combinedLogger.error(
                        "Error sending full liquidation transaction for lsa: " + j.lsa +
                        `error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
                    );
                    return err;
                });

                if(hash instanceof Error) {
                    combinedLogger.error(
                        "Aborting liquidation for LSA: " + j.lsa + " reason: Could not send transaction"
                    );
                    continue;
                }

                const receipt = await publicClient.waitForTransactionReceipt(
                    {hash}
                ).catch((err) => {
                    combinedLogger.error(
                        `Error while waiting for receipt for full liquidation transaction for LSA: ${j.lsa}, error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
                    );

                    return err;
                });

                if(receipt instanceof Error) {
                    combinedLogger.error(
                        "Aborting liquidation for LSA: " + j.lsa + " reason: Errored while waiting for receipt"
                    );
                    continue;
                }

                combinedLogger.info(
                    "Fully Liquidated LSA: " + j.lsa + "Transaction hash: " + hash
                );
            } else {
                const hash = await walletClient.writeContract({
                    abi: LENDING_POOL_ABI,
                    address: process.env.ADDR_LENDING_POOL,
                    functionName: "microLiquidationCall",
                    args: [encodeAbiParameters(
                        [
                            {type: "address"},
                            {type: "address"},
                            {type: "address"}
                        ],
                        [
                            process.env.ADDR_CBBTC,
                            process.env.ADDR_USDC,
                            j.lsa,
                        ]
                    )],
                    maxPriorityFeePerGas: amplifiedGasPrice/4n,
                    maxFeePerGas: amplifiedGasPrice,
                }).catch((err) => {
                    combinedLogger.error(
                        "Error sending micro liquidation transaction for lsa: " + j.lsa +
                        `error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
                    );
                    return err;
                });

                if(hash instanceof Error) {
                    combinedLogger.error(
                        "Aborting micro liquidation for LSA: " + j.lsa + " reason: Could not send transaction"
                    );
                    continue;
                }

                const receipt = await publicClient.waitForTransactionReceipt(
                    {hash}
                ).catch((err) => {
                    combinedLogger.error(
                        `Error while waiting for receipt for micro liquidation transaction for LSA: ${j.lsa}, error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
                    );
                    return err;
                });

                if(receipt instanceof Error) {
                    combinedLogger.error(
                        "Aborting micro liquidation for LSA: " + j.lsa + " reason: Errored while waiting for receipt"
                    );
                    continue;
                }

                combinedLogger.info(
                    "micro Liquidated LSA: " + j.lsa + "Transaction hash: " + hash
                );
            }
        }
    }
}

module.exports = {
    execute
}

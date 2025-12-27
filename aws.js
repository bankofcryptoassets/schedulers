const {
    SecretsManagerClient,
    GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager")
const dotenv = require("dotenv")
dotenv.config()
  
const client = new SecretsManagerClient({ region: process.env.AWS_REGION })
  
/**
* Fetch executor private key by AWS secret name
* @param {string} secretName - AWS Secrets Manager secret name
* @returns {Promise<string>} - Private key string
*/
const getExecutorPrivKeyBySecretName = async (secretName) => {
    if(process.env.NODE_ENV === 'development') {
        return process.env.RELAY_EXECUTOR_PRIVATE_KEY
    }
    const command = new GetSecretValueCommand({ SecretId: secretName })
    const resp = await client.send(command)
    const secret = JSON.parse(resp.SecretString)
    return secret.RELAY_EXECUTOR_PRIVATE_KEY
}
  
module.exports = { getExecutorPrivKeyBySecretName }
  
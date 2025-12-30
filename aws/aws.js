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
const getPrivKeyBySecretName = async (secretName, key) => {
    if(process.env.NODE_ENV === 'development') {
        return process.env[key];
    }
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const resp = await client.send(command);
    const secret = JSON.parse(resp.SecretString);
    return secret[key];
}
  
module.exports = { getPrivKeyBySecretName }
  
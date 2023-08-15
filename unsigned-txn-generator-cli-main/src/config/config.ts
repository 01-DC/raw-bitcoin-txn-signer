/**
 * This file will contain all the configuration keys.
 * Throws error if a required key is not specified.
 */

const getEnvVariable = (key: string, isRequired = true): string => {
  const value = process.env[key];

  if (!value && isRequired) {
    throw new Error(`ENVIREMENT VARIABLE '${key}' NOT SPECIFIED.`);
  }

  return value || '';
};

const config = {
  BLOCKCYPHER_API_KEY: getEnvVariable('BLOCKCYPHER_API_KEY'),
  INFURA_TOKEN: getEnvVariable('INFURA_TOKEN'),
};

export default config;

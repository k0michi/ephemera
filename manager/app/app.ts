import crypto from 'crypto';
import Crypto from "@ephemera/shared/lib/crypto.js";
import Base37 from "@ephemera/shared/lib/base37.js";
import HostUtil from "@ephemera/shared/lib/host_util.js";

import readline from 'readline';
import fsPromises from 'fs/promises';
import * as envfile from 'envfile';

interface EnvEntry {
  names: string[];
  defaultValue?: string;
  validate?: (value: string) => boolean;
  secret?: boolean;
  generate?: () => (Record<string, string> | Promise<Record<string, string>>);
  description: string;
}

const entries: EnvEntry[] = [
  {
    names: ['EPHEMERA_HOST'],
    description: 'The hostname and port the server listens on, in the format "hostname:port"',
    validate: (value) => HostUtil.isValid(value)
  },
  {
    names: ['EPHEMERA_DB_PASSWORD'],
    description: 'The password for the database connection',
    secret: true,
    generate: () => ({
      EPHEMERA_DB_PASSWORD: Base37.fromUint8Array(crypto.randomBytes(32))
    })
  },
  {
    names: ['EPHEMERA_DB_ROOT_PASSWORD'],
    description: 'The root password for the database',
    secret: true,
    generate: () => ({
      EPHEMERA_DB_ROOT_PASSWORD: Base37.fromUint8Array(crypto.randomBytes(32))
    })
  },
  {
    names: ['EPHEMERA_PUBLIC_KEY', 'EPHEMERA_PRIVATE_KEY'],
    description: 'The server key pair',
    secret: true,
    generate: () => {
      const keyPair = Crypto.generateKeyPair();
      return {
        EPHEMERA_PUBLIC_KEY: Base37.fromUint8Array(keyPair.publicKey),
        EPHEMERA_PRIVATE_KEY: Base37.fromUint8Array(keyPair.privateKey)
      };
    }
  },
  {
    names: ['EPHEMERA_BOOTSTRAP_PEERS'],
    description: 'Comma-separated list of multiaddrs of bootstrap peers',
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function askString(query: string, defaultValue?: string, validate?: (value: string) => boolean): Promise<string> {
  let prompt = query;
  if (defaultValue) {
    prompt += ` (default: ${defaultValue})`;
  }
  prompt += ': ';

  while (true) {
    const answer = await askQuestion(prompt);
    const value = answer.trim();

    if (value === '' && defaultValue !== undefined) {
      return defaultValue;
    }

    if (validate && !validate(value)) {
      continue;
    }

    return value;
  }
}

async function askBoolean(query: string, defaultValue?: boolean): Promise<boolean> {
  let prompt = query;

  if (defaultValue !== undefined) {
    prompt += ` (${defaultValue ? 'Y/n' : 'y/N'})`;
  } else {
    prompt += ' (y/n)';
  }

  prompt += ': ';

  while (true) {
    const answer = await askQuestion(prompt);
    const normalized = answer.trim().toLowerCase();

    if (normalized === 'y' || normalized === 'yes') {
      return true;
    } else if (normalized === 'n' || normalized === 'no') {
      return false;
    } else if (normalized === '' && defaultValue !== undefined) {
      return defaultValue;
    }
  }
}

/**
 * @returns "YYYYMMDDHHmmss" in UTC
 */
function compactTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

async function main(): Promise<void> {
  const envFilePath = '.env';
  let env: Record<string, string> = {};
  try {
    const envFileContent = await fsPromises.readFile(envFilePath, 'utf-8');
    const moveDest = `${envFilePath}.bak.${compactTimestamp(new Date())}`;
    await fsPromises.copyFile(envFilePath, moveDest);
    env = envfile.parse(envFileContent);
    console.log(`Loaded existing .env file. A backup has been created at ${moveDest}`);
  } catch (err) {
  }

  for (const entry of entries) {
    if (entry.names) {
      for (const name of entry.names) {
        if (env[name]) {
          continue;
        }
      }
    }

    if (entry.generate) {
      const allNamesMissing = entry.names ? entry.names.every(name => !env[name]) : false;

      if (allNamesMissing) {
        const generated = await entry.generate();
        console.log(`Generated values for ${entry.names.join(', ')}`);
        env = { ...env, ...generated };
      } else {
        const shouldRegenerate = await askBoolean(`Do you want to regenerate ${entry.names ? entry.names.join(', ') : ''}?`, false);

        if (shouldRegenerate) {
          const generated = await entry.generate();
          console.log(`Generated values for ${entry.names.join(', ')}`);
          env = { ...env, ...generated };
        }
      }

      continue;
    }

    const query = `${entry.description} [${entry.names.join(', ')}]`;
    const defaultValue = env[entry.names[0]] ?? entry.defaultValue;
    const value = await askString(query, defaultValue, entry.validate);

    for (const name of entry.names) {
      env[name] = value;
    }
  }

  const envFileContent = envfile.stringify(env);
  await fsPromises.writeFile(envFilePath, envFileContent);
  rl.close();
}

main();
export default class EnvParser {
  private _env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv) {
    this._env = env;
  }

  private _isEmpty(value: string | undefined): value is undefined | '' {
    return value === undefined || value.trim() === '';
  }

  public getStringRequired(key: string): string {
    const value = this._env[key];

    if (this._isEmpty(value)) {
      throw new Error(`Environment variable ${key} is not set or empty`);
    }

    return value;
  }

  public getNumberRequired(key: string): number {
    const value = this._env[key];

    if (this._isEmpty(value)) {
      throw new Error(`Environment variable ${key} is not set or empty`);
    }

    const num = Number(value);

    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} is not a valid number`);
    }

    return num;
  }

  public getStringOptional(key: string, defaultValue: string): string {
    const value = this._env[key];

    if (this._isEmpty(value)) {
      return defaultValue;
    }

    return value;
  }

  public getNumberOptional(key: string, defaultValue: number): number {
    const value = this._env[key];

    if (this._isEmpty(value)) {
      return defaultValue;
    }

    const num = Number(value);

    if (isNaN(num)) {
      return defaultValue;
    }

    return num;
  }

  public getStringArrayOptional(key: string): string[] | undefined {
    const value = this._env[key];

    if (this._isEmpty(value)) {
      return undefined;
    }

    return value
      .split(',')
      .map(str => str.trim())
      .filter(str => str !== '');
  }
}
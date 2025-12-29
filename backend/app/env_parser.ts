export default class EnvParser {
  private _env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv) {
    this._env = env;
  }

  public getStringMandatory(key: string): string {
    const value = this._env[key];

    if (value === undefined) {
      throw new Error(`Environment variable ${key} is not set`);
    }

    return value;
  }

  public getNumberMandatory(key: string): number {
    const value = this._env[key];

    if (value === undefined) {
      throw new Error(`Environment variable ${key} is not set`);
    }

    const num = Number(value);

    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} is not a valid number`);
    }

    return num;
  }

  public getStringOptional(key: string, defaultValue: string): string {
    const value = this._env[key];

    if (value === undefined) {
      return defaultValue;
    }

    return value;
  }

  public getNumberOptional(key: string, defaultValue: number): number {
    const value = this._env[key];

    if (value === undefined) {
      return defaultValue;
    }

    const num = Number(value);

    if (isNaN(num)) {
      return defaultValue;
    }

    return num;
  }
}
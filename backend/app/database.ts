import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { MySqlTransaction } from "drizzle-orm/mysql-core";
import type { MySql2Database, MySql2PreparedQueryHKT, MySql2QueryResultHKT } from "drizzle-orm/mysql2";
import type { Pool } from "mysql2/promise";

export type PooledDatabase = MySql2Database<Record<string, never>> & {
  $client: Pool;
};

export type Transaction = MySqlTransaction<MySql2QueryResultHKT, MySql2PreparedQueryHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>;
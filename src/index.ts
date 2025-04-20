/**
 * A utility function that converts SQL template literals into prepared statement format
 * @param {TemplateStringsArray} strings - Template literal strings
 * @param {...any} values - Values to be inserted
 * @returns {{query: string, params: any[]}} Object containing the query with ? placeholders and array of parameters
 */
export function sql(
  strings: TemplateStringsArray,
  ...values: any[]
): { query: string; params: any[] } {
  const params: any[] = [];
  const query = strings.reduce((result, str, i) => {
    const value = values[i];
    // Ignore only if the value is a conditional statement (contains sql``)
    if (typeof value === "string" && value.includes("sql`")) {
      return result;
    }
    if (value !== undefined && value !== null) {
      if (value instanceof Raw) {
        return result + str + value.value;
      }
      if (Array.isArray(value)) {
        const placeholders = value.map(() => "?").join(", ");
        params.push(...value);
        return result + str + `(${placeholders})`;
      }
      if (typeof value === "object" && !(value instanceof Raw)) {
        const entries = Object.entries(value);
        const placeholders = entries.map(([key]) => `${key} = ?`).join(", ");
        params.push(...entries.map(([, v]) => v));
        return result + str + placeholders;
      }
      params.push(value);
      return result + str + "?";
    }
    return result + str;
  }, "");

  return {
    query,
    params,
  };
}

export class Raw {
  constructor(
    public value: string,
    public params?: any[],
  ) {}
}

/**
 * Creates a raw SQL value that won't be escaped
 * @param {string} value - The raw SQL value
 * @returns {Raw} A raw SQL value wrapper
 */
export function raw(value: string, params?: any[]): Raw {
  return new Raw(value, params);
}

/**
 * Safely escapes a string for SQL
 * @param {string} value - The string to escape
 * @returns {string} The escaped string
 */
export function escape(value: string): string {
  return value.replace(/[\u0000\u0008\u0009\u001A\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\u0000":
        return "\\0";
      case "\u0008":
        return "\\b";
      case "\u0009":
        return "\\t";
      case "\u001A":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  });
}

/**
 * Creates a SQL CASE statement
 * @param {string} field - The field to check
 * @param {Record<string, any>} cases - The cases to check against
 * @returns {Raw} A raw SQL CASE statement
 */
export function caseWhen(field: string, cases: Record<string, any>): Raw {
  const conditions = Object.entries(cases)
    .map(() => `WHEN ${field} = ? THEN ?`)
    .join(" ");
  const params = Object.entries(cases).flatMap(([condition, result]) => [
    condition,
    result,
  ]);
  return raw(`CASE ${conditions} END`, params);
}

/**
 * Creates a JOIN clause
 * @param {Record<string, string>} joins - Object containing join conditions
 * @param {JoinType} [type='INNER'] - Join type (INNER, LEFT, RIGHT, FULL)
 * @returns {Raw} A raw SQL JOIN clause
 */

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";

export function join(
  joins: Record<string, string>,
  type: JoinType = "INNER",
): Raw {
  const joinClauses = Object.entries(joins)
    .map(([table, condition]) => `${type} JOIN ${table} ON ${condition}`)
    .join(" ");
  return raw(joinClauses);
}

/**
 * Creates an ORDER BY clause
 * @param {Record<string, 'ASC' | 'DESC'> | string} order - Object containing field:direction pairs or string
 * @returns {Raw} A raw SQL ORDER BY clause
 */
export function orderBy(order: Record<string, "ASC" | "DESC"> | string): Raw {
  if (typeof order === "string") {
    return raw(`ORDER BY ${order}`);
  }
  const clauses = Object.entries(order)
    .map(([field, direction]) => `${field} ${direction.toUpperCase()}`)
    .join(", ");
  return raw(`ORDER BY ${clauses}`);
}

/**
 * Creates a GROUP BY clause
 * @param {string | string[]} fields - Fields to group by
 * @returns {Raw} A raw SQL GROUP BY clause
 */
export function groupBy(fields: string | string[]): Raw {
  const fieldList = Array.isArray(fields) ? fields.join(", ") : fields;
  return raw(`GROUP BY ${fieldList}`);
}

/**
 * Creates a LIMIT clause with optional OFFSET
 * @param {number} limit - Number of rows to return
 * @param {number} [offset] - Number of rows to skip
 * @returns {Raw} A raw SQL LIMIT clause
 */
export function limit(limit: number, offset?: number): Raw {
  if (offset !== undefined) {
    return raw(`LIMIT ? OFFSET ?`);
  }
  return raw(`LIMIT ?`);
}

interface Transaction {
  add: (strings: TemplateStringsArray, ...values: any[]) => void;
  commit: () => { query: string; params: any[] };
}

/**
 * Creates a transaction object
 * @returns {Transaction} A transaction object
 */
export function transaction(): Transaction {
  const queries: string[] = [];
  const params: any[] = [];

  return {
    add(strings: TemplateStringsArray, ...values: any[]) {
      const { query, params: queryParams } = sql(strings, ...values);
      queries.push(query);
      params.push(...queryParams);
    },
    commit() {
      return {
        query: queries.join("; "),
        params,
      };
    },
  };
}

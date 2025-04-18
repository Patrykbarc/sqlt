/**
 * A simple utility function that converts SQL template literals into prepared statement format
 * @param {string} strings - Template literal strings
 * @param {...any} values - Values to be inserted
 * @returns {{query: string, params: any[]}} Object containing the query with ? placeholders and array of parameters
 */
function sql(strings, ...values) {
  const params = [];
  const query = strings.reduce((result, str, i) => {
    const value = values[i];
    // Ignore only if the value is a conditional statement (contains sql``)
    if (typeof value === "string" && value.includes("sql`")) {
      return result;
    }
    if (value !== undefined && value !== null) {
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

class Raw {
  constructor(value) {
    this.value = value;
  }
}

/**
 * Creates a raw SQL value that won't be escaped
 * @param {string} value - The raw SQL value
 * @returns {Raw} A raw SQL value wrapper
 */
function raw(value) {
  return new Raw(value);
}

/**
 * Safely escapes a string for SQL
 * @param {string} value - The string to escape
 * @returns {string} The escaped string
 */
function escape(value) {
  return value.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
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
 * @param {Object} cases - The cases to check against
 * @returns {Raw} A raw SQL CASE statement
 */
function caseWhen(field, cases) {
  const conditions = Object.entries(cases)
    .map(([value, result]) => `WHEN ${field} = ? THEN ?`)
    .join(" ");
  return raw(`CASE ${conditions} END`);
}

/**
 * Creates a JOIN clause
 * @param {Object} joins - Object containing join conditions
 * @param {string} [type='INNER'] - Join type (INNER, LEFT, RIGHT, FULL)
 * @returns {Raw} A raw SQL JOIN clause
 */
function join(joins, type = "INNER") {
  const joinClauses = Object.entries(joins)
    .map(([table, condition]) => `${type} JOIN ${table} ON ${condition}`)
    .join(" ");
  return raw(joinClauses);
}

/**
 * Creates an ORDER BY clause
 * @param {Object|string} order - Object containing field:direction pairs or string
 * @returns {Raw} A raw SQL ORDER BY clause
 */
function orderBy(order) {
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
 * @param {string|string[]} fields - Fields to group by
 * @returns {Raw} A raw SQL GROUP BY clause
 */
function groupBy(fields) {
  const fieldList = Array.isArray(fields) ? fields.join(", ") : fields;
  return raw(`GROUP BY ${fieldList}`);
}

/**
 * Creates a LIMIT clause with optional OFFSET
 * @param {number} limit - Number of rows to return
 * @param {number} [offset] - Number of rows to skip
 * @returns {Raw} A raw SQL LIMIT clause
 */
function limit(limit, offset) {
  if (offset !== undefined) {
    return raw(`LIMIT ? OFFSET ?`);
  }
  return raw(`LIMIT ?`);
}

/**
 * Creates a transaction object
 * @returns {Transaction} A transaction object
 */
function transaction() {
  const queries = [];
  const params = [];

  return {
    add(strings, ...values) {
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

module.exports = {
  sql,
  raw,
  escape,
  caseWhen,
  join,
  orderBy,
  groupBy,
  limit,
  transaction,
};

/**
 * A utility function that converts SQL template literals into prepared statement format
 * @param {TemplateStringsArray} strings - Template literal strings
 * @param {...any} values - Values to be inserted
 * @returns {{query: string, params: any[]}} Object containing the query with ? placeholders and array of parameters
 */
export function sql(strings, ...values) {
    const params = [];
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
    constructor(value, params) {
        this.value = value;
        this.params = params;
    }
}
/**
 * Creates a raw SQL value that won't be escaped
 * @param {string} value - The raw SQL value
 * @returns {Raw} A raw SQL value wrapper
 */
export function raw(value, params) {
    return new Raw(value, params);
}
/**
 * Safely escapes a string for SQL
 * @param {string} value - The string to escape
 * @returns {string} The escaped string
 */
export function escape(value) {
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
export function caseWhen(field, cases) {
    const conditions = Object.entries(cases)
        .map(() => `WHEN ${field} = ? THEN ?`)
        .join(" ");
    const params = Object.entries(cases).flatMap(([condition, result]) => [
        condition,
        result,
    ]);
    return raw(`CASE ${conditions} END`, params);
}
export function join(joins, type = "INNER") {
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
export function orderBy(order) {
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
export function groupBy(fields) {
    const fieldList = Array.isArray(fields) ? fields.join(", ") : fields;
    return raw(`GROUP BY ${fieldList}`);
}
/**
 * Creates a LIMIT clause with optional OFFSET
 * @param {number} limit - Number of rows to return
 * @param {number} [offset] - Number of rows to skip
 * @returns {Raw} A raw SQL LIMIT clause
 */
export function limit(limit, offset) {
    if (offset !== undefined) {
        return raw(`LIMIT ? OFFSET ?`);
    }
    return raw(`LIMIT ?`);
}
/**
 * Creates a transaction object
 * @returns {Transaction} A transaction object
 */
export async function transaction() {
    const queries = [];
    const params = [];
    return {
        async add(strings, ...values) {
            const { query, params: queryParams } = sql(strings, ...values);
            queries.push(query);
            params.push(...queryParams);
        },
        async commit() {
            return {
                query: queries.join("; "),
                params,
            };
        },
        async rollback() {
            queries.length = 0;
            params.length = 0;
        },
    };
}

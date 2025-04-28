/**
 * A utility function that converts SQL template literals into prepared statement format
 * @param {TemplateStringsArray} strings - Template literal strings
 * @param {...any} values - Values to be inserted
 * @returns {{query: string, params: any[]}} Object containing the query with ? placeholders and array of parameters
 */
export declare function sql(strings: TemplateStringsArray, ...values: any[]): {
    query: string;
    params: any[];
};
export declare class Raw {
    value: string;
    params?: any[] | undefined;
    constructor(value: string, params?: any[] | undefined);
}
/**
 * Creates a raw SQL value that won't be escaped
 * @param {string} value - The raw SQL value
 * @returns {Raw} A raw SQL value wrapper
 */
export declare function raw(value: string, params?: any[]): Raw;
/**
 * Safely escapes a string for SQL
 * @param {string} value - The string to escape
 * @returns {string} The escaped string
 */
export declare function escape(value: string): string;
/**
 * Creates a SQL CASE statement
 * @param {string} field - The field to check
 * @param {Record<string, any>} cases - The cases to check against
 * @returns {Raw} A raw SQL CASE statement
 */
export declare function caseWhen(field: string, cases: Record<string, any>): Raw;
/**
 * Creates a JOIN clause
 * @param {Record<string, string>} joins - Object containing join conditions
 * @param {JoinType} [type='INNER'] - Join type (INNER, LEFT, RIGHT, FULL)
 * @returns {Raw} A raw SQL JOIN clause
 */
type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
export declare function join(joins: Record<string, string>, type?: JoinType): Raw;
/**
 * Creates an ORDER BY clause
 * @param {Record<string, 'ASC' | 'DESC'> | string} order - Object containing field:direction pairs or string
 * @returns {Raw} A raw SQL ORDER BY clause
 */
export declare function orderBy(order: Record<string, "ASC" | "DESC"> | string): Raw;
/**
 * Creates a GROUP BY clause
 * @param {string | string[]} fields - Fields to group by
 * @returns {Raw} A raw SQL GROUP BY clause
 */
export declare function groupBy(fields: string | string[]): Raw;
/**
 * Creates a LIMIT clause with optional OFFSET
 * @param {number} limit - Number of rows to return
 * @param {number} [offset] - Number of rows to skip
 * @returns {Raw} A raw SQL LIMIT clause
 */
export declare function limit(limit: number, offset?: number): Raw;
interface Transaction {
    add: (strings: TemplateStringsArray, ...values: any[]) => void;
    commit: () => Promise<{
        query: string;
        params: any[];
    }>;
    rollback: () => void;
}
/**
 * Creates a transaction object
 * @returns {Transaction} A transaction object
 */
export declare function transaction(): Promise<Transaction>;
export {};

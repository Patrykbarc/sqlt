# sqlt

A lightweight SQL template tag utility for JavaScript that safely handles SQL string interpolation and parameter binding.

## Features

- Safe SQL string interpolation with parameter binding
- Handles boolean values as normal parameters
- Support for arrays and objects
- Raw SQL values
- String escaping
- CASE statements
- JOIN clauses
- ORDER BY and GROUP BY
- LIMIT and OFFSET
- Transactions
- Zero dependencies
- Simple and lightweight
- Prepared statement support

## Installation

```bash
npm install sqlt
```

## Usage

```javascript
const { sql, raw, escape, caseWhen, join, orderBy, groupBy, limit, transaction } = require("sqlt");

// Basic usage
const { query, params } = sql`SELECT * FROM users WHERE id = ${1}`;
// query: "SELECT * FROM users WHERE id = ?"
// params: [1]

// With boolean values
const isActive = true;
const { query, params } = sql`SELECT * FROM users WHERE active = ${isActive}`;
// query: "SELECT * FROM users WHERE active = ?"
// params: [true]

// With arrays
const ids = [1, 2, 3];
const { query, params } = sql`SELECT * FROM users WHERE id IN ${ids}`;
// query: "SELECT * FROM users WHERE id IN (?, ?, ?)"
// params: [1, 2, 3]

// With objects
const user = { name: "John", age: 25 };
const { query, params } = sql`INSERT INTO users SET ${user}`;
// query: "INSERT INTO users SET name = ?, age = ?"
// params: ["John", 25]

// Raw SQL values
const { query, params } = sql`SELECT * FROM users WHERE created_at > ${raw("NOW()")}`;
// query: "SELECT * FROM users WHERE created_at > NOW()"
// params: []

// String escaping
const name = "O'Connor";
const { query, params } = sql`SELECT * FROM users WHERE name = ${escape(name)}`;
// query: "SELECT * FROM users WHERE name = ?"
// params: ["O\\'Connor"]

// CASE statements
const statusMap = {
  active: "Aktywny",
  inactive: "Nieaktywny",
  pending: "Oczekujący"
};
const { query, params } = sql`
  SELECT 
    ${caseWhen("status", statusMap)} as status_text
  FROM users
`;
// query: "SELECT CASE WHEN status = ? THEN ? WHEN status = ? THEN ? WHEN status = ? THEN ? END as status_text FROM users"
// params: ["active", "Aktywny", "inactive", "Nieaktywny", "pending", "Oczekujący"]

// JOIN clauses
const joins = {
  posts: "users.id = posts.user_id",
  comments: "posts.id = comments.post_id"
};
const { query, params } = sql`
  SELECT users.*, posts.title, comments.content
  FROM users
  ${join(joins, "LEFT")}
`;
// query: "SELECT users.*, posts.title, comments.content FROM users LEFT JOIN posts ON users.id = posts.user_id LEFT JOIN comments ON posts.id = comments.post_id"
// params: []

// ORDER BY
const order = { name: "ASC", age: "DESC" };
const { query, params } = sql`
  SELECT * FROM users
  ${orderBy(order)}
`;
// query: "SELECT * FROM users ORDER BY name ASC, age DESC"
// params: []

// GROUP BY
const { query, params } = sql`
  SELECT department, COUNT(*) as count
  FROM users
  ${groupBy("department")}
`;
// query: "SELECT department, COUNT(*) as count FROM users GROUP BY department"
// params: []

// LIMIT and OFFSET
const { query, params } = sql`
  SELECT * FROM users
  ${limit(10, 20)}
`;
// query: "SELECT * FROM users LIMIT ? OFFSET ?"
// params: [10, 20]

// Transactions
const tx = transaction();
tx.add`INSERT INTO users (name) VALUES (${"John"})`;
tx.add`UPDATE stats SET count = count + 1`;
const { query, params } = tx.commit();
// query: "INSERT INTO users (name) VALUES (?); UPDATE stats SET count = count + 1"
// params: ["John"]

// Multiple interpolations
const userId = 1;
const limit = 10;
const {
  query,
  params,
} = sql`SELECT * FROM users WHERE id = ${userId} LIMIT ${limit}`;
// query: "SELECT * FROM users WHERE id = ? LIMIT ?"
// params: [1, 10]

// Conditional statements
const isAdmin = true;
const minAge = 18;
const status = "active";
const { query, params } = sql`
  SELECT * FROM users 
  WHERE 1=1
  ${isAdmin ? sql`AND role = 'admin'` : ""}
  ${minAge ? sql`AND age >= ${minAge}` : ""}
  ${status ? sql`AND status = ${status}` : ""}
`;
// query: "SELECT * FROM users WHERE 1=1 AND role = 'admin' AND age >= ? AND status = ?"
// params: [18, 'active']
```

## API

### sql\`template\`

The main template tag function that processes SQL queries with interpolated values and parameter binding.

#### Parameters

- `strings`: Template string parts
- `...values`: Values to interpolate

#### Returns

An object containing:

- `query`: The SQL query string with `?` placeholders
- `params`: Array of parameters corresponding to the placeholders

### raw(value)

Creates a raw SQL value that won't be escaped.

#### Parameters

- `value`: The raw SQL value

#### Returns

A raw SQL value wrapper

### escape(value)

Safely escapes a string for SQL.

#### Parameters

- `value`: The string to escape

#### Returns

The escaped string

### caseWhen(field, cases)

Creates a SQL CASE statement.

#### Parameters

- `field`: The field to check
- `cases`: The cases to check against

#### Returns

A raw SQL CASE statement

### join(joins, type)

Creates a JOIN clause.

#### Parameters

- `joins`: Object containing join conditions
- `type`: Join type (INNER, LEFT, RIGHT, FULL), defaults to "INNER"

#### Returns

A raw SQL JOIN clause

### orderBy(order)

Creates an ORDER BY clause.

#### Parameters

- `order`: Object containing field:direction pairs or string

#### Returns

A raw SQL ORDER BY clause

### groupBy(fields)

Creates a GROUP BY clause.

#### Parameters

- `fields`: Fields to group by (string or array of strings)

#### Returns

A raw SQL GROUP BY clause

### limit(limit, offset)

Creates a LIMIT clause with optional OFFSET.

#### Parameters

- `limit`: Number of rows to return
- `offset`: Number of rows to skip (optional)

#### Returns

A raw SQL LIMIT clause

### transaction()

Creates a transaction object.

#### Returns

A transaction object with methods:
- `add`: Add a query to the transaction
- `commit`: Commit the transaction and return the combined query and parameters

## License

MIT

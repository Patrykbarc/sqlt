import {
  sql,
  raw,
  escape,
  caseWhen,
  join,
  orderBy,
  groupBy,
  limit,
  transaction,
} from "../index.js";

describe("sql template tag", () => {
  test("basic string interpolation", () => {
    const name = "John";
    const { query, params } = sql`SELECT * FROM users WHERE name = ${name}`;
    expect(query).toBe("SELECT * FROM users WHERE name = ?");
    expect(params).toEqual(["John"]);
  });

  test("multiple parameters", () => {
    const name = "John";
    const age = 30;
    const { query, params } =
      sql`SELECT * FROM users WHERE name = ${name} AND age = ${age}`;
    expect(query).toBe("SELECT * FROM users WHERE name = ? AND age = ?");
    expect(params).toEqual(["John", 30]);
  });

  test("array parameters", () => {
    const ids = [1, 2, 3];
    const { query, params } = sql`SELECT * FROM users WHERE id IN ${ids}`;
    expect(query).toBe("SELECT * FROM users WHERE id IN (?, ?, ?)");
    expect(params).toEqual([1, 2, 3]);
  });

  test("object parameters", () => {
    const user = { name: "John", age: 30 };
    const { query, params } = sql`UPDATE users SET ${user} WHERE id = 1`;
    expect(query).toBe("UPDATE users SET name = ?, age = ? WHERE id = 1");
    expect(params).toEqual(["John", 30]);
  });

  test("raw SQL values", () => {
    const { query, params } =
      sql`SELECT * FROM users WHERE ${raw("created_at > NOW()")}`;
    expect(query).toBe("SELECT * FROM users WHERE created_at > NOW()");
    expect(params).toEqual([]);
  });
});

describe("escape function", () => {
  test("escapes special characters", () => {
    const input = "O'Connor's \"special\" string";
    const escaped = escape(input);
    expect(escaped).toBe("O\\'Connor\\'s \\\"special\\\" string");
  });
});

describe("caseWhen function", () => {
  test("creates CASE statement", () => {
    const cases = { active: 1, inactive: 0 };
    const result = caseWhen("status", cases);
    expect(result.value).toBe(
      "CASE WHEN status = ? THEN ? WHEN status = ? THEN ? END"
    );
  });
});

describe("join function", () => {
  test("creates INNER JOIN", () => {
    const joins = { orders: "users.id = orders.user_id" };
    const result = join(joins);
    expect(result.value).toBe("INNER JOIN orders ON users.id = orders.user_id");
  });

  test("creates LEFT JOIN", () => {
    const joins = { orders: "users.id = orders.user_id" };
    const result = join(joins, "LEFT");
    expect(result.value).toBe("LEFT JOIN orders ON users.id = orders.user_id");
  });
});

describe("orderBy function", () => {
  test("creates ORDER BY with object", () => {
    const order: Record<string, "ASC" | "DESC"> = { name: "ASC", age: "DESC" };
    const result = orderBy(order);
    expect(result.value).toBe("ORDER BY name ASC, age DESC");
  });

  test("creates ORDER BY with string", () => {
    const result = orderBy("name ASC");
    expect(result.value).toBe("ORDER BY name ASC");
  });
});

describe("groupBy function", () => {
  test("creates GROUP BY with string", () => {
    const result = groupBy("department");
    expect(result.value).toBe("GROUP BY department");
  });

  test("creates GROUP BY with array", () => {
    const result = groupBy(["department", "role"]);
    expect(result.value).toBe("GROUP BY department, role");
  });
});

describe("limit function", () => {
  test("creates LIMIT clause", () => {
    const result = limit(10);
    expect(result.value).toBe("LIMIT ?");
  });

  test("creates LIMIT with OFFSET", () => {
    const result = limit(10, 20);
    expect(result.value).toBe("LIMIT ? OFFSET ?");
  });
});

describe("transaction function", () => {
  test("creates and commits transaction", () => {
    const t = transaction();
    t.add`INSERT INTO users (name) VALUES (${"John"})`;
    t.add`INSERT INTO orders (user_id) VALUES (${1})`;
    const { query, params } = t.commit();
    expect(query).toBe(
      "INSERT INTO users (name) VALUES (?); INSERT INTO orders (user_id) VALUES (?)"
    );
    expect(params).toEqual(["John", 1]);
  });
});

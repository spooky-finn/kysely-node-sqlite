import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { Kysely, sql, type Generated } from "kysely";
import { SqliteDialect } from "./index";

interface TestDatabase {
	users: {
		id: Generated<number>;
		name: string;
		email: string;
	};
	posts: {
		id: Generated<number>;
		title: string;
		content: string | null;
		user_id: number;
	};
}

describe("SqliteDialect", async () => {
	let db: Kysely<TestDatabase>;

	async function setupDb() {
		db = new Kysely<TestDatabase>({
			dialect: new SqliteDialect({
				// @ts-expect-error @types/node hasn't been updated yet
				database: new DatabaseSync(":memory:"),
			}),
		});

		await db.schema
			.createTable("users")
			.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
			.addColumn("name", "varchar", (col) => col.notNull())
			.addColumn("email", "varchar", (col) => col.notNull().unique())
			.execute();

		await db.schema
			.createTable("posts")
			.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
			.addColumn("title", "varchar", (col) => col.notNull())
			.addColumn("content", "varchar")
			.addColumn("user_id", "integer", (col) =>
				col.notNull().references("users.id"),
			)
			.execute();
	}

	test("basic CRUD operations", async () => {
		await setupDb();

		// INSERT
		const insertResult = await db
			.insertInto("users")
			.values({
				name: "John Doe",
				email: "john@example.com",
			})
			.executeTakeFirst();

		assert(insertResult.insertId !== undefined);

		// SELECT
		const user = await db
			.selectFrom("users")
			.selectAll()
			.where("id", "=", Number(insertResult.insertId))
			.executeTakeFirst();

		assert(user !== undefined);
		assert.equal(user.name, "John Doe");
		assert.equal(user.email, "john@example.com");

		// UPDATE
		await db
			.updateTable("users")
			.set({ name: "John Smith" })
			.where("id", "=", Number(insertResult.insertId))
			.execute();

		const updatedUser = await db
			.selectFrom("users")
			.selectAll()
			.where("id", "=", Number(insertResult.insertId))
			.executeTakeFirst();

		assert.equal(updatedUser?.name, "John Smith");

		// DELETE
		await db
			.deleteFrom("users")
			.where("id", "=", Number(insertResult.insertId))
			.execute();

		const deletedUser = await db
			.selectFrom("users")
			.selectAll()
			.where("id", "=", Number(insertResult.insertId))
			.executeTakeFirst();

		assert.equal(deletedUser, undefined);

		await db.destroy();
	});

	test("batch operations", async () => {
		await setupDb();

		// Batch insert
		await db
			.insertInto("users")
			.values([
				{ name: "User 1", email: "user1@example.com" },
				{ name: "User 2", email: "user2@example.com" },
				{ name: "User 3", email: "user3@example.com" },
			])
			.execute();

		const users = await db
			.selectFrom("users")
			.selectAll()
			.orderBy("id")
			.execute();

		assert.equal(users.length, 3);
		assert.equal(users[0]?.name, "User 1");
		assert.equal(users[1]?.name, "User 2");
		assert.equal(users[2]?.name, "User 3");

		await db.destroy();
	});

	test("joins and relationships", async () => {
		await setupDb();

		// Insert a user
		const userResult = await db
			.insertInto("users")
			.values({
				name: "Blog Author",
				email: "author@example.com",
			})
			.executeTakeFirst();

		const userId = Number(userResult.insertId);

		// Insert posts for the user
		await db
			.insertInto("posts")
			.values([
				{
					title: "First Post",
					content: "Hello world",
					user_id: userId,
				},
				{
					title: "Second Post",
					content: "Another post",
					user_id: userId,
				},
			])
			.execute();

		// Test inner join
		const userPosts = await db
			.selectFrom("users")
			.innerJoin("posts", "users.id", "posts.user_id")
			.select(["users.name", "posts.title"])
			.where("users.id", "=", userId)
			.orderBy("posts.title")
			.execute();

		assert.equal(userPosts.length, 2);
		assert.equal(userPosts[0]?.name, "Blog Author");
		assert.equal(userPosts[0]?.title, "First Post");
		assert.equal(userPosts[1]?.title, "Second Post");

		await db.destroy();
	});

	test("constraints and error handling", async () => {
		await setupDb();

		// Test unique constraint
		await db
			.insertInto("users")
			.values({
				name: "Unique User",
				email: "unique@example.com",
			})
			.execute();

		await assert.rejects(
			db
				.insertInto("users")
				.values({
					name: "Another User",
					email: "unique@example.com",
				})
				.execute(),
			/UNIQUE constraint failed/,
		);

		// Test foreign key constraint
		await assert.rejects(
			db
				.insertInto("posts")
				.values({
					title: "Invalid Post",
					content: "Content",
					user_id: 99999,
				})
				.execute(),
			/FOREIGN KEY constraint failed/,
		);

		await db.destroy();
	});

	test("aggregate functions", async () => {
		await setupDb();

		// Insert test data
		await db
			.insertInto("users")
			.values([
				{ name: "User 1", email: "user1@example.com" },
				{ name: "User 2", email: "user2@example.com" },
			])
			.execute();

		const result = await db
			.selectFrom("users")
			.select([
				sql<number>`count(*)`.as("user_count"),
				sql<string>`group_concat(name)`.as("names"),
			])
			.executeTakeFirst();

		assert(result !== undefined);
		assert.equal(result.user_count, 2);
		assert(result.names.includes("User 1"));
		assert(result.names.includes("User 2"));

		await db.destroy();
	});

	test("transactions", async () => {
		await setupDb();

		await assert.rejects(async () => {
			await db.transaction().execute(async (trx) => {
				await trx
					.insertInto("users")
					.values({
						name: "Transaction User",
						email: "transaction@example.com",
					})
					.execute();

				// This should trigger a rollback
				throw new Error("Rollback test");
			});
		});

		// Verify the transaction was rolled back
		const user = await db
			.selectFrom("users")
			.selectAll()
			.where("email", "=", "transaction@example.com")
			.executeTakeFirst();

		assert.equal(user, undefined);

		await db.destroy();
	});

	test("subqueries", async () => {
		await setupDb();

		// Insert test data
		const userResult = await db
			.insertInto("users")
			.values({
				name: "Subquery User",
				email: "subquery@example.com",
			})
			.executeTakeFirst();

		await db
			.insertInto("posts")
			.values([
				{
					title: "Post 1",
					content: "Content 1",
					user_id: Number(userResult.insertId),
				},
				{
					title: "Post 2",
					content: "Content 2",
					user_id: Number(userResult.insertId),
				},
			])
			.execute();

		const result = await db
			.selectFrom("users")
			.select(["name"])
			.select((eb) => [
				eb
					.selectFrom("posts")
					.select((eb) => eb.fn.count("id").as("post_count"))
					.whereRef("user_id", "=", "users.id")
					.as("post_count"),
			])
			.where("id", "=", Number(userResult.insertId))
			.executeTakeFirst();

		assert(result !== undefined);
		assert.equal(result.name, "Subquery User");
		assert.equal(result.post_count, 2);

		await db.destroy();
	});
});

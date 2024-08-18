const { test, describe } = require("node:test");

const listHelper = require("../utils/list_helper");

const assert = require("node:assert");

test("dummy that returns 1", () => {
  const blogs = [];

  const result = listHelper.dummy(blogs);
  assert.strictEqual(result, 1);
});

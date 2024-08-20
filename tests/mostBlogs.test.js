const { test, describe } = require("node:test");
const assert = require("node:assert");
const { dummyBlogs } = require("./blogsArr");
const listHelper = require("../utils/list_helper");

describe("most blogs", () => {
  test("return the author with the most blogs", () => {
    const result = listHelper.mostBlogs(dummyBlogs);

    assert.deepStrictEqual(result, { author: "Robert C. Martin", blogs: 3 });
  });
});

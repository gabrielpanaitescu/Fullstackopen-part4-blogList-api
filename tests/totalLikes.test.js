const { test, describe } = require("node:test");
const assert = require("node:assert");

const listHelper = require("../utils/list_helper");

const { listWithOneBlog, blogs } = require("./blogs");

describe("total likes", () => {
  test("when list has one blog, equals the likes of that", () => {
    const result = listHelper.totalLikes(listWithOneBlog);

    assert.strictEqual(result, listWithOneBlog[0].likes);
  });

  test("when list has more than one blog, total likes is calculated right", () => {
    const result = listHelper.totalLikes(blogs);

    assert.strictEqual(result, 36);
  });
});

describe("favorite blog", () => {
  test("return the blog with the most number of likes", () => {
    const result = listHelper.favoriteBlog(blogs);

    assert.deepStrictEqual(result, {
      title: "Canonical string reduction",
      author: "Edsger W. Dijkstra",
      likes: 12,
    });
  });
});

const { test, describe } = require("node:test");
const assert = require("node:assert");

const listHelper = require("../utils/list_helper");

const { listWithOneBlog, dummyBlogs } = require("./blogsArr");

describe("total likes", () => {
  test("when list has one blog, equals the likes of that", () => {
    const result = listHelper.totalLikes(listWithOneBlog);

    assert.strictEqual(result, listWithOneBlog[0].likes);
  });

  test("when list has more than one blog, total likes is calculated right", () => {
    const result = listHelper.totalLikes(dummyBlogs);

    assert.strictEqual(result, 36);
  });
});

describe("favorite blog", () => {
  test("return the blog with the most number of likes", () => {
    const result = listHelper.favoriteBlog(dummyBlogs);

    assert.deepStrictEqual(result, {
      title: "Canonical string reduction",
      author: "Edsger W. Dijkstra",
      likes: 12,
    });
  });
});

describe("most blogs", () => {
  test("return the author with the most blogs", () => {
    const result = listHelper.mostBlogs(dummyBlogs);

    assert.deepStrictEqual(result, { author: "Robert C. Martin", blogs: 3 });
  });
});

describe("most likes", () => {
  test("return the author with highest numbers of summed up likes", () => {
    const result = listHelper.mostLikes(dummyBlogs);

    assert.deepStrictEqual(result, {
      author: "Edsger W. Dijkstra",
      likes: 17,
    });
  });
});

describe("dummy", () => {
  test("dummy that returns 1", () => {
    const blogs = [];

    const result = listHelper.dummy(blogs);
    assert.strictEqual(result, 1);
  });
});

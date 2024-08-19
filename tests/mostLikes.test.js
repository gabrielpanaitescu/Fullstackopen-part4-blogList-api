const { test, describe } = require("node:test");

const assert = require("node:assert");

const listHelper = require("../utils/list_helper");

const { blogs } = require("./blogs");

describe("most likes", () => {
  test("return the author with highest numbers of summed up likes", () => {
    const result = listHelper.mostLikes(blogs);

    assert.deepStrictEqual(result, {
      author: "Edsger W. Dijkstra",
      likes: 17,
    });
  });
});

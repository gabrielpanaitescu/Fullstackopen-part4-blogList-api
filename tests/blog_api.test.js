const { test, describe, beforeEach, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const app = require("../app");
const supertest = require("supertest");
const Blog = require("../models/blog");
const { initialBlogs } = require("./blogsArr");
const helper = require("./tests_helper");

const api = supertest(app);

describe("when there is initially some blogs saved", () => {
  beforeEach(async () => {
    await Blog.deleteMany({});
    const blogObjects = initialBlogs.map((blog) => new Blog(blog));
    const promiseArray = blogObjects.map((blog) => blog.save());
    await Promise.all(promiseArray);
  });

  test("blogs are returned in the right amount, in json format", async () => {
    const response = await api
      .get("/api/blogs")
      .expect(200)
      .expect("Content-Type", /application\/json/);

    assert.strictEqual(response.body.length, initialBlogs.length);
  });

  test("unique identifier key of returned blog objects is 'id'", async () => {
    const response = await api.get("/api/blogs");
    response.body.forEach((blog) => {
      assert(blog.id);
      assert(!blog._id);
    });
  });

  describe("addition of a new blog", () => {
    test("succeeds if data is valid", async () => {
      const newBlog = {
        title: "Canonical string reduction",
        author: "Edsger W. Dijkstra",
        url: "http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html",
        likes: 12,
      };

      await api
        .post("/api/blogs")
        .send(newBlog)
        .expect(201)
        .expect("Content-Type", /application\/json/);

      const blogsAtEnd = await helper.blogsInDb();

      assert.strictEqual(blogsAtEnd.length, initialBlogs.length + 1);

      const titles = blogsAtEnd.map((blog) => blog.title);

      assert(titles.includes(newBlog.title));
    });

    test("fails if likes property is missing and it will default to 0", async () => {
      const newBlog = {
        title: "Blog without likes",
        author: "No likes",
        url: "http://www.nolikes.asd",
      };

      const response = await api
        .post("/api/blogs")
        .send(newBlog)
        .expect(201)
        .expect("Content-Type", /application\/json/);

      assert.strictEqual(response.body.likes, 0);
    });

    test("fails if title property is missing and response status code will be 400", async () => {
      const newBlog = {
        author: "No title",
        url: "http://www.notitle.asd",
        likes: 7,
      };

      await api.post("/api/blogs").send(newBlog).expect(400);
    });

    test("if url property of blog obj is missing, response status code will be 400", async () => {
      const newBlog = {
        title: "No url",
        author: "No url",
        likes: 7,
      };

      await api.post("/api/blogs").send(newBlog).expect(400);
    });

    describe("deletion of a blog", () => {
      test("succeeds with status code 204 if id is valid", async () => {
        const blogsAtStart = await helper.blogsInDb();
        const blogToDelete = blogsAtStart[0];

        console.log(blogToDelete.id);

        await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

        const blogsAtEnd = await helper.blogsInDb();

        assert.strictEqual(blogsAtEnd.length, initialBlogs.length - 1);

        const titles = blogsAtEnd.map((blog) => blog.title);
        assert(!titles.includes(blogToDelete.title));
      });
    });
  });
});

after(async () => {
  await mongoose.connection.close();
});

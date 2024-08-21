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

    test("likes property defaults to 0 if missing", async () => {
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

        await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

        const blogsAtEnd = await helper.blogsInDb();

        assert.strictEqual(blogsAtEnd.length, initialBlogs.length - 1);

        const titles = blogsAtEnd.map((blog) => blog.title);
        assert(!titles.includes(blogToDelete.title));
      });

      test("fails with status code 404 if note id does not exist", async () => {
        const validNonexistingId = await helper.nonExistingId();
        await api.delete(`/api/blogs/${validNonexistingId}`).expect(404);
      });

      test("fails with status code 400 if id is invalid", async () => {
        await api.put("/api/blogs/invalidId").expect(400);
      });
    });

    describe("updating a blog", () => {
      test("succeeds and updates likes if id is valid", async () => {
        const blogsAtStart = await helper.blogsInDb();
        const blogToUpdate = blogsAtStart[0];

        await api
          .put(`/api/blogs/${blogToUpdate.id}`)
          .send({
            ...blogToUpdate,
            likes: blogToUpdate.likes + 1,
          })
          .expect(200)
          .expect("Content-Type", /application\/json/);

        const blogsAtEnd = await helper.blogsInDb();

        const updatedBlog = blogsAtEnd.find(
          (blog) => blog.id === blogToUpdate.id
        );

        assert.strictEqual(updatedBlog.likes, blogToUpdate.likes + 1);
      });

      test("fails with status code 404 if note id does not exist", async () => {
        const validNonexistingId = await helper.nonExistingId();
        const dummyBlog = initialBlogs[0];
        await api
          .put(`/api/blogs/${validNonexistingId}`)
          .send({ ...dummyBlog, likes: dummyBlog.likes + 1 })
          .expect(404);
      });

      test("fails with status code 400 if id is invalid", async () => {
        const dummyBlog = initialBlogs[0];
        await api
          .put("/api/blogs/invalidId")
          .send({ ...dummyBlog, likes: dummyBlog.likes + 1 })
          .expect(400);
      });
    });
  });
});

after(async () => {
  await mongoose.connection.close();
});

const { test, describe, beforeEach, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const app = require("../app");
const supertest = require("supertest");
const Blog = require("../models/blog");
const { initialBlogs } = require("./blogsArr");
const helper = require("./tests_helper");

const api = supertest(app);

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

test("a valid blog can be added", async () => {
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

after(async () => {
  await mongoose.connection.close();
});

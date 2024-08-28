const { test, describe, beforeEach, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const app = require("../app");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");
const User = require("../models/user");
const Blog = require("../models/blog");
const { initialBlogs } = require("./blogsArr");
const helper = require("./tests_helper");

const api = supertest(app);

describe("when there is initially some blogs saved", () => {
  let token;
  let userId;

  beforeEach(async () => {
    await Blog.deleteMany({});
    await User.deleteMany({});

    const user = new User({
      username: "bloguser",
      passwordHash: await bcrypt.hash("blogpassword", 10),
    });

    const savedUser = await user.save();
    userId = savedUser._id;

    token = helper.generateTokenFor(savedUser);

    const blogObjects = initialBlogs.map(
      (blog) => new Blog({ ...blog, user: userId })
    );
    const savedBlogs = await Blog.insertMany(blogObjects);

    savedUser.blogs = savedBlogs.map((blog) => blog._id);
    await savedUser.save();
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

      const result = await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect("Content-Type", /application\/json/);

      const userAtEnd = await User.findById(userId);
      assert.strictEqual(userAtEnd.blogs.length, initialBlogs.length + 1);
      assert(userAtEnd.blogs.includes(result.body.id));

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
        .set("Authorization", `Bearer ${token}`)
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

      await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(400);
    });

    test("if url property of blog obj is missing, response status code will be 400", async () => {
      const newBlog = {
        title: "No url",
        author: "No url",
        likes: 7,
      };

      await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(400);
    });

    test("fails with correct status code if token is missing", async () => {
      const newBlog = {
        title: "No url",
        author: "No url",
        likes: 7,
      };

      const result = await api.post("/api/blogs").send(newBlog).expect(401);

      assert(result.body.error.includes("token missing or invalid"));
    });

    test("fails with correct status code if token is invalid", async () => {
      const newBlog = {
        title: "No url",
        author: "No url",
        likes: 7,
      };

      const result = await api
        .post("/api/blogs")
        .set("Authorization", `dsihjff342834m8439`)
        .send(newBlog)
        .expect(401);

      assert(result.body.error.includes("token missing or invalid"));
    });

    test("fails with correct status code if token is expired", async () => {
      const newBlog = {
        title: "No url",
        author: "No url",
        likes: 7,
      };

      const result = await api
        .post("/api/blogs")
        .set(
          "Authorization",
          `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImdhYnJpZWxwYW5haXRlc2N1OTYiLCJpZCI6IjY2Y2QwMWMzOTY1NTE5NzRkMDAxMmY1ZCIsImlhdCI6MTcyNDc5MTg4MSwiZXhwIjoxNzI0Nzk1NDgxfQ.SUdPRanF_ZxVGX2CVI0UB7GFb4ZULwT8yQrO9FVFf5s"}`
        )
        .send(newBlog)
        .expect(401);

      assert(result.body.error.includes("token expired"));
    });
  });

  describe("deletion of a blog", () => {
    test("succeeds with status code 204 if id is valid", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToDelete = blogsAtStart[0];

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, initialBlogs.length - 1);

      const titles = blogsAtEnd.map((blog) => blog.title);
      assert(!titles.includes(blogToDelete.title));

      const updatedUser = await User.findById(userId);
      assert(!updatedUser.blogs.includes(blogToDelete.id));
    });

    test("fails with status code 404 if blog id does not exist", async () => {
      const validNonexistingId = await helper.nonExistingId();
      const result = await api
        .delete(`/api/blogs/${validNonexistingId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      assert(result.body.error.includes("resource not found"));
    });

    test("fails with status code 400 if id is invalid", async () => {
      const result = await api
        .delete("/api/blogs/invalidId")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      assert(result.body.error.includes("malformatted id"));
    });

    test("fails with status code 401 if token is missing", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToDelete = blogsAtStart[0];

      const result = await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .expect(401);

      assert(result.body.error.includes("token missing or invalid"));
    });

    test("fails with status code 401 if token is invalid", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToDelete = blogsAtStart[0];

      const result = await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set("Authorization", `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.`)
        .expect(401);

      assert(result.body.error.includes("token missing or invalid"));
    });

    test("fails with status code 401 if token is expired", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToDelete = blogsAtStart[0];

      const result = await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set(
          "Authorization",
          `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImdhYnJpZWxwYW5haXRlc2N1OTYiLCJpZCI6IjY2Y2QwMWMzOTY1NTE5NzRkMDAxMmY1ZCIsImlhdCI6MTcyNDc5MTg4MSwiZXhwIjoxNzI0Nzk1NDgxfQ.SUdPRanF_ZxVGX2CVI0UB7GFb4ZULwT8yQrO9FVFf5s"}`
        )
        .expect(401);

      assert(result.body.error.includes("token expired"));
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

describe("when there is initially an user saved in db", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash("sekret", 10);

    const user = new User({
      username: "root_root",
      passwordHash,
    });

    await user.save();
  });

  test("creation succeeds with valid user data", async () => {
    const usersAtStart = await helper.usersInDb();

    const user = {
      username: "testuser123",
      password: "goodpass01!",
    };

    await api
      .post("/api/users")
      .send(user)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1);

    const usernames = usersAtEnd.map((user) => user.username);
    assert(usernames.includes(user.username));
  });

  test("creation fails when username is taken", async () => {
    const usersAtStart = await helper.usersInDb();

    const user = {
      username: "root_root",
      password: "goodpass01!",
    };

    const result = await api
      .post("/api/users")
      .send(user)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    assert(result.body.error.includes("expected `username` to be unique"));

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test("creation fails when username is too short", async () => {
    const usersAtStart = await helper.usersInDb();

    const user = {
      username: "z",
      password: "goodpass01!",
    };

    const result = await api
      .post("/api/users")
      .send(user)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    assert(
      result.body.error.includes("username must be at least 3 characters long")
    );

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test("creation fails when username is missing from the request", async () => {
    const usersAtStart = await helper.usersInDb();

    const user = {
      password: "goodpass01!",
    };

    const result = await api
      .post("/api/users")
      .send(user)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    assert(result.body.error.includes("username is required"));

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test("creation fails when password is missing from the request", async () => {
    const usersAtStart = await helper.usersInDb();

    const user = {
      username: "gooduser1",
    };

    const result = await api
      .post("/api/users")
      .send(user)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    assert(
      result.body.error.includes(
        "please enter a password that is at least 3 characters long"
      )
    );

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test("creation fails when password is too short", async () => {
    const usersAtStart = await helper.usersInDb();

    const user = {
      username: "gooduser1",
      password: "z",
    };

    const result = await api
      .post("/api/users")
      .send(user)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    assert(
      result.body.error.includes(
        "please enter a password that is at least 3 characters long"
      )
    );

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });
});

after(async () => {
  await mongoose.connection.close();
});

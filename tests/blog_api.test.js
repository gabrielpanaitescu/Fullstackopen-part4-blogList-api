const { test, describe, beforeEach, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const app = require("../app");
const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
const supertest = require("supertest");
const User = require("../models/user");
const Blog = require("../models/blog");
const { initialBlogs } = require("./blogsArr");
const helper = require("./tests_helper");

const api = supertest(app);

describe("when there is initially an user and some blogs saved", () => {
  let token;
  let userId;

  beforeEach(async () => {
    await Blog.deleteMany({});
    await User.deleteMany({});

    const user = new User({
      username: "bloguser",
      passwordHash: await bcrypt.hash("blogpassword", 10),
    });
    await user.save();

    userId = user._id;
    token = helper.generateTokenFor(user);

    const blogObjects = initialBlogs.map(
      (blog) => new Blog({ ...blog, user: userId })
    );
    const savedBlogs = await Blog.insertMany(blogObjects);

    user.blogs = savedBlogs.map((blog) => blog._id);
    await user.save();
  });

  test("all blogs are returned (json format)", async () => {
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
      const userBlogs = userAtEnd.blogs.map((blogId) => blogId.toString());

      assert.strictEqual(userBlogs.length, initialBlogs.length + 1);
      assert(userBlogs.includes(result.body.id));

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, initialBlogs.length + 1);

      const titles = blogsAtEnd.map((blog) => blog.title);
      assert(titles.includes(newBlog.title));
    });

    test("if missing from request body payload, likes property defaults to 0", async () => {
      const newBlog = {
        title: "Blog without likes",
        author: "No likes",
        url: "http://www.nolikes.asd",
      };

      const response = await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog);

      assert.strictEqual(response.body.likes, 0);
    });

    test("fails with status code 400 if title property is missing ", async () => {
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

    test("fails with status code 400 if url property is missing ", async () => {
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

    test("fails with status code 401 if token is missing", async () => {
      const newBlog = {
        title: "No url",
        author: "No url",
        likes: 7,
      };

      const result = await api.post("/api/blogs").send(newBlog).expect(401);

      assert(result.body.error.includes("token missing or invalid"));
    });

    test("fails with status code 401 if token is invalid", async () => {
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

    test("fails with status code 401 if token is expired", async () => {
      const newBlog = {
        title: "Title",
        url: "Url",
      };

      const shortLivedToken = helper.generateTokenFor(
        {
          username: "bloguser",
          _id: userId,
        },
        { expiresIn: "1s" }
      );

      await new Promise((res, rej) => setTimeout(res, 1100));

      const result = await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${shortLivedToken}`)
        .send(newBlog)
        .expect(401);

      // alt - hardcoded expired token - eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImdhYnJpZWxwYW5haXRlc2N1OTYiLCJpZCI6IjY2Y2QwMWMzOTY1NTE5NzRkMDAxMmY1ZCIsImlhdCI6MTcyNDc5MTg4MSwiZXhwIjoxNzI0Nzk1NDgxfQ.SUdPRanF_ZxVGX2CVI0UB7GFb4ZULwT8yQrO9FVFf5s

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

      const userAtEnd = await User.findById(userId);
      const userBlogs = userAtEnd.blogs.map((blogId) => blogId.toString());
      assert(!userBlogs.includes(blogToDelete.id));
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

      const shortLivedToken = helper.generateTokenFor(
        {
          username: "bloguser",
          _id: userId,
        },
        { expiresIn: "1s" }
      );

      await new Promise((res, rej) => setTimeout(res, 1100));

      const result = await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set("Authorization", `Bearer ${shortLivedToken}`)
        .expect(401);

      assert(result.body.error.includes("token expired"));
    });
  });

  //npm run test -- --test-name-pattern="updating a blog" tests/blog_api.test.js
  describe("updating a blog", () => {
    test("with a valid id increases the likes and returns status 200 with json content", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect("Content-Type", /application\/json/);

      const blogsAtEnd = await helper.blogsInDb();
      const updatedBlog = blogsAtEnd.find(
        (blog) => blog.id === blogToUpdate.id
      );

      assert.strictEqual(updatedBlog.likes, blogToUpdate.likes + 1);
    });

    test("sending the request twice in a row returns the likes to initial value", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .set("Authorization", `Bearer ${token}`);

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .set("Authorization", `Bearer ${token}`);

      const blogsAtEnd = await helper.blogsInDb();
      const updatedBlog = blogsAtEnd.find(
        (blog) => blog.id === blogToUpdate.id
      );

      assert.strictEqual(updatedBlog.likes, blogToUpdate.likes);
    });

    test("fails with status code 404 if id does not exist", async () => {
      const validNonexistingId = await helper.nonExistingId();
      await api
        .put(`/api/blogs/${validNonexistingId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    test("fails with status code 400 if id is invalid", async () => {
      await api
        .put("/api/blogs/invalidId")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
    });

    test("fails with status code 401 if token is missing", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const result = await api.put(`/api/blogs/${blogToUpdate.id}`).expect(401);

      assert(result.body.error.includes("token missing or invalid"));
    });

    test("fails with status code 401 if token is invalid", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const result = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .set("Authorization", `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.`)
        .expect(401);

      assert(result.body.error.includes("token missing or invalid"));
    });

    test("fails with status code 401 if token is expired", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const shortLivedToken = helper.generateTokenFor(
        {
          username: "bloguser",
          _id: userId,
        },
        { expiresIn: "1s" }
      );

      await new Promise((res, rej) => setTimeout(res, 1100));

      const result = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .set("Authorization", `Bearer ${shortLivedToken}`)
        .expect(401);

      assert(result.body.error.includes("token expired"));
    });
  });
});

describe("when there is initially an user saved in db", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    const user = new User({
      username: "root_root",
      passwordHash: await bcrypt.hash("sekret", 10),
    });

    await user.save();
  });

  test("another user creation succeeds with valid data", async () => {
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

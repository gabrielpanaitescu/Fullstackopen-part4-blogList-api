const Blog = require("../models/blog");
const User = require("../models/user");
const router = require("express").Router();

router.post("/reset", async (request, response) => {
  await Blog.deleteMany({});
  await User.deleteMany({});

  response.status(204).end();
});

module.exports = router;

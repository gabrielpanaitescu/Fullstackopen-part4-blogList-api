const Blog = require("../models/blog");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const nonExistingId = async () => {
  const blog = new Blog({
    title: "asd",
    author: "zzz",
    url: "lmao",
    likes: 0,
  });

  await blog.save();
  await blog.deleteOne();
  return blog.id.toString();
};

const blogsInDb = async () => {
  const blogs = await Blog.find({});
  return blogs.map((blog) => blog.toJSON());
};

const usersInDb = async () => {
  const users = await User.find({});
  return users.map((user) => user.toJSON());
};

const generateTokenFor = (user) => {
  return jwt.sign(
    {
      username: user.username,
      id: user._id,
    },
    process.env.SECRET
  );
};

module.exports = {
  blogsInDb,
  usersInDb,
  nonExistingId,
  generateTokenFor,
};

const Blog = require("../models/blog");

const blogsInDb = async () => {
  const blogs = await Blog.find({});

  return blogs.map((blog) => blog.toJSON());
};

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

module.exports = {
  blogsInDb,
  nonExistingId,
};

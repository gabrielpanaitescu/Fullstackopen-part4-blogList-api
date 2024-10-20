const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");
const middleware = require("../utils/middleware");

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({})
    .populate("user", { username: 1, name: 1 })
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username name",
      },
    });

  response.json(blogs);
});

blogsRouter.post("/", middleware.userExtractor, async (request, response) => {
  const body = request.body;
  const user = request.user;

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    user: user._id,
  });

  const savedBlog = await blog.save();

  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  const blogToReturn = await Blog.findById(savedBlog._id).populate("user", {
    username: 1,
    name: 1,
  });

  response.status(201).json(blogToReturn);
});

blogsRouter.delete(
  "/:id",
  middleware.userExtractor,
  async (request, response) => {
    const user = request.user;
    const blogId = request.params.id;

    const blog = await Blog.findById(blogId);

    if (!blog)
      return response.status(404).json({ error: "resource not found" });

    if (blog.user.toString() !== user._id.toString()) {
      return response
        .status(400)
        .json({ error: "target blog belongs to another user" });
    }

    const deletedBlog = await Blog.findByIdAndDelete(blogId);

    if (!deletedBlog)
      return response.status(404).json({ error: "resource not found" });

    await User.findByIdAndUpdate(
      user._id,
      { $pull: { blogs: blogId } },
      { new: true }
    );

    response.status(204).end();
  }
);

blogsRouter.post(
  "/:id/comments",
  middleware.userExtractor,
  async (request, response) => {
    console.log("request:", request.body);
    const body = request.body;
    const blogId = request.params.id;
    const user = request.user;

    const comment = {
      text: body.text,
      user: user._id,
    };

    const blog = await Blog.findById(blogId);

    if (!blog)
      return response.status(404).json({ error: "resource not found" });

    blog.comments = blog.comments.concat(comment);
    const savedBlog = await blog.save();

    const blogToReturn = await Blog.findById(savedBlog._id)
      .populate("user", "username name")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "username name",
        },
      });

    response.json(blogToReturn);
  }
);

blogsRouter.put("/:id", middleware.userExtractor, async (request, response) => {
  const body = request.body;
  const blogId = request.params.id;
  const user = request.user;

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
    user: body.user,
  };

  // this makes the likes button usable only if the blog creator and logged user are equal
  // if (blog.user !== user._id.toString()) {
  //   return response.status(400).json({
  //     error: "target blog's user is missing or blog belongs to another user",
  //   });
  // }

  const updatedBlog = await Blog.findByIdAndUpdate(blogId, blog, {
    new: true,
  })
    .populate("user", { username: 1, name: 1 })
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username name",
      },
    });

  if (!updatedBlog)
    return response.status(404).json({ error: "resource not found" });

  response.json(updatedBlog);
});

module.exports = blogsRouter;

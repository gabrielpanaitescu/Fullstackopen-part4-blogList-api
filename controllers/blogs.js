const Blog = require("../models/blog");
const User = require("../models/user");
const middleware = require("../utils/middleware");
const blogsRouter = require("express").Router();

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({})
    .populate("user", { username: 1, name: 1 })
    .populate("likedBy", { username: 1 })
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username name",
      },
    });

  response.json(blogs);
});

blogsRouter.get("/:id", async (request, response) => {
  const id = request.params.id;
  const blog = await Blog.findById(id);

  if (!blog) return response.status(404).send({ error: "blog not found" });

  response.json(blog);
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

    await User.findByIdAndUpdate(user._id, { $pull: { blogs: blogId } });

    response.status(204).end();
  }
);

blogsRouter.put("/:id", middleware.userExtractor, async (request, response) => {
  const blogId = request.params.id;
  const user = request.user;

  const blogToUpdate = await Blog.findById(blogId);

  if (!blogToUpdate) {
    return response.status(404).json({ error: "blog not found" });
  }

  const didUserAlreadyLiked = Boolean(
    blogToUpdate.likedBy?.find((id) => id.toString() === user._id.toString())
  );

  const updatedLikeCount = didUserAlreadyLiked
    ? blogToUpdate.likes - 1
    : blogToUpdate.likes + 1;

  const updatedLikedBy = didUserAlreadyLiked
    ? blogToUpdate.likedBy.filter((id) => id.toString() !== user._id.toString())
    : blogToUpdate.likedBy.concat(user._id);

  const returnedBlog = await Blog.findByIdAndUpdate(
    blogId,
    {
      likes: updatedLikeCount,
      likedBy: updatedLikedBy,
    },
    {
      new: true,
    }
  )
    .populate("likedBy", { username: 1 })
    .populate("user", { username: 1, name: 1 })
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username name",
      },
    });

  if (!returnedBlog)
    return response
      .status(404)
      .json({ error: "encountered an issue while updating the blog" });

  response.status(200).json(returnedBlog);
});

blogsRouter.post(
  "/:id/comments",
  middleware.userExtractor,
  async (request, response) => {
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

blogsRouter.delete(
  "/:blogId/:commentId",
  middleware.userExtractor,
  async (request, response) => {
    const { blogId, commentId } = request.params;

    const blogToUpdate = await Blog.findById(blogId);

    if (!blogToUpdate) {
      return response.status(404).json({ error: "blog not found" });
    }

    blogToUpdate.comments = blogToUpdate.comments.filter(
      (comment) => comment._id.toString() !== commentId
    );

    await blogToUpdate.save();

    return response.status(204).json(blogToUpdate);
  }
);

blogsRouter.put(
  "/:blogId/:commentId",
  middleware.userExtractor,
  async (request, response) => {
    const { blogId, commentId } = request.params;

    const { text: updatedText } = request.body;

    const blogToUpdate = await Blog.findById(blogId);

    if (!blogToUpdate) {
      return response.status(404).json({ error: "blog not found" });
    }

    const commentToEdit = blogToUpdate.comments.find(
      (comment) => comment.id === commentId
    );

    if (!commentToEdit)
      return response.status(400).json({ error: "comment to edit not found" });

    const updatedComment = {
      text: updatedText,
      user: commentToEdit.user,
      _id: commentToEdit._id,
      date: commentToEdit.date,
    };

    blogToUpdate.comments = blogToUpdate.comments.map((comment) =>
      comment._id.toString() === commentId ? updatedComment : comment
    );

    await blogToUpdate.save();

    return response.status(200).json(blogToUpdate);
  }
);

module.exports = blogsRouter;

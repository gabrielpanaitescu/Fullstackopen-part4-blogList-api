const dummy = (blogs) => {
  return 1;
};

const totalLikes = (blogs) => {
  const reducer = (accum, item) => {
    return accum + item.likes;
  };

  return blogs.length === 0 ? 0 : blogs.reduce(reducer, 0);
};

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) return null;

  const maxLikes = Math.max(...blogs.map((blog) => blog.likes));

  const topBlog = blogs.find((blog) => blog.likes === maxLikes);

  return {
    title: topBlog.title,
    author: topBlog.author,
    likes: topBlog.likes,
  };
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
};

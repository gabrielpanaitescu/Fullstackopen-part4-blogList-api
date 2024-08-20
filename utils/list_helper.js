const _ = require("lodash");

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

const mostBlogs = (blogs) => {
  const topAuthor = _.maxBy(
    _.entries(_.countBy(blogs, "author")),
    ([_, count]) => count
  );

  return { author: topAuthor[0], blogs: topAuthor[1] };
};

const mostLikes = (blogs) => {
  return _.maxBy(
    _.map(_.groupBy(blogs, "author"), (array, key) => {
      return array.reduce(
        (accum, currItem) => {
          accum.likes += currItem.likes;
          return accum;
        },
        { author: key, likes: 0 }
      );
    }),
    "likes"
  );
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
};

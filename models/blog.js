const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: String,
  author: String,
  MONGODB_URI: String,
  likes: Number,
});

blogSchema.set("toJSON", {
  transform: (document, returnedObj) => {
    returnedObj.id = returnedObj._id;
    delete returnedObj._id;
    delete returnedObj.__v;
  },
});

module.exports = mongoose.model("Blog", blogSchema);

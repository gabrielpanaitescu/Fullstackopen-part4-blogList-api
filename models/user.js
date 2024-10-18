const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "username is required"],
    unique: true,
    minLength: [3, "username must be at least 3 characters long"],
  },
  name: String,
  passwordHash: String,
  blogs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
    },
  ],
});

userSchema.set("toJSON", {
  transform: (document, returnedObj) => {
    // this does not work in the /api/blog/id/comments endpoint; this is due to the fact that we try to populate BOTH blog.user and then blog.comments.user; due to this returnedObj._id will not be present on subsequent toJSON calls due to being already transformed; fix found with ternary bellow but reason why its happening not, as of 10/17
    // returnedObj.id = returnedObj._id.toString();
    returnedObj.id = returnedObj._id
      ? returnedObj._id.toString()
      : returnedObj.id;
    delete returnedObj._id;
    delete returnedObj.__v;
    delete returnedObj.passwordHash;
  },
});

module.exports = mongoose.model("User", userSchema);

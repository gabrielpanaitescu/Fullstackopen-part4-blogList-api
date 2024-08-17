const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: String,
  author: String,
  url: String,
  likes: Number,
});

blogSchema.set("toJSON", {
  transform: (document, returnedObj) => {
    returnedObj.id = returnedObj._id;
    delete returnedObj._id;
    delete returnedObj.__v;
  },
});

const Blog = mongoose.model("Blog", blogSchema);

mongoose.set("strictQuery", false);

const url = `mongodb+srv://gabrielpanaitescu:Cstrike1996@cluster0.zfw1k.mongodb.net/blogListApp?retryWrites=true&w=majority&appName=Cluster0`;

console.log("connecting to: ", url);

mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to MongoDB server");
  })
  .catch((error) => {
    console.log("Connecting to MongoDB failed", error.message);
  });

app.use(cors());
app.use(express.json());

app.get("/api/blogs", (request, response) => {
  Blog.find({}).then((blogs) => {
    response.json(blogs);
  });
});

app.post("/api/blogs", (request, response) => {
  const blog = new Blog(request.body);

  blog.save().then((result) => {
    response.status(201).json(result);
  });
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

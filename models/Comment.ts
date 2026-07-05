import { Schema, model, models } from "mongoose";

const CommentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    text: { type: String, required: true },
  },
  { timestamps: true },
);

export const Comment = models.Comment || model("Comment", CommentSchema);

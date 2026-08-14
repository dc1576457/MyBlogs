import mongoose from "mongoose";

const conversionHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    title: {
      type: String,
      default: "Untitled Request",
    },
    method: {
      type: String,
      default: "GET",
    },
    url: {
      type: String,
      required: true,
    },
    headers: {
      type: Array,
      default: [],
    },
    params: {
      type: Array,
      default: [],
    },
    bodyMode: {
      type: String,
      default: "none",
    },
    rawBody: {
      type: String,
      default: "",
    },
    curlOutput: {
      type: String,
      default: "",
    },
    postmanJson: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  { timestamps: true }
);

const ConversionHistory = mongoose.model("ConversionHistory", conversionHistorySchema);
export default ConversionHistory;
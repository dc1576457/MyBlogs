import mongoose from "mongoose";

const toolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tool name is required"],
      trim: true,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, "Tool description is required"],
      trim: true,
      maxlength: 500,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "YouTube",
        "Instagram",
        "Facebook",
        "Pinterest",
      ],
      index: true,
    },

    icon: {
      type: String,
      default: "🔧",
    },

    route: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Tool =
  mongoose.models.Tool ||
  mongoose.model("Tool", toolSchema);

export default Tool;
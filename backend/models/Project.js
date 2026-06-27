const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    GuestDeviceId: {
      type: String,
      required: true,
      trim: true
    },
    OwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    OriginalAssetUrl: {
      type: String,
      default: null
    },
    EditedAssetUrl: {
      type: String,
      default: null
    },
    OriginalFilename: {
      type: String,
      default: null
    },
    EditedFilename: {
      type: String,
      default: null
    },
    AssetType: {
      type: String,
      enum: ["photo", "video"],
      required: true
    },
    MobileCanvasMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    Status: {
      type: String,
      enum: ["draft", "rendering", "completed"],
      default: "draft"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Project", projectSchema);

const mongoose = require("mongoose");

const AppSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "app" },
    upiId: { type: String, trim: true, default: "" },
    upiName: { type: String, trim: true, default: "Farm" },
  },
  { timestamps: true }
);

const AppSettings = mongoose.model("AppSettings", AppSettingsSchema);

const SETTINGS_KEY = "app";

async function getUpiSettings() {
  let doc = await AppSettings.findOne({ key: SETTINGS_KEY });
  if (!doc) {
    doc = await AppSettings.create({ key: SETTINGS_KEY, upiId: "", upiName: "Farm" });
  }
  return {
    upiId: doc.upiId || "",
    upiName: doc.upiName || "Farm",
  };
}

async function updateUpiSettings(upiId, upiName) {
  const doc = await AppSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        upiId: upiId != null ? String(upiId).trim() : "",
        upiName: upiName != null ? String(upiName).trim() || "Farm" : "Farm",
      },
    },
    { new: true, upsert: true }
  );
  return { upiId: doc.upiId || "", upiName: doc.upiName || "Farm" };
}

module.exports = {
  AppSettings,
  getUpiSettings,
  updateUpiSettings,
};

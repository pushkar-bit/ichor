import { Schema, model, models } from "mongoose";

const CampusZoneSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#AE93F4" },
    polygon: {
      type: { type: String, enum: ["Polygon"], default: "Polygon" },
      coordinates: { type: [[[Number]]], required: true },
    },
    centroid: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    // Normalized 0-100 grid coords for the lightweight SVG campus map (no Maps API key needed)
    gridX: { type: Number, required: true },
    gridY: { type: Number, required: true },
    gridW: { type: Number, default: 16 },
    gridH: { type: Number, default: 12 },
  },
  { timestamps: true },
);

CampusZoneSchema.index({ polygon: "2dsphere" });

export const CampusZone = models.CampusZone || model("CampusZone", CampusZoneSchema);

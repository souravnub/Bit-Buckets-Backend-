const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const BucketSchema = new mongoose.Schema(
    {
        bucketRef: { type: Number, immutable: true },
        title: {
            type: String,
            trim: true,
            required: [true, "bucket title is required"],
            minLength: [3, "minimum length of the title should be 3"],
        },
        owner: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            immutable: true,
            required: true,
        },
    },
    { timestamps: true }
);

BucketSchema.plugin(AutoIncrement, { inc_field: "bucketRef" });

module.exports = mongoose.model("Bucket", BucketSchema);

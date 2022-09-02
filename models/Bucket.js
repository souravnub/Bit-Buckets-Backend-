const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const BucketSchema = new mongoose.Schema(
    {
        bucket_ref: { type: Number, immutable: true },
        title: {
            type: String,
            trim: true,
            required: [true, "bucket title is required"],
            minLength: [3, "minimum length of the title should be 3"],
        },

        users_having_access: [
            { type: mongoose.Types.ObjectId, ref: "User", immutable: true },
        ],
        created_by: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            immutable: true,
            required: true,
        },
    },
    { timestamps: true }
);

BucketSchema.plugin(AutoIncrement, { inc_field: "bucket_ref" });

module.exports = mongoose.model("Bucket", BucketSchema);

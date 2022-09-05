const { Types, Schema, model } = require("mongoose");

const ItemSchema = new Schema(
    {
        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: [true, "userId must be passed while creating an item"],
        },
        bucketId: {
            type: Types.ObjectId,
            ref: "Bucket",
            required: [true, "bucket Id must be passed while creating an item"],
        },
        name: { type: String, required: [true, "item name is required"] },
        quantity: { type: String, default: "1kg" }, // can be 1pcs , 1 gram , 1 milligram , etc..
        isPurchased: { type: Boolean, default: false },
        discription: {
            type: String,
            minLength: [3, "minimum description length should be 3"],
        },
        priorityLevel: {
            type: Number,
            enum: {
                values: [1, 2, 3, 4],
                message: "status: priority value of {VALUE} is not supported",
            },
            default: 4,
        },
        comments: [
            {
                user: {
                    type: Types.ObjectId,
                    ref: "User",
                    immutable: true,
                },
                userName: { type: String, trim: true, required: true },
                profileImg: {
                    type: String,
                    required: [
                        true,
                        "passing in profile img is must while commenting",
                    ],
                },
                comment: {
                    type: String,
                    trim: true,
                    minLength: [3, "minimum comment length should be 3"],
                    required: true,
                },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

module.exports = model("Item", ItemSchema);

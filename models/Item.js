const { Types, Schema, model } = require("mongoose");

const ItemSchema = new Schema(
    {
        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: [true, "userId must be passed while creating an item"],
        },
        bucket_id: {
            type: Types.ObjectId,
            ref: "Bucket",
            required: [true, "bucket Id must be passed while creating an item"],
        },
        name: { type: String, required: [true, "item name is required"] },
        quantity: { type: String, default: "1kg" }, // can be 1pcs , 1 gram , 1 milligram , etc..
        is_purchased: { type: Boolean, default: false },
        discription: {
            type: String,
            minLength: [3, "minimum description length should be 3"],
        },
        priority_level: {
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
                    required: [
                        true,
                        "providing username is must while commenting",
                    ],
                },
                user_name: { type: String, required: true },
                comment: {
                    type: String,
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

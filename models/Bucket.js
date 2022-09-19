const mongoose = require("mongoose");
const { NotFoundError } = require("../errors");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const compareBcryptHash = require("../utils/compareBcryptHash");
const genHash = require("../utils/genHash");
const Item = require("./Item");

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
        private: { type: Boolean, default: false },
        password: {
            type: String,
            required: [true, "password while creating a bucket is must"],
        },
    },
    { timestamps: true }
);

BucketSchema.plugin(AutoIncrement, { inc_field: "bucketRef" });

BucketSchema.pre("save", async function () {
    const password = this.password;
    const hash = await genHash(password);
    this.password = hash;
});

// findByIdAndDelete also calls findOneAndDelete middleware
BucketSchema.post("findOneAndDelete", async function (doc) {
    // have to define User inside the function because it was not working if it was defined outside the middleware function!
    const User = require("./User");

    if (!doc) {
        throw new NotFoundError("No bucket found");
    }
    const { _id: bucketId } = doc;

    // removing all the items that belongs to the current bucket
    const items = await Item.find({ bucketId });
    const deleted_items_promise_arr = items.map((item) => item.delete());
    await Promise.allSettled(deleted_items_promise_arr);

    // removing the bucket from the user's accessible Bucket array
    const usersHavingAccessToBucket = await User.find({
        accessibleBuckets: bucketId,
    });

    const removing_bucket_from_users_having_access_promise_arr =
        usersHavingAccessToBucket.map((user) => {
            return user.updateOne({ $pull: { accessibleBuckets: bucketId } });
        });

    await Promise.allSettled(
        removing_bucket_from_users_having_access_promise_arr
    );
});

// method for comparing hash
BucketSchema.methods.compareHash = async function (passwordStr) {
    const isPasswordValid = await compareBcryptHash(passwordStr, this.password);
    return isPasswordValid;
};

module.exports = mongoose.model("Bucket", BucketSchema);

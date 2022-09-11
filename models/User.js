const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const compareBcryptHash = require("../utils/compareBcryptHash");
const genHash = require("../utils/genHash");
const Bucket = require("./Bucket");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const UserSchema = new mongoose.Schema(
    {
        userRef: { type: Number, immutable: true },
        userName: {
            type: String,
            required: true,
            trim: true,
            minLength: [3, "username must be 3 or more than 3 characters long"],
        },
        profileImg: {
            type: String,
            default:
                "https://res.cloudinary.com/sourav-cloudinary-account/image/upload/v1662185657/Bit-Buckets/avatar-unknown.png",
        },
        email: {
            type: String,
            required: [true, "email is required"],
            trim: true,
            match: [
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please fill a valid email address",
            ],
            unique: true,
        },
        password: {
            type: String,
            required: [true, "password is required"],
        },
        accessibleBuckets: [
            {
                type: mongoose.Types.ObjectId,
                ref: "Bucket",
                immutable: true,
            },
        ],
        linkedUsers: [
            {
                type: mongoose.Types.ObjectId,
                ref: "Bucket",
                immutable: true, // should not be able to update the userId using the put or patch
            },
        ],
    },
    { timestamps: true }
);

UserSchema.plugin(AutoIncrement, { inc_field: "userRef" });

// hashing the password before saving the user to the db
UserSchema.pre("save", async function () {
    const password = this.password;
    const hash = await genHash(password);
    this.password = hash;
});

UserSchema.post("remove", async function () {
    const buckets = await Bucket.find({ owner: this._id });
    const buckets_promise_arr = buckets.map((bucket) =>
        Bucket.findByIdAndDelete(bucket._id)
    );
    await Promise.allSettled(buckets_promise_arr);
});

// method for generating jwt
UserSchema.methods.genToken = function () {
    const token = jwt.sign({ userId: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_LIFETIME || "7d",
    });
    return token;
};

// method for comparing hash
UserSchema.methods.compareHash = async function (passwordStr) {
    const isPasswordValid = await compareBcryptHash(passwordStr, this.password);
    return isPasswordValid;
};

module.exports = mongoose.model("User", UserSchema);

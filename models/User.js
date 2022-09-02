const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const UserSchema = new mongoose.Schema(
    {
        user_ref: { type: Number, immutable: true },
        user_name: {
            type: String,
            required: true,
            trim: true,
            minLength: [3, "username must be 3 or more than 3 characters long"],
        },
        profile_img: {
            type: String,
            default:
                "https://t4.ftcdn.net/jpg/00/97/00/09/360_F_97000908_wwH2goIihwrMoeV9QF3BW6HtpsVFaNVM.jpg",
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
        linked_users: [
            {
                type: mongoose.Types.ObjectId,
                ref: "Bucket",
                immutable: true, // should not be able to update the userId using the put or patch
            },
        ],
    },
    { timestamps: true }
);

UserSchema.plugin(AutoIncrement, { inc_field: "user_ref" });

// hashing the password before saving the user to the db
UserSchema.pre("save", async function () {
    const password = this.password;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    this.password = hash;
});

// method for generating jwt
UserSchema.methods.genToken = function () {
    const token = jwt.sign({ userId: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_LIFETIME,
    });
    return token;
};

// method for comparing hash
UserSchema.methods.compareHash = function (passwordStr) {
    const isPasswordValid = bcrypt.compare(passwordStr, this.password);
    return isPasswordValid;
};

module.exports = mongoose.model("User", UserSchema);

const mongoose = require("mongoose");
const { Schema } = mongoose;

const insuranceSchema = new Schema({
    lsa: {
        type: String,
        required: true,
        unique: true,
    },
    instrument: {
        type: String,
        required: true,
    },
    insuranceAmount: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: true,
    },
    btcPrice: {
        type: Number,
        required: true,
    },
    orderId: {
        type: String,
        required: true,
    },
    contractsAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['buying', 'bought', 'selling', 'sold'],
        required: true,
        default: 'buying',
    },
    insuranceIdUpdate: {
        type: String,
        default: null,
    },
    sellOrderId: {
        type: String,
        required: false,
        default: null,
    },
    sellingPrice: {
        type: String,
        required: true,
    },
});

const Insurance = mongoose.model("Insurance", insuranceSchema)

module.exports = {
    Insurance
}

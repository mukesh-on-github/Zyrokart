const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        trim: true
    },
    brand: {
        type: String,
        trim: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        alt: String
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'out_of_stock', 'archived'],
        default: 'active'
    },
    tags: [String],
    featured: {
        type: Boolean,
        default: false
    },
    trending: {
        type: Boolean,
        default: false
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    specifications: [{
        key: String,
        value: String
    }],
    supplierInfo: {
        supplierName: String,
        supplierPid: String, // CJ Product ID
        costPrice: Number,
        shippingMethods: [String]
    }
}, {
    timestamps: true
});

// Text index for search functionality
productSchema.index({ 
    name: 'text', 
    description: 'text', 
    tags: 'text',
    brand: 'text',
    category: 'text'
});

// Indexes for filtering
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ trending: 1, status: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
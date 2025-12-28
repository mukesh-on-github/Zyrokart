const express = require('express');
const router = express.Router();
const Address = require('../models/Address'); // Ensure this model exists
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route   POST /api/address
 * @desc    Add a new address for a user
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { fullName, phoneNumber, street, city, state, zipCode, country, isDefault } = req.body;

        // If this is set as default, remove default status from other addresses of this user
        if (isDefault) {
            await Address.updateMany({ userId: req.user.id }, { isDefault: false });
        }

        const newAddress = new Address({
            userId: req.user.id,
            fullName,
            phoneNumber,
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: isDefault || false
        });

        const savedAddress = await newAddress.save();
        res.status(201).json(savedAddress);
    } catch (error) {
        console.error('Error saving address:', error);
        res.status(500).json({ message: 'Server error while saving address' });
    }
});

/**
 * @route   GET /api/address
 * @desc    Get all addresses for the logged-in user
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const addresses = await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
        res.json(addresses);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ message: 'Server error while fetching addresses' });
    }
});

/**
 * @route   PUT /api/address/:id
 * @desc    Update an address
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { isDefault } = req.body;

        if (isDefault) {
            await Address.updateMany({ userId: req.user.id }, { isDefault: false });
        }

        const updatedAddress = await Address.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: req.body },
            { new: true }
        );

        if (!updatedAddress) return res.status(404).json({ message: 'Address not found' });
        res.json(updatedAddress);
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ message: 'Server error while updating address' });
    }
});

/**
 * @route   DELETE /api/address/:id
 * @desc    Delete an address
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletedAddress = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deletedAddress) return res.status(404).json({ message: 'Address not found' });
        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'Server error while deleting address' });
    }
});

module.exports = router;
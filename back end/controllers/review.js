const db = require('../models');

const Review = db.Review;
const ReviewImage = db.ReviewImage;
const Order = db.Order;
const OrderLine = db.OrderLine;
const Customer = db.Customer;

// Create review - user must have purchased the item in a Completed order
exports.createReview = async (req, res) => {
    try {
        const userId = req.user?.id || req.body?.user?.id;
        if (!userId) return res.status(401).json({ message: 'Login required' });

        const { item_id, rating, comment } = req.body;
        if (!item_id || !rating) return res.status(400).json({ message: 'item_id and rating required' });

        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) return res.status(404).json({ message: 'Customer profile not found' });

        // Verify the customer has a completed order containing the item
        const purchased = await OrderLine.findOne({
            where: { item_id },
            include: [{ model: Order, where: { customer_id: customer.customer_id, status: 'Completed' } }]
        });

        if (!purchased) return res.status(403).json({ message: 'You can only review items you have purchased and completed' });

        // Prevent duplicate reviews
        const already = await Review.findOne({ where: { item_id, customer_id: customer.customer_id } });
        if (already) return res.status(400).json({ message: 'You have already reviewed this item' });

        const parsedRating = Number(rating);
        if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
        }

        const review = await Review.create({ item_id, customer_id: customer.customer_id, rating: parsedRating, comment });

        // handle images if any
        const files = req.files || [];
        const filePaths = files.map(f => String(f.path).replace(/\\/g, '/'));
        for (let i = 0; i < filePaths.length; i++) {
            await ReviewImage.create({ review_id: review.review_id, image_path: filePaths[i], sort_order: i });
        }

        return res.status(201).json({ success: true, review });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error creating review', details: error.message });
    }
};

// Get reviews for an item (public)
exports.getItemReviews = async (req, res) => {
    try {
        const itemId = req.params.itemId || req.query.item_id;
        if (!itemId) return res.status(400).json({ message: 'item id required' });

        const reviews = await Review.findAll({
            where: { item_id: itemId, is_visible: true },
            include: [{ model: ReviewImage }, { model: Customer, include: [{ model: db.User }] }],
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({ success: true, rows: reviews });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching reviews', details: error.message });
    }
};

// Admin: list all reviews
exports.listAllReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({ include: [{ model: ReviewImage }, { model: Customer }, { model: db.Item }] , order: [['created_at', 'DESC']] });
        return res.status(200).json({ success: true, rows: reviews });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching reviews', details: error.message });
    }
};

// Admin: update visibility
exports.updateVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_visible } = req.body;
        await Review.update({ is_visible: !!is_visible }, { where: { review_id: id } });
        return res.status(200).json({ success: true, message: 'Visibility updated' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating review', details: error.message });
    }
};

// Admin: delete review
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        await ReviewImage.destroy({ where: { review_id: id } });
        await Review.destroy({ where: { review_id: id } });
        return res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error deleting review', details: error.message });
    }
};

// Eligibility check: can current user review this item?
exports.checkEligibility = async (req, res) => {
    try {
        const userId = req.user?.id || req.body?.user?.id;
        const { item_id } = req.query;
        if (!userId) return res.status(401).json({ eligible: false, message: 'Login required' });
        if (!item_id) return res.status(400).json({ eligible: false, message: 'item_id required' });

        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) return res.status(404).json({ eligible: false, message: 'Customer profile not found' });

        const purchased = await OrderLine.findOne({
            where: { item_id },
            include: [{ model: Order, where: { customer_id: customer.customer_id, status: 'Completed' } }]
        });

        if (!purchased) return res.status(200).json({ eligible: false });

        // Ensure customer hasn't already reviewed this item
        const existing = await Review.findOne({ where: { item_id, customer_id: customer.customer_id } });
        if (existing) return res.status(200).json({ eligible: false, alreadyReviewed: true });

        return res.status(200).json({ eligible: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ eligible: false, message: error.message });
    }
};

const Supplier = require('../models/Supplier');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');

const createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create({
            ...req.body,
            company: getCompanyId(req)
        });

        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione del fornitore', error: error.message });
    }
};

const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find({ company: getCompanyId(req), active: true });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei fornitori', error: error.message });
    }
};

const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!supplier) {
            return res.status(404).json({ message: 'Fornitore non trovato' });
        }

        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'aggiornamento del fornitore', error: error.message });
    }
};

// Smart supplier recommendation
const recommendSupplier = async (req, res) => {
    try {
        const { materialName, preferences } = req.body;

        // Default preferences
        const {
            maxPrice = Infinity,
            minQuality = 0,
            maxDeliveryTime = Infinity
        } = preferences || {};

        // Find suppliers with the material
        const suppliers = await Supplier.find({
            company: getCompanyId(req),
            active: true,
            'materials.name': { $regex: materialName, $options: 'i' }
        });

        // Score each supplier
        const scored = suppliers
            .map(supplier => {
                const material = supplier.materials.find(m =>
                    m.name.toLowerCase().includes(materialName.toLowerCase())
                );

                if (!material) return null;

                let score = 0;

                // Quality score (0-50 points)
                score += (supplier.qualityRating / 10) * 50;

                // Price score (0-30 points) - lower is better
                if (material.averagePrice) {
                    const priceScore = Math.max(0, 30 - (material.averagePrice / maxPrice) * 30);
                    score += priceScore;
                }

                // Delivery time score (0-20 points) - faster is better
                const deliveryScore = Math.max(0, 20 - (supplier.deliveryTime / maxDeliveryTime) * 20);
                score += deliveryScore;

                // Filter by constraints
                if (material.averagePrice > maxPrice ||
                    supplier.qualityRating < minQuality ||
                    supplier.deliveryTime > maxDeliveryTime) {
                    return null;
                }

                return {
                    supplier,
                    material,
                    score,
                    breakdown: {
                        qualityScore: (supplier.qualityRating / 10) * 50,
                        priceScore: material.averagePrice ? Math.max(0, 30 - (material.averagePrice / maxPrice) * 30) : 0,
                        deliveryScore
                    }
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);

        res.json({
            recommendations: scored.slice(0, 5), // Top 5
            totalFound: scored.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore nella raccomandazione', error: error.message });
    }
};

module.exports = { createSupplier, getSuppliers, updateSupplier, recommendSupplier };

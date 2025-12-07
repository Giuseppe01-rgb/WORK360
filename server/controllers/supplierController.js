const { Supplier } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { Op } = require('sequelize');

const createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create({
            ...req.body,
            companyId: getCompanyId(req)
        });

        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione del fornitore', error: error.message });
    }
};

const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
            where: {
                companyId: getCompanyId(req),
                active: true
            }
        });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei fornitori', error: error.message });
    }
};

const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: 'Fornitore non trovato' });
        }

        await supplier.update(req.body);

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

        // Find suppliers with the material (basic implementation - materials is JSONB)
        const suppliers = await Supplier.findAll({
            where: {
                companyId: getCompanyId(req),
                active: true
            }
        });

        // Filter and score suppliers client-side (since materials is JSONB)
        const scored = suppliers
            .map(supplier => {
                if (!supplier.materials || !Array.isArray(supplier.materials)) return null;

                const material = supplier.materials.find(m =>
                    m.name && m.name.toLowerCase().includes(materialName.toLowerCase())
                );

                if (!material) return null;

                let score = 0;

                // Quality score (0-50 points)
                score += (supplier.rating / 10) * 50;

                // Price score (0-30 points) - lower is better
                if (material.averagePrice) {
                    const priceScore = Math.max(0, 30 - (material.averagePrice / maxPrice) * 30);
                    score += priceScore;
                }

                // Delivery time score (0-20 points) - faster is better  
                const deliveryTime = supplier.deliveryTime || 0;
                const deliveryScore = Math.max(0, 20 - (deliveryTime / maxDeliveryTime) * 20);
                score += deliveryScore;

                // Filter by constraints
                if (material.averagePrice > maxPrice ||
                    supplier.rating < minQuality ||
                    deliveryTime > maxDeliveryTime) {
                    return null;
                }

                return {
                    supplier,
                    material,
                    score,
                    breakdown: {
                        qualityScore: (supplier.rating / 10) * 50,
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

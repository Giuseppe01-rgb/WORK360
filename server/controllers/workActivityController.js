const WorkActivity = require('../models/WorkActivity');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

// Create a new work activity
exports.create = async (req, res) => {
    try {
        const { siteId, activityType, quantity, unit, notes, date } = req.body;

        const activity = new WorkActivity({
            company: req.user.company,
            site: siteId,
            user: req.user._id,
            date: date || new Date(),
            activityType,
            quantity,
            unit,
            notes
        });

        await activity.save();
        res.status(201).json(activity);
    } catch (error) {
        console.error('Error creating work activity:', error);
        res.status(500).json({ message: 'Errore nella creazione dell\'attività' });
    }
};

// Update an existing work activity
exports.update = async (req, res) => {
    try {
        const { activityType, quantity, unit, notes, date } = req.body;
        const activityId = req.params.id;

        // Find the activity
        const activity = await WorkActivity.findById(activityId);

        if (!activity) {
            return res.status(404).json({ message: 'Attività non trovata' });
        }

        // Authorization check: only creator or owner can update
        const userCompanyId = req.user.company?._id || req.user.company;
        const activityCompanyId = activity.company;
        const userId = req.user._id;
        const activityUserId = activity.user;

        const isCompanyMatch = userCompanyId && activityCompanyId && userCompanyId.toString() === activityCompanyId.toString();
        const isCreatorMatch = userId && activityUserId && userId.toString() === activityUserId.toString();
        const isOwner = req.user.role === 'owner';

        // Owner can update any activity from their company, worker can only update their own
        if (!isCompanyMatch || (!isOwner && !isCreatorMatch)) {
            return res.status(403).json({ message: 'Non autorizzato a modificare questa attività' });
        }

        // Update fields
        if (activityType !== undefined) activity.activityType = activityType;
        if (quantity !== undefined) activity.quantity = quantity;
        if (unit !== undefined) activity.unit = unit;
        if (notes !== undefined) activity.notes = notes;
        if (date !== undefined) activity.date = date;

        await activity.save();
        res.json(activity);
    } catch (error) {
        console.error('Error updating work activity:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento dell\'attività' });
    }
};

// Get work activities with filters
exports.getAll = async (req, res) => {
    try {
        const { userId, siteId, startDate, endDate } = req.query;

        const query = { company: req.user.company };

        if (userId) query.user = userId;
        if (siteId) query.site = siteId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const activities = await WorkActivity.find(query)
            .populate('user', 'name')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(activities);
    } catch (error) {
        console.error('Error fetching work activities:', error);
        res.status(500).json({ message: 'Errore nel recupero delle attività' });
    }
};

// Distribute time percentages and calculate duration hours
exports.distributeTime = async (req, res) => {
    try {
        const { activities } = req.body; // Array of { id, percentageTime }
        const userId = req.user._id;

        if (!activities || activities.length === 0) {
            return res.status(400).json({ message: 'Nessuna attività fornita' });
        }

        // Validate total percentage equals 100
        const totalPercentage = activities.reduce((sum, a) => sum + a.percentageTime, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
            return res.status(400).json({
                message: `La somma delle percentuali deve essere 100% (attuale: ${totalPercentage.toFixed(1)}%)`
            });
        }

        // Get the first activity to determine the date
        const firstActivity = await WorkActivity.findById(activities[0].id);
        if (!firstActivity) {
            return res.status(404).json({ message: 'Attività non trovata' });
        }

        // Find attendance for that date
        const startOfDay = new Date(firstActivity.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(firstActivity.date);
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await Attendance.findOne({
            user: userId,
            'clockIn.time': { $gte: startOfDay, $lte: endOfDay }
        });

        if (!attendance || !attendance.totalHours) {
            return res.status(400).json({
                message: 'Nessuna timbratura trovata per questa data o ore totali non disponibili'
            });
        }

        const totalHours = attendance.totalHours;

        // Update each activity with percentage and calculated hours
        const updatePromises = activities.map(async (activityData) => {
            const durationHours = totalHours * (activityData.percentageTime / 100);

            return WorkActivity.findByIdAndUpdate(
                activityData.id,
                {
                    percentageTime: activityData.percentageTime,
                    durationHours: parseFloat(durationHours.toFixed(2))
                },
                { new: true }
            );
        });

        const updatedActivities = await Promise.all(updatePromises);

        res.json({
            message: 'Distribuzione del tempo salvata con successo',
            activities: updatedActivities,
            totalHours
        });
    } catch (error) {
        console.error('Error distributing time:', error);
        res.status(500).json({ message: 'Errore nella distribuzione del tempo' });
    }
};

// @desc    Delete work activity
// @route   DELETE /api/work-activities/:id
// @access  Private (Worker/Owner)
// @desc    Delete work activity
// @route   DELETE /api/work-activities/:id
// @access  Private (Worker/Owner)
exports.deleteActivity = async (req, res) => {
    try {
        const activity = await WorkActivity.findById(req.params.id);

        if (!activity) {
            console.warn(`Activity not found for delete: ${req.params.id}`);
            return res.status(404).json({ message: 'Attività non trovata' });
        }

        // Robust ownership check
        const userCompanyId = req.user.company?._id || req.user.company;
        const activityCompanyId = activity.company;
        const userId = req.user._id;
        const activityUserId = activity.user;

        const isCompanyMatch = userCompanyId && activityCompanyId && userCompanyId.toString() === activityCompanyId.toString();
        const isCreatorMatch = userId && activityUserId && userId.toString() === activityUserId.toString();
        const isOwner = req.user.role === 'owner';

        // Owner can delete any activity from their company, worker can only delete their own
        if (!isCompanyMatch || (!isOwner && !isCreatorMatch)) {
            console.warn(`Unauthorized activity delete attempt. User: ${userId}, Activity: ${activity._id}`);
            return res.status(401).json({ message: 'Non autorizzato' });
        }

        await activity.deleteOne();
        res.json({ message: 'Attività eliminata' });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ message: 'Errore server', error: error.message });
    }
};

// Get analytics data
exports.getAnalytics = async (req, res) => {
    try {
        const { userId, siteId, startDate, endDate, groupBy } = req.query;

        const matchStage = { company: req.user.company._id || req.user.company };

        if (userId) matchStage.user = new mongoose.Types.ObjectId(userId);
        if (siteId) matchStage.site = new mongoose.Types.ObjectId(siteId);
        if (startDate || endDate) {
            matchStage.date = {};
            if (startDate) matchStage.date.$gte = new Date(startDate);
            if (endDate) matchStage.date.$lte = new Date(endDate);
        }

        let groupByField;
        switch (groupBy) {
            case 'user':
                groupByField = '$user';
                break;
            case 'site':
                groupByField = '$site';
                break;
            case 'activity':
            default:
                groupByField = '$activityType';
                break;
        }

        const analytics = await WorkActivity.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: groupByField,
                    totalQuantity: { $sum: '$quantity' },
                    totalHours: { $sum: '$durationHours' },
                    unit: { $first: '$unit' }, // Get the unit from the first document
                    avgProductivity: {
                        $avg: {
                            $cond: [
                                { $gt: ['$durationHours', 0] },
                                { $divide: ['$quantity', '$durationHours'] },
                                0
                            ]
                        }
                    },
                    activities: { $push: '$$ROOT' }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalQuantity: 1,
                    totalHours: 1,
                    unit: 1, // Pass unit to result
                    productivity: {
                        $cond: [
                            { $gt: ['$totalHours', 0] },
                            { $divide: ['$totalQuantity', '$totalHours'] },
                            0
                        ]
                    },
                    avgProductivity: 1,
                    activityCount: { $size: '$activities' }
                }
            }
        ]);

        res.json(analytics);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Errore nel recupero delle analisi' });
    }
};

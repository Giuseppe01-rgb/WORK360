const { WorkActivity, User, ConstructionSite, Attendance } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { sanitizeAllDates } = require('../utils/dateValidator');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Create a new work activity
exports.create = async (req, res) => {
    try {
        // Accept both old format (quantity/unit) and new format (description/hours)
        const { siteId, activityType, quantity, unit, notes, date, description, hours } = req.body;

        const activityData = sanitizeAllDates({
            companyId: getCompanyId(req),
            siteId,
            userId: getUserId(req),
            date: date || new Date(),
            activityType,
            // Use description if provided, otherwise create from activityType
            description: description || activityType || '',
            // Use hours if provided, otherwise use quantity as hours
            hours: hours || quantity || 0,
            notes: notes || ''
        });

        const activity = await WorkActivity.create(activityData);
        res.status(201).json(activity);
    } catch (error) {
        console.error('Error creating work activity:', error);
        res.status(500).json({ message: 'Errore nella creazione dell\'attività', error: error.message });
    }
};

// Update an existing work activity
exports.update = async (req, res) => {
    try {
        // Accept both old format (quantity/unit) and new format (description/hours)
        const { activityType, quantity, unit, notes, date, description, hours } = req.body;
        const activityId = req.params.id;

        const activity = await WorkActivity.findByPk(activityId);

        if (!activity) {
            return res.status(404).json({ message: 'Attività non trovata' });
        }

        // Authorization check
        const userCompanyId = getCompanyId(req);
        const isCompanyMatch = userCompanyId && activity.companyId === userCompanyId;
        const isCreatorMatch = activity.userId === getUserId(req);
        const isOwner = req.user.role === 'owner';

        if (!isCompanyMatch || (!isOwner && !isCreatorMatch)) {
            return res.status(403).json({ message: 'Non autorizzato a modificare questa attività' });
        }

        // Build update data - map old fields to new
        const updateData = {};
        if (activityType !== undefined) updateData.activityType = activityType;
        if (description !== undefined) updateData.description = description;
        else if (activityType !== undefined) updateData.description = activityType;
        if (hours !== undefined) updateData.hours = hours;
        else if (quantity !== undefined) updateData.hours = quantity;
        if (notes !== undefined) updateData.notes = notes;
        if (date !== undefined) updateData.date = date;

        const sanitizedUpdate = sanitizeAllDates(updateData);

        await activity.update(sanitizedUpdate);
        res.json(activity);
    } catch (error) {
        console.error('Error updating work activity:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento dell\'attività', error: error.message });
    }
};

// Get work activities with filters
exports.getAll = async (req, res) => {
    try {
        const { userId, siteId, startDate, endDate } = req.query;

        const where = { companyId: getCompanyId(req) };

        if (userId) where.userId = userId;
        if (siteId) where.siteId = siteId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = new Date(startDate);
            if (endDate) where.date[Op.lte] = new Date(endDate);
        }

        const activities = await WorkActivity.findAll({
            where,
            include: [
                { model: User, as: 'user', attributes: ['firstName', 'lastName', 'username'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ],
            order: [['date', 'DESC']]
        });

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
        const userId = getUserId(req);

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
        const firstActivity = await WorkActivity.findByPk(activities[0].id);
        if (!firstActivity) {
            return res.status(404).json({ message: 'Attività non trovata' });
        }

        // Find attendance for that date
        const startOfDay = new Date(firstActivity.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(firstActivity.date);
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await Attendance.findOne({
            where: {
                userId,
                // clockIn.time stored as JSONB - need to query it differently
                createdAt: { [Op.between]: [startOfDay, endOfDay] }
            }
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

            const activity = await WorkActivity.findByPk(activityData.id);
            if (activity) {
                await activity.update({
                    percentageTime: activityData.percentageTime,
                    durationHours: parseFloat(durationHours.toFixed(2))
                });
                return activity;
            }
            return null;
        });

        const updatedActivities = await Promise.all(updatePromises);

        res.json({
            message: 'Distribuzione del tempo salvata con successo',
            activities: updatedActivities.filter(Boolean),
            totalHours
        });
    } catch (error) {
        console.error('Error distributing time:', error);
        res.status(500).json({ message: 'Errore nella distribuzione del tempo' });
    }
};

// Delete work activity
exports.deleteActivity = async (req, res) => {
    try {
        const activity = await WorkActivity.findByPk(req.params.id);

        if (!activity) {
            console.warn(`Activity not found for delete: ${req.params.id}`);
            return res.status(404).json({ message: 'Attività non trovata' });
        }

        // Authorization check
        const userCompanyId = getCompanyId(req);
        const isCompanyMatch = userCompanyId && activity.companyId === userCompanyId;
        const isCreatorMatch = activity.userId === getUserId(req);
        const isOwner = req.user.role === 'owner';

        if (!isCompanyMatch || (!isOwner && !isCreatorMatch)) {
            console.warn(`Unauthorized activity delete attempt. User: ${getUserId(req)}, Activity: ${activity.id}`);
            return res.status(401).json({ message: 'Non autorizzato' });
        }

        await activity.destroy();
        res.json({ message: 'Attività eliminata' });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ message: 'Errore server', error: error.message });
    }
};

// Get analytics data
exports.getAnalytics = async (req, res) => {
    try {
        const { userId, siteId, startDate, endDate, groupBy = 'activity' } = req.query;

        const where = { companyId: getCompanyId(req) };
        if (userId) where.userId = userId;
        if (siteId) where.siteId = siteId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = new Date(startDate);
            if (endDate) where.date[Op.lte] = new Date(endDate);
        }

        // Determine group by field
        let groupByField;
        switch (groupBy) {
            case 'user':
                groupByField = 'user_id';
                break;
            case 'site':
                groupByField = 'site_id';
                break;
            case 'activity':
            default:
                groupByField = 'activity_type';
                break;
        }

        // Build WHERE clause for raw SQL
        const whereClauses = [`company_id = :companyId`];
        const replacements = { companyId: getCompanyId(req) };

        if (userId) {
            whereClauses.push(`user_id = :userId`);
            replacements.userId = userId;
        }
        if (siteId) {
            whereClauses.push(`site_id = :siteId`);
            replacements.siteId = siteId;
        }
        if (startDate) {
            whereClauses.push(`date >= :startDate`);
            replacements.startDate = new Date(startDate);
        }
        if (endDate) {
            whereClauses.push(`date <= :endDate`);
            replacements.endDate = new Date(endDate);
        }

        // Use raw SQL for analytics aggregation
        const analytics = await sequelize.query(`
            SELECT 
                ${groupByField} as group_key,
                SUM(quantity) as total_quantity,
                SUM(duration_hours) as total_hours,
                MAX(unit) as unit,
                CASE 
                    WHEN SUM(duration_hours) > 0 THEN SUM(quantity) / SUM(duration_hours)
                    ELSE 0
                END as productivity,
                AVG(
                    CASE 
                        WHEN duration_hours > 0 THEN quantity / duration_hours
                        ELSE 0
                    END
                ) as avg_productivity,
                COUNT(*) as activity_count
            FROM work_activities
            WHERE ${whereClauses.join(' AND ')}
            GROUP BY ${groupByField}
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json(analytics);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Errore nel recupero delle analisi' });
    }
};

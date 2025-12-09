const User = require('./User');
const Company = require('./Company');
const ConstructionSite = require('./ConstructionSite');
const Attendance = require('./Attendance');
const Material = require('./Material');
const MaterialMaster = require('./MaterialMaster');
const Note = require('./Note');
const Photo = require('./Photo');
const Equipment = require('./Equipment');
const Economia = require('./Economia');
const ReportedMaterial = require('./ReportedMaterial');
const ColouraMaterial = require('./ColouraMaterial');
const MaterialUsage = require('./MaterialUsage');
const Quote = require('./Quote');
const SAL = require('./SAL');
const Supplier = require('./Supplier');
const WorkActivity = require('./WorkActivity');
const Document = require('./Document');
const AuditLog = require('./AuditLog');

// ========== ASSOCIATIONS ==========

// Company relationships
Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });
Company.hasMany(ConstructionSite, { foreignKey: 'companyId', as: 'sites' });
Company.hasMany(Material, { foreignKey: 'companyId', as: 'materials' });
Company.hasMany(MaterialMaster, { foreignKey: 'companyId', as: 'materialMasters' });
Company.hasMany(Quote, { foreignKey: 'companyId', as: 'quotes' });
Company.hasMany(Supplier, { foreignKey: 'companyId', as: 'suppliers' });
Company.hasMany(ColouraMaterial, { foreignKey: 'companyId', as: 'colouraMaterials' });

// User relationships
User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
User.hasMany(Material, { foreignKey: 'userId', as: 'materials' });
User.hasMany(Note, { foreignKey: 'userId', as: 'notes' });
User.hasMany(Photo, { foreignKey: 'userId', as: 'photos' });
User.hasMany(Equipment, { foreignKey: 'userId', as: 'equipment' });
User.hasMany(Economia, { foreignKey: 'workerId', as: 'economias' });

// ConstructionSite relationships
ConstructionSite.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
ConstructionSite.hasMany(Attendance, { foreignKey: 'siteId', as: 'attendances' });
ConstructionSite.hasMany(Material, { foreignKey: 'siteId', as: 'materials' });
ConstructionSite.hasMany(Note, { foreignKey: 'siteId', as: 'siteNotes' }); // Changed to avoid collision with 'notes' field
ConstructionSite.hasMany(Photo, { foreignKey: 'siteId', as: 'photos' });
ConstructionSite.hasMany(Equipment, { foreignKey: 'siteId', as: 'equipment' });
ConstructionSite.hasMany(Economia, { foreignKey: 'siteId', as: 'economias' });
ConstructionSite.hasMany(SAL, { foreignKey: 'siteId', as: 'sals' });

// ConstructionSite <-> User many-to-many (assignedWorkers)
ConstructionSite.belongsToMany(User, {
    through: 'site_workers',
    foreignKey: 'siteId',
    otherKey: 'userId',
    as: 'assignedWorkers'
});
User.belongsToMany(ConstructionSite, {
    through: 'site_workers',
    foreignKey: 'userId',
    otherKey: 'siteId',
    as: 'assignedSites'
});

// Attendance relationships
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Attendance.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });

// Material relationships
Material.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Material.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });
Material.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Material.belongsTo(MaterialMaster, { foreignKey: 'materialMasterId', as: 'materialMaster' });

// MaterialMaster relationships
MaterialMaster.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
MaterialMaster.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
MaterialMaster.hasMany(Material, { foreignKey: 'materialMasterId', as: 'materials' });

// Note relationships
Note.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Note.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });
Note.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// Photo relationships
Photo.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Photo.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });

// Equipment relationships
Equipment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Equipment.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });

// Economia relationships
Economia.belongsTo(User, { foreignKey: 'workerId', as: 'worker' });
Economia.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });

// Quote relationships
Quote.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// SAL relationships
SAL.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
SAL.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });

// Supplier relationships
Supplier.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// WorkActivity relationships
WorkActivity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
WorkActivity.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });
WorkActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Document relationships
Document.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Document.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });

// Coloura Material System relationships
ColouraMaterial.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
ColouraMaterial.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
ColouraMaterial.hasMany(MaterialUsage, { foreignKey: 'materialId', as: 'usages' });
ColouraMaterial.hasMany(ReportedMaterial, { foreignKey: 'materialeIdDefinitivo', as: 'reportedMaterials' });

ReportedMaterial.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
ReportedMaterial.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });
ReportedMaterial.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ReportedMaterial.belongsTo(User, { foreignKey: 'approvatoDa', as: 'approver' });
ReportedMaterial.belongsTo(ColouraMaterial, { foreignKey: 'materialeIdDefinitivo', as: 'finalMaterial' });

MaterialUsage.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
MaterialUsage.belongsTo(ConstructionSite, { foreignKey: 'siteId', as: 'site' });
MaterialUsage.belongsTo(User, { foreignKey: 'userId', as: 'user' });
MaterialUsage.belongsTo(ColouraMaterial, { foreignKey: 'materialId', as: 'material' });
MaterialUsage.belongsTo(MaterialMaster, { foreignKey: 'materialId', as: 'materialMaster' });
MaterialUsage.belongsTo(ReportedMaterial, { foreignKey: 'materialeReportId', as: 'reportedMaterial' });


// AuditLog relationships
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
AuditLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

module.exports = {
    User,
    Company,
    ConstructionSite,
    Attendance,
    Material,
    MaterialMaster,
    Note,
    Photo,
    Equipment,
    Economia,
    ReportedMaterial,
    ColouraMaterial,
    MaterialUsage,
    Quote,
    SAL,
    Supplier,
    WorkActivity,
    Document,
    AuditLog
};

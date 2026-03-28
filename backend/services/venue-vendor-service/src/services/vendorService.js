const { Vendor, EventVendor } = require('../models');
const { AppError } = require('../middleware/errorHandler');

const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const normalizeVendorPayload = (vendorData = {}) => ({
  ...vendorData,
  businessName: emptyToUndefined(vendorData.businessName),
  website: emptyToUndefined(vendorData.website)
});

class VendorService {
  /**
   * Create a new vendor
   */
  async createVendor(vendorData, createdBy) {
    try {
      const normalizedVendorData = normalizeVendorPayload(vendorData);
      const vendor = new Vendor({
        vendorName: normalizedVendorData.vendorName,
        businessName: normalizedVendorData.businessName,
        serviceType: normalizedVendorData.serviceType,
        website: normalizedVendorData.website,
        isActive: normalizedVendorData.isActive,
        createdBy
      });

      return await vendor.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        throw new AppError(`Vendor with this ${field} already exists`, 409);
      }
      throw error;
    }
  }

  /**
   * Get all vendors with filtering and pagination
   */
  async getVendors(filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      serviceType,
      search,
      includeInactive
    } = { ...filters, ...pagination };

    // Build query
    const query =
      includeInactive === 'true' || includeInactive === true
        ? {}
        : { isActive: true };

    // Service type filter
    if (serviceType) {
      query.serviceType = serviceType;
    }

    // Text search across the simplified vendor shape.
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { vendorName: searchRegex },
        { businessName: searchRegex },
        { website: searchRegex }
      ];
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Vendor.countDocuments(query)
    ]);

    return {
      vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(vendorId) {
    const vendor = await Vendor.findOne({ vendorId }).lean();

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    return vendor;
  }

  /**
   * Update vendor
   */
  async updateVendor(vendorId, updateData, updatedBy) {
    const vendor = await Vendor.findOne({ vendorId });

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    // Check ownership or admin role
    if (vendor.createdBy !== updatedBy) {
      // This check will be enhanced by the requireOwnershipOrAdmin middleware
    }

    const normalizedUpdateData = normalizeVendorPayload(updateData);
    Object.assign(vendor, normalizedUpdateData);

    return await vendor.save();
  }

  /**
   * Soft delete vendor
   */
  async deleteVendor(vendorId, deletedBy) {
    const vendor = await Vendor.findOne({ vendorId });

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    // Check for active contracts
    const activeContracts = await EventVendor.find({
      vendorId,
      'contract.status': { $in: ['signed', 'active'] },
      'schedule.serviceDate': { $gte: new Date() }
    });

    if (activeContracts.length > 0) {
      throw new AppError('Cannot delete vendor with active contracts', 400);
    }

    await Vendor.deleteOne({ vendorId });
    return { vendorId };
  }

}

module.exports = new VendorService();
